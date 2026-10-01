"""Contrôle et préparation d'un fichier téléchargé (docs/vision.md §5.3, §6).

Identité : empreintes Chromaprint brutes (`fpcalc -raw`) du fichier et de l'extrait Deezer, part
de bits identiques au meilleur décalage. Méthode et seuil mesurés :
docs/recherches/2026-09-30-acquisition-publication-observabilite.md §2.
"""

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import numpy.typing as npt
from numpy.lib.stride_tricks import sliding_window_view

from radio.core.config import AcquisitionConfig

Fingerprint = npt.NDArray[np.uint32]
# Fondus d'entrée et de sortie de l'extrait Deezer, écartés de la comparaison.
_FADE_FRAMES = 16


class ToolError(Exception):
    """ffprobe, fpcalc, ffmpeg ou rsgain a échoué sur un fichier."""


def _run(args: list[str]) -> str:
    r = subprocess.run(args, capture_output=True, text=True, check=False)
    if r.returncode != 0:
        raise ToolError(f"{Path(args[0]).name} : code {r.returncode}")
    return r.stdout


@dataclass(frozen=True)
class Probe:
    codec: str
    duration_s: float
    kbps: int


def probe(path: Path) -> Probe:
    out = json.loads(
        _run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "a:0",
                "-show_entries",
                "stream=codec_name:format=duration,bit_rate",
                "-of",
                "json",
                str(path),
            ]
        )
    )
    stream = (out.get("streams") or [{}])[0]
    fmt = out.get("format", {})
    return Probe(
        codec=str(stream.get("codec_name", "")),
        duration_s=float(fmt.get("duration", 0.0)),
        kbps=int(fmt.get("bit_rate", 0)) // 1000,
    )


def check(p: Probe, expected_s: int, cfg: AcquisitionConfig) -> str | None:
    """Raison du refus, ou None."""
    if p.codec not in ("mp3", "flac"):
        return f"format {p.codec or 'inconnu'}"
    if abs(p.duration_s - expected_s) > 3:
        return "durée"
    if p.codec == "mp3" and p.kbps < cfg.min_mp3_kbps:
        return "débit"
    return None


def fingerprint(path: Path) -> Fingerprint:
    out = json.loads(_run(["fpcalc", "-raw", "-json", "-length", "0", str(path)]))
    return np.array(out["fingerprint"], dtype=np.int64).astype(np.uint32)


def similarity(file_fp: Fingerprint, preview_fp: Fingerprint) -> float:
    """Meilleure part de bits identiques, sur les décalages où l'extrait tient dans le fichier."""
    core = preview_fp[_FADE_FRAMES:-_FADE_FRAMES]
    if len(core) == 0 or len(file_fp) < len(core):
        return 0.0
    windows = sliding_window_view(file_fp, len(core))
    errors = np.bitwise_count(windows ^ core).sum(axis=1)
    return float(1 - errors.min() / (32 * len(core)))


@dataclass(frozen=True)
class Tags:
    artist: str
    title: str
    deezer_id: int
    album: str
    cover: bytes | None


def prepare(src: Path, dest: Path, codec: str, tags: Tags, rsgain: Path) -> None:
    """Tout sauf le MP3 passe en MP3 V0 ; un MP3 n'est jamais réencodé. Balises remplacées,
    pochette intégrée (ffmpeg-formats, muxer mp3), ReplayGain posé."""
    audio = (
        ["-af", "aresample=resampler=soxr:osr=44100", "-c:a", "libmp3lame", "-q:a", "0"]
        if codec != "mp3"
        else ["-c:a", "copy"]
    )
    tmp = dest.with_name(f".{dest.name}")
    cover = dest.with_name(f".{dest.stem}.jpg")
    inputs, maps = ["-i", str(src)], ["-map", "0:a:0"]
    if tags.cover is not None:
        cover.write_bytes(tags.cover)
        inputs += ["-i", str(cover)]
        maps += [
            "-map",
            "1:0",
            "-c:v",
            "copy",
            "-metadata:s:v",
            "title=Album cover",
            "-metadata:s:v",
            "comment=Cover (front)",
        ]
    try:
        _run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                *inputs,
                *maps,
                *audio,
                "-map_metadata",
                "-1",
                "-id3v2_version",
                "3",
                "-metadata",
                f"artist={tags.artist}",
                "-metadata",
                f"title={tags.title}",
                "-metadata",
                f"album={tags.album}",
                "-metadata",
                f"comment=deezer:{tags.deezer_id}",
                "-f",
                "mp3",
                str(tmp),
            ]
        )
    finally:
        cover.unlink(missing_ok=True)
    _run([str(rsgain), "custom", "-s", "i", "-c", "p", str(tmp)])
    tmp.replace(dest)
