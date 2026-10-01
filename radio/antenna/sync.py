"""Bibliothèque d'antenne (docs/vision.md §7) : ce que le pipeline publie dans `antenne/`.

AzuraCast fait autorité : un titre de la base absent d'AzuraCast est oublié et compté ; un
fichier d'`antenne/` inconnu du pipeline est compté, jamais supprimé. Une découverte n'est publiée
qu'une fois : sortie de l'antenne, elle n'y revient pas. Un titre voté « non » en sort.
"""

import math
import sqlite3
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path, PurePosixPath
from typing import Protocol

import numpy as np

from radio.acquire.audio import ToolError, prepare, probe
from radio.acquire.run import tags_for
from radio.core.config import AntenneConfig
from radio.library.weights import play_weight
from radio.sources.azuracast import AzuracastError, Media
from radio.sources.deezer import DeezerClient, DeezerError

FOLDER = "antenne"


class Station(Protocol):
    def files(self) -> list[Media]: ...

    def upload(self, path: str, data: bytes) -> Media: ...

    def delete(self, paths: list[str]) -> list[str]: ...

    def busy_song_ids(self) -> set[str]: ...


@dataclass
class AntenneReport:
    n_forgotten: int = 0
    n_unknown: int = 0
    n_voted_out: int = 0
    n_published: int = 0
    n_references: int = 0
    n_references_no_cover: int = 0
    n_removed: int = 0
    n_total: int = 0
    skipped_references: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _insert(conn: sqlite3.Connection, tid: int, origin: str, m: Media, now: str) -> None:
    with conn:
        conn.execute(
            "INSERT INTO antenne VALUES (?, ?, ?, ?, ?, ?)",
            (tid, origin, m.id, m.song_id, m.path, now),
        )
        if origin == "decouverte":
            conn.execute(
                "UPDATE acquisitions SET status = 'published', file = NULL "
                "WHERE deezer_track_id = ?",
                (tid,),
            )


def reconcile(conn: sqlite3.Connection, media: list[Media], rep: AntenneReport) -> None:
    ours = {m.path for m in media if m.path.startswith(f"{FOLDER}/")}
    known = {str(r[0]) for r in conn.execute("SELECT path FROM antenne")}
    gone = known - ours
    with conn:
        conn.executemany("DELETE FROM antenne WHERE path = ?", [(p,) for p in gone])
    rep.n_forgotten = len(gone)
    rep.n_unknown = len(ours - known)


def _upload(
    conn: sqlite3.Connection,
    station: Station,
    tid: int,
    origin: str,
    file: Path,
    now: str,
    rep: AntenneReport,
) -> bool:
    try:
        m = station.upload(f"{FOLDER}/{tid}.mp3", file.read_bytes())
    except AzuracastError as e:
        rep.errors.append(f"dépôt {tid} : {e}")
        return False
    _insert(conn, tid, origin, m, now)
    return True


def _remove(
    conn: sqlite3.Connection, station: Station, paths: list[str], rep: AntenneReport
) -> int:
    """Supprime de l'antenne ; renvoie le nombre de retraits réussis."""
    if not paths:
        return 0
    errors = station.delete(paths)
    rep.errors += [f"retrait : {e}" for e in errors]
    done = [p for p in paths if not any(e.startswith(f"{p}:") for e in errors)]
    with conn:
        conn.executemany("DELETE FROM antenne WHERE path = ?", [(p,) for p in done])
    return len(done)


def withdraw_rejected(conn: sqlite3.Connection, station: Station, rep: AntenneReport) -> None:
    """Un titre voté « non » sort de l'antenne (repères compris), sauf s'il est en cours ou en
    file : il sortira à la passe suivante. Un fichier prêt voté « non » n'est jamais publié."""
    rows = conn.execute(
        """
        SELECT n.path, n.song_id FROM antenne n JOIN votes v USING (deezer_track_id)
        WHERE v.vote = 'non' ORDER BY n.deezer_track_id
        """
    ).fetchall()
    if rows:
        busy = station.busy_song_ids()
        rep.n_voted_out += _remove(conn, station, [str(p) for p, s in rows if s not in busy], rep)
    ready = conn.execute(
        """
        SELECT a.deezer_track_id, a.file FROM acquisitions a JOIN votes v USING (deezer_track_id)
        WHERE a.status = 'ready' AND v.vote = 'non'
        """
    ).fetchall()
    for tid, file in ready:
        with conn:
            conn.execute(
                "UPDATE acquisitions SET status = 'failed', reason = 'voté non', file = NULL "
                "WHERE deezer_track_id = ?",
                (tid,),
            )
        Path(file).unlink(missing_ok=True)
        rep.n_voted_out += 1


def publish_ready(conn: sqlite3.Connection, station: Station, now: str, rep: AntenneReport) -> None:
    rows = conn.execute(
        """
        SELECT a.deezer_track_id, a.file FROM acquisitions a
        LEFT JOIN antenne n USING (deezer_track_id)
        WHERE a.status = 'ready' AND n.deezer_track_id IS NULL ORDER BY a.deezer_track_id
        """
    ).fetchall()
    for tid, file in rows:
        path = Path(file)
        if not path.exists():
            rep.errors.append(f"fichier prêt introuvable : {tid}")
            continue
        if _upload(conn, station, int(tid), "decouverte", path, now, rep):
            path.unlink()
            rep.n_published += 1


def _under(root: PurePosixPath, file: str) -> bool:
    p = PurePosixPath(file)
    return p.is_absolute() and ".." not in p.parts and p.is_relative_to(root)


def add_references(
    conn: sqlite3.Connection,
    station: Station,
    deezer: DeezerClient,
    cfg: AntenneConfig,
    root: PurePosixPath,
    rsgain: Path,
    rng: np.random.Generator,
    now: str,
    rep: AntenneReport,
) -> None:
    """Complète les repères jusqu'à `reference_share` de l'antenne, tirés selon l'écoute. Le
    fichier Plex n'est que lu ; la copie préparée est déposée puis effacée."""
    n = dict(conn.execute("SELECT origin, COUNT(*) FROM antenne GROUP BY origin").fetchall())
    allowed = math.floor(cfg.reference_share / (1 - cfg.reference_share) * n.get("decouverte", 0))
    need = allowed - n.get("repere", 0)
    if need <= 0:
        return
    pool = [
        r
        for r in conn.execute(
            """
            SELECT m.deezer_track_id, t.artist, t.title, t.file, SUM(t.plays)
            FROM deezer_matches m JOIN library_tracks t USING (plex_key)
            LEFT JOIN antenne n ON n.deezer_track_id = m.deezer_track_id
            WHERE m.status = 'matched' AND t.file IS NOT NULL AND n.deezer_track_id IS NULL
              AND m.deezer_track_id NOT IN (SELECT deezer_track_id FROM votes WHERE vote = 'non')
            GROUP BY m.deezer_track_id ORDER BY m.deezer_track_id
            """
        )
        if _under(root, str(r[3]))
    ]
    if not pool:
        return
    w = np.array([play_weight(int(r[4])) for r in pool])
    picked = rng.choice(len(pool), size=min(need, len(pool)), replace=False, p=w / w.sum())
    with tempfile.TemporaryDirectory() as tmp:
        for i in picked:
            tid, artist, title, file = int(pool[i][0]), str(pool[i][1]), str(pool[i][2]), pool[i][3]
            dest = Path(tmp) / f"{tid}.mp3"
            try:
                page = deezer.track_page(tid)
                if page is None:
                    rep.skipped_references.append(f"repère {tid} : disparu de Deezer")
                    continue
                p = probe(Path(file))
                tags = tags_for(deezer, tid, artist, title, page.album)
                prepare(Path(file), dest, p.codec, tags, rsgain)
            except (ToolError, DeezerError) as e:
                rep.skipped_references.append(f"repère {tid} : {e}")
                continue
            if _upload(conn, station, tid, "repere", dest, now, rep):
                rep.n_references += 1
                if tags.cover is None:
                    rep.n_references_no_cover += 1


def remove_excess(
    conn: sqlite3.Connection,
    station: Station,
    cfg: AntenneConfig,
    now: datetime,
    rep: AntenneReport,
) -> None:
    """Au-delà de `target_max`, retire les découvertes les moins bien notées de plus de
    `min_age_days` jours ; jamais un titre en cours ou en file d'attente."""
    total = conn.execute("SELECT COUNT(*) FROM antenne").fetchone()[0]
    excess = min(total - cfg.target_max, cfg.max_removals_per_pass)
    if excess <= 0:
        return
    busy = station.busy_song_ids()
    before = (now - timedelta(days=cfg.min_age_days)).isoformat()
    rows = [
        (str(r[0]), str(r[1]))
        for r in conn.execute(
            """
            SELECT n.path, n.song_id FROM antenne n
            JOIN tracks t USING (deezer_track_id)
            LEFT JOIN scores s USING (deezer_track_id)
            WHERE n.origin = 'decouverte' AND n.published_at < ?
            ORDER BY t.origin = 'library', COALESCE(s.score, 0), n.deezer_track_id
            """,
            (before,),
        )
    ]
    worst = [p for p, song in rows if song not in busy][:excess]
    rep.n_removed = _remove(conn, station, worst, rep)


def antenne_pass(
    conn: sqlite3.Connection,
    station: Station,
    deezer: DeezerClient,
    cfg: AntenneConfig,
    root: PurePosixPath,
    rsgain: Path,
    rng: np.random.Generator,
    now: datetime,
) -> AntenneReport:
    rep = AntenneReport()
    stamp = now.isoformat()
    reconcile(conn, station.files(), rep)
    withdraw_rejected(conn, station, rep)
    publish_ready(conn, station, stamp, rep)
    add_references(conn, station, deezer, cfg, root, rsgain, rng, stamp, rep)
    remove_excess(conn, station, cfg, now, rep)
    rep.n_total = conn.execute("SELECT COUNT(*) FROM antenne").fetchone()[0]
    return rep
