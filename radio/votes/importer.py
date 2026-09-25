"""Reprise des votes du banc d'écoute du 2026-09-24 (spec §6.1), par un import JSON unique.

Série 1 (60 titres) → examen ; série 2 (257 titres) → leçon. Le banc écrit un document par titre
voté, nommé par l'id Deezer : {"vote": "oui" | "non" | "passe", "at": "<ISO 8601>"}.
"""

import json
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from radio.discover.candidates import add_tracks
from radio.library.dedupe import dedupe_key
from radio.sources.deezer import DeezerError, DeezerTrack

_VOTES = {"oui": "oui", "non": "non", "passe": "passer"}
_KINDS = {"s1": "exam", "s2": "lesson"}


class TrackSource(Protocol):
    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None: ...


@dataclass(frozen=True)
class BenchVote:
    deezer_track_id: int
    label: str  # « artiste - titre » du banc, pour nommer un vote sauté
    kind: str
    vote: str
    voted_at: str


@dataclass(frozen=True)
class ImportReport:
    n_votes: int
    n_recorded: int
    n_added: int
    n_mapped: int
    not_found: list[str]
    skipped: list[str]


def load_bench(votes_dir: Path, series_path: Path) -> list[BenchVote]:
    series = json.loads(series_path.read_text(encoding="utf-8"))
    where: dict[str, tuple[str, str]] = {}
    for name, kind in _KINDS.items():
        for t in series[name]:
            where[str(t["id"])] = (kind, f"{t['artist']} - {t['title']}")
    out = []
    for path in sorted(votes_dir.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if path.stem not in where:
            raise ValueError(f"vote hors des séries du banc : {path.stem}")
        if doc.get("vote") not in _VOTES:
            raise ValueError(f"vote inconnu pour {path.stem} : {doc.get('vote')!r}")
        kind, label = where[path.stem]
        out.append(
            BenchVote(int(path.stem), label, kind, _VOTES[doc["vote"]], _normalize(doc, path))
        )
    return out


def _normalize(doc: dict[str, object], path: Path) -> str:
    """Ramène une date du banc (JS : `...Z`, parfois sans secondes) au format des votes de la
    page (`datetime.now(UTC).isoformat()`), pour que `voted_at` se compare comme une chaîne."""
    try:
        at = datetime.fromisoformat(str(doc["at"]))
    except ValueError as e:
        raise ValueError(f"date illisible pour {path.stem} : {doc['at']!r}") from e
    if at.tzinfo is None:
        raise ValueError(f"date sans fuseau pour {path.stem} : {doc['at']!r}")
    return at.astimezone(UTC).isoformat()


def _known(conn: sqlite3.Connection, track_id: int) -> bool:
    row = conn.execute("SELECT 1 FROM tracks WHERE deezer_track_id = ?", (track_id,)).fetchone()
    return row is not None


def _by_key(conn: sqlite3.Connection, key: str) -> int | None:
    row = conn.execute(
        "SELECT deezer_track_id FROM tracks WHERE dedupe_key = ? ORDER BY deezer_track_id LIMIT 1",
        (key,),
    ).fetchone()
    return None if row is None else int(row[0])


def import_votes(
    conn: sqlite3.Connection, deezer: TrackSource, votes: list[BenchVote], source: str, now: str
) -> ImportReport:
    added = mapped = 0
    not_found: list[str] = []
    skipped: list[str] = []
    done: dict[int, str] = {}
    for v in votes:
        target: int | None = v.deezer_track_id
        if not _known(conn, v.deezer_track_id):
            try:
                found = deezer.track(v.deezer_track_id)
            except DeezerError as e:
                skipped.append(f"{v.label} ({e})")
                continue
            if found is None:
                not_found.append(v.label)
                continue
            t = found[0]  # l'URL d'extrait signée (found[1]) n'est jamais gardée
            target = _by_key(conn, dedupe_key(t.artist_name, t.title))
            if target is not None:
                mapped += 1
            else:
                with conn:
                    add_tracks(conn, t.artist_id, t.artist_name, [t], "candidate", now)
                target = t.id
                added += 1
        assert target is not None
        if target in done:
            skipped.append(f"{v.label} (même titre que {done[target]})")
            continue
        done[target] = v.label
        with conn:
            conn.execute(
                """
                INSERT INTO votes (deezer_track_id, kind, vote, voted_at, source)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (deezer_track_id) DO UPDATE SET kind = excluded.kind,
                    vote = excluded.vote, voted_at = excluded.voted_at, source = excluded.source
                """,
                (target, v.kind, v.vote, v.voted_at, source),
            )
    return ImportReport(len(votes), len(done), added, mapped, not_found, skipped)


def vote_counts(conn: sqlite3.Connection) -> dict[str, dict[str, int]]:
    out: defaultdict[str, Counter[str]] = defaultdict(Counter)
    for r in conn.execute("SELECT kind, vote, COUNT(*) FROM votes GROUP BY kind, vote"):
        out[r[0]][r[1]] = r[2]
    return {k: dict(sorted(c.items())) for k, c in sorted(out.items())}
