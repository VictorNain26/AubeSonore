"""Rapprochement strict bibliothèque → Deezer : jamais deviné, toujours compté."""

import logging
import re
import sqlite3
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from radio.sources.deezer import DeezerClient, DeezerError, DeezerTrack

logger = logging.getLogger(__name__)

_BRACKETS = re.compile(r"\([^)]*\)|\[[^\]]*\]")
_DASH_SUFFIX = re.compile(r"\s+-\s.*$")
_FEAT = re.compile(r"\s(?:feat\.?|ft\.?|featuring)\s.*$")
_PUNCT = re.compile(r"[^\w\s]|_")
_SPACES = re.compile(r"\s+")


def _base(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.casefold().replace("&", " and ")


def _finish(s: str) -> str:
    s = _SPACES.sub(" ", _PUNCT.sub(" ", s)).strip()
    return s[4:] if s.startswith("the ") else s


def normalize(s: str) -> str:
    base = _base(s)
    stripped = _FEAT.sub(" ", _DASH_SUFFIX.sub(" ", _BRACKETS.sub(" ", base)))
    return _finish(stripped) or _finish(base)


def search_query(artist: str, title: str) -> str:
    clean_title = _DASH_SUFFIX.sub("", _BRACKETS.sub(" ", title))
    a = _SPACES.sub(" ", artist.replace('"', "")).strip()
    t = _SPACES.sub(" ", clean_title.replace('"', "")).strip()
    return f'artist:"{a}" track:"{t}"'


def pick_match(
    artist: str, title: str, duration_ms: int, results: list[DeezerTrack], tolerance_s: int
) -> DeezerTrack | None:
    na, nt = normalize(artist), normalize(title)
    ok = [
        r
        for r in results
        if normalize(r.artist_name) == na
        and nt in (normalize(r.title_short), normalize(r.title))
        and abs(r.duration_s * 1000 - duration_ms) <= tolerance_s * 1000
    ]
    if not ok:
        return None
    return min(
        ok, key=lambda r: (not r.has_preview, abs(r.duration_s * 1000 - duration_ms), -r.rank)
    )


@dataclass(frozen=True)
class MatchReport:
    n_todo: int
    n_matched: int
    unmatched: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def match_library(
    conn: sqlite3.Connection, deezer: DeezerClient, tolerance_s: int, now: str, batch: int = 50
) -> MatchReport:
    todo = conn.execute(
        """
        SELECT t.plex_key, t.artist, t.title, t.duration_ms
        FROM library_tracks t LEFT JOIN deezer_matches m USING (plex_key)
        WHERE m.plex_key IS NULL ORDER BY t.plex_key
        """
    ).fetchall()
    matched = 0
    unmatched: Counter[str] = Counter()
    errors: list[str] = []
    rows: list[tuple[object, ...]] = []

    def flush() -> None:
        with conn:
            conn.executemany("INSERT INTO deezer_matches VALUES (?, ?, ?, ?, ?, ?)", rows)
        rows.clear()

    try:
        for i, r in enumerate(todo, 1):
            key, artist, title, dur = r["plex_key"], r["artist"], r["title"], r["duration_ms"]
            if dur is None:
                rows.append((key, "unmatched", "no_duration", None, None, now))
                unmatched["no_duration"] += 1
            else:
                try:
                    results = deezer.search_tracks(search_query(artist, title))
                except DeezerError as e:
                    errors.append(f"{artist} — {title} ({type(e).__name__})")
                    continue
                best = pick_match(artist, title, dur, results, tolerance_s)
                if best is not None:
                    rows.append((key, "matched", None, best.id, best.artist_id, now))
                    matched += 1
                else:
                    reason = "no_exact_match" if results else "no_result"
                    rows.append((key, "unmatched", reason, None, None, now))
                    unmatched[reason] += 1
            if len(rows) >= batch:
                flush()
            if i % 100 == 0:
                logger.info("match: %d/%d tracks processed", i, len(todo))
    finally:
        flush()
    return MatchReport(len(todo), matched, dict(unmatched), errors)


def coverage(conn: sqlite3.Connection) -> tuple[int, int]:
    matched = conn.execute(
        "SELECT COUNT(*) FROM deezer_matches WHERE status = 'matched'"
    ).fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM library_tracks").fetchone()[0]
    return int(matched), int(total)
