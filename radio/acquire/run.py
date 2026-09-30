"""Passe d'acquisition (docs/vision.md §5, §6) : retenus → Sockseek → contrôle → fichier prêt.

Chaque issue est écrite dès qu'elle est connue : une panne de Deezer arrête la passe sans perdre
le travail fait. Un titre en échec est retenté aux passes suivantes, jusqu'à `max_attempts`.
"""

import logging
import sqlite3
import tempfile
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from radio.acquire.audio import ToolError, check, fingerprint, prepare, probe, similarity
from radio.acquire.sockseek import Runner, Wanted, download, run_command
from radio.core.config import AcquisitionConfig
from radio.sources.deezer import DeezerClient, DeezerError

logger = logging.getLogger(__name__)


@dataclass
class AcquireReport:
    n_wanted: int = 0
    n_ready: int = 0
    failures: Counter[str] = field(default_factory=Counter)

    @property
    def n_attempted(self) -> int:
        return self.n_ready + sum(self.failures.values())


def pending(conn: sqlite3.Connection, cfg: AcquisitionConfig) -> list[int]:
    """Retenus pas encore prêts ni abandonnés, les mieux notés d'abord."""
    return [
        int(r[0])
        for r in conn.execute(
            """
            SELECT s.deezer_track_id FROM scores s
            LEFT JOIN acquisitions a USING (deezer_track_id)
            WHERE s.accepted = 1
              AND (a.deezer_track_id IS NULL OR (a.status = 'failed' AND a.attempts < ?))
            ORDER BY s.score DESC, s.deezer_track_id LIMIT ?
            """,
            (cfg.max_attempts, cfg.max_per_pass),
        )
    ]


def _save(
    conn: sqlite3.Connection, tid: int, file: Path | None, reason: str | None, now: str
) -> None:
    with conn:
        conn.execute(
            """
            INSERT INTO acquisitions VALUES (?, ?, ?, 1, ?, ?)
            ON CONFLICT (deezer_track_id) DO UPDATE SET status = excluded.status,
                reason = excluded.reason, attempts = attempts + 1, file = excluded.file,
                attempted_at = excluded.attempted_at
            """,
            (tid, "ready" if file else "failed", reason, str(file) if file else None, now),
        )


def _verify_and_prepare(
    file: Path,
    want: Wanted,
    deezer: DeezerClient,
    ready_dir: Path,
    rsgain: Path,
    cfg: AcquisitionConfig,
) -> tuple[Path | None, str | None]:
    p = probe(file)
    refusal = check(p, want.duration_s, cfg)
    if refusal is not None:
        return None, refusal
    fresh = deezer.track(want.deezer_track_id)
    if fresh is None or fresh[1] is None:
        return None, "extrait Deezer indisponible"
    with tempfile.NamedTemporaryFile(suffix=".mp3") as preview:
        preview.write(deezer.download_preview(fresh[1]))
        preview.flush()
        score = similarity(fingerprint(file), fingerprint(Path(preview.name)))
    if score < cfg.identity_threshold:
        return None, "identité"
    dest = ready_dir / f"{want.deezer_track_id}.mp3"
    prepare(file, dest, p.codec, want.artist, want.title, want.deezer_track_id, rsgain)
    return dest, None


def acquire_pass(
    conn: sqlite3.Connection,
    deezer: DeezerClient,
    workdir: Path,
    ready_dir: Path,
    binaries: tuple[Path, Path],
    credentials: tuple[str, str],
    cfg: AcquisitionConfig,
    now: str,
    run: Runner = run_command,
) -> AcquireReport:
    sockseek, rsgain = binaries
    rep = AcquireReport()
    wanted: list[Wanted] = []
    for tid in pending(conn, cfg):
        got = deezer.track(tid)
        if got is None:
            rep.failures["disparu de Deezer"] += 1
            _save(conn, tid, None, "disparu de Deezer", now)
            continue
        t = got[0]
        wanted.append(Wanted(tid, t.artist_name, t.title_short, t.duration_s))
    rep.n_wanted = len(wanted)
    if not wanted:
        return rep
    ready_dir.mkdir(parents=True, exist_ok=True)
    by_id = {w.deezer_track_id: w for w in wanted}
    for out in download(wanted, workdir, sockseek, *credentials, cfg, run):
        file, reason = None, out.reason
        if out.file is not None:
            try:
                file, reason = _verify_and_prepare(
                    out.file, by_id[out.deezer_track_id], deezer, ready_dir, rsgain, cfg
                )
            except (ToolError, DeezerError) as e:
                reason = f"{type(e).__name__} : {e}"
            finally:
                out.file.unlink(missing_ok=True)
        _save(conn, out.deezer_track_id, file, reason, now)
        if file is not None:
            rep.n_ready += 1
        else:
            rep.failures[str(reason)] += 1
    return rep
