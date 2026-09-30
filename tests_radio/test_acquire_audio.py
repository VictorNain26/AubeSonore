import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
import pytest

from radio.acquire.audio import Probe, check, fingerprint, prepare, probe, similarity
from radio.core.config import AcquisitionConfig

CFG = AcquisitionConfig()
TOOLS = all(shutil.which(t) for t in ("ffmpeg", "ffprobe", "fpcalc", "rsgain"))


def test_similarity_finds_the_excerpt_at_its_offset() -> None:
    rng = np.random.default_rng(0)
    full = rng.integers(0, 2**32, size=400, dtype=np.uint64).astype(np.uint32)
    excerpt = full[100:160].copy()
    assert similarity(full, excerpt) == 1.0
    other = rng.integers(0, 2**32, size=60, dtype=np.uint64).astype(np.uint32)
    assert 0.4 < similarity(full, other) < 0.6
    assert similarity(full[:20], excerpt) == 0.0  # l'extrait ne tient pas dans le fichier


def test_check_reasons() -> None:
    assert check(Probe("mp3", 200.0, 320), 201, CFG) is None
    assert check(Probe("flac", 200.0, 900), 203, CFG) is None
    assert check(Probe("mp3", 200.0, 320), 204, CFG) == "durée"
    assert check(Probe("mp3", 200.0, 128), 200, CFG) == "débit"
    assert check(Probe("aac", 200.0, 256), 200, CFG) == "format aac"


def _melody(path: Path, seed: int) -> None:
    """Une note tirée au hasard par quart de seconde : Chromaprint lit les hauteurs de notes, un
    bruit stationnaire donnerait des empreintes presque identiques d'un tirage à l'autre."""
    note = f"floor(12*(sin(floor(t*4)*{seed}7.13)*0.5+0.5))"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"aevalsrc=sin(2*PI*t*220*pow(2\\,{note}/12)):s=44100:d=60",
            "-ac",
            "2",
            str(path),
        ],
        check=True,
    )


@pytest.mark.skipif(not TOOLS, reason="ffmpeg, fpcalc et rsgain requis")
def test_real_tools_identity_and_preparation(tmp_path: Path) -> None:
    full, other = tmp_path / "full.flac", tmp_path / "other.flac"
    _melody(full, 1)
    _melody(other, 2)
    excerpt = tmp_path / "excerpt.mp3"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", "20", "-t", "30", "-i", str(full), str(excerpt)],
        check=True,
    )
    preview = fingerprint(excerpt)
    assert similarity(fingerprint(full), preview) >= CFG.identity_threshold
    assert similarity(fingerprint(other), preview) < CFG.identity_threshold

    p = probe(full)
    assert (p.codec, round(p.duration_s)) == ("flac", 60)
    dest = tmp_path / "123.mp3"
    prepare(full, dest, p.codec, "Artiste", "Titre", 123, Path(str(shutil.which("rsgain"))))
    tags = json.loads(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format_tags", "-of", "json", str(dest)],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    )["format"]["tags"]
    assert probe(dest).codec == "mp3"
    assert (tags["artist"], tags["title"], tags["comment"]) == ("Artiste", "Titre", "deezer:123")
    assert "REPLAYGAIN_TRACK_GAIN" in {k.upper() for k in tags}
    assert not (tmp_path / ".123.mp3").exists()
