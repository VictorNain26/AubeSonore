"""Téléchargement Soulseek par Sockseek 3.0.5 (docs/vision.md §5).

Sockseek fait la recherche, le classement, le téléchargement et la limite de rythme ; ici, on ne
fait que lui passer la liste et lire son index. Les fichiers sont nommés par l'id Deezer
(`--name-format {uri}`, colonne URI du CSV). Codes d'état et d'échec de l'index :
`Sockseek.Core/Common/Enums.cs` (JobStateOld, JobFailureReason) au tag v3.0.5.
"""

import csv
import os
import subprocess
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

from radio.core.config import AcquisitionConfig

_DONE, _ALREADY = 1, 3
_REASONS = {
    1: "recherche invalide",
    2: "essais de téléchargement épuisés",
    4: "téléchargements échoués",
    5: "autre",
    6: "extraction échouée",
    7: "annulé",
    9: "aucun résultat",
    10: "aucun fichier conforme",
}


@dataclass(frozen=True)
class Wanted:
    deezer_track_id: int
    artist: str
    title: str
    duration_s: int


@dataclass(frozen=True)
class Outcome:
    deezer_track_id: int
    file: Path | None
    reason: str | None  # None si `file` est présent


Runner = Callable[[Sequence[str]], int]


def run_command(args: Sequence[str]) -> int:
    return subprocess.run(args, check=False).returncode


def _write_config(path: Path, user: str, password: str) -> None:
    # Le mot de passe n'apparaît jamais dans la ligne de commande (visible par `ps`).
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(f"username = {user}\npassword = {password}\n")


def download(
    wanted: list[Wanted],
    workdir: Path,
    binary: Path,
    user: str,
    password: str,
    cfg: AcquisitionConfig,
    run: Runner = run_command,
) -> list[Outcome]:
    workdir.mkdir(parents=True, exist_ok=True)
    listing = workdir / "retenus.csv"
    with listing.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Artist", "Title", "Length", "URI"])
        w.writerows([t.artist, t.title, t.duration_s, t.deezer_track_id] for t in wanted)
    conf = workdir / "sockseek.conf"
    _write_config(conf, user, password)
    try:
        run(
            [
                str(binary),
                str(listing),
                "--config",
                str(conf),
                "--output-dir",
                str(workdir),
                "--name-format",
                "{uri}",
                "--format",
                "mp3,flac",
                "--pref-format",
                "mp3",
                "--length-tol",
                "3",
                "--concurrent-searches",
                "1",
                "--searches-per-time",
                str(cfg.searches_per_time),
                "--searches-renew-time",
                str(cfg.searches_renew_s),
            ]
        )
    finally:
        conf.unlink()
    return read_index(workdir / "retenus" / "_index.csv", wanted)


def read_index(index: Path, wanted: list[Wanted]) -> list[Outcome]:
    """Une issue par titre demandé. Un titre absent de l'index (Sockseek interrompu) est un échec
    nommé, jamais un succès supposé."""
    by_key = {(t.artist, t.title, t.duration_s): t.deezer_track_id for t in wanted}
    found: dict[int, Outcome] = {}
    if index.exists():
        with index.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                tid = by_key.get((row["artist"], row["title"], int(row["length"])))
                if tid is None:
                    continue
                state = int(row["state"])
                if state in (_DONE, _ALREADY) and row["filepath"]:
                    found[tid] = Outcome(tid, Path(row["filepath"]), None)
                else:
                    reason = _REASONS.get(int(row["failurereason"]), f"état {state}")
                    found[tid] = Outcome(tid, None, reason)
    return [
        found.get(t.deezer_track_id, Outcome(t.deezer_track_id, None, "absent de l'index"))
        for t in wanted
    ]
