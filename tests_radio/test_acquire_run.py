from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np
import pytest

import radio.acquire.run as run_mod
from radio.acquire.audio import Probe
from radio.acquire.run import acquire_pass, pending
from radio.core.config import AcquisitionConfig
from radio.sources.deezer import DeezerTrack
from tests_radio.model_factory import NOW, make_model_db, serve_scores

CFG = AcquisitionConfig(max_per_pass=4, max_attempts=2)


class FakeDeezer:
    def __init__(self, gone: frozenset[int] = frozenset()) -> None:
        self.gone = gone

    def track(self, tid: int) -> tuple[DeezerTrack, str | None] | None:
        if tid in self.gone:
            return None
        return DeezerTrack(tid, f"T{tid}", f"T{tid}", 200, 1, 1, "Art", True), "https://signed"

    def download_preview(self, url: str) -> bytes:
        return b"preview"


def _sockseek(found: set[int]) -> Any:
    """Faux Sockseek : écrit un fichier pour les ids de `found`, un échec pour les autres."""

    def run(args: Sequence[str]) -> int:
        out = Path(args[args.index("--output-dir") + 1])
        rows = []
        for line in (out / "retenus.csv").read_text().splitlines()[1:]:
            artist, title, length, uri = line.split(",")
            if int(uri) in found:
                (out / f"{uri}.mp3").write_bytes(b"audio")
                rows.append(f"{out}/{uri}.mp3,{artist},,{title},{length},0,1,0")
            else:
                rows.append(f",{artist},,{title},{length},0,2,9")
        (out / "retenus").mkdir()
        (out / "retenus" / "_index.csv").write_text(
            "filepath,artist,album,title,length,tracktype,state,failurereason\n" + "\n".join(rows)
        )
        return 1

    return run


@pytest.fixture
def fake_audio(monkeypatch: pytest.MonkeyPatch) -> dict[int, float]:
    """Score Chromaprint simulé par id Deezer (0,95 par défaut) ; préparation = copie."""
    scores: dict[int, float] = {}

    def fingerprint(p: Path) -> Any:
        return np.array([int(p.stem) if p.stem.isdigit() else 0], dtype=np.uint32)

    def prepare(src: Path, dest: Path, *rest: Any) -> None:
        dest.write_bytes(src.read_bytes())

    monkeypatch.setattr(run_mod, "probe", lambda p: Probe("mp3", 200.0, 320))
    monkeypatch.setattr(run_mod, "fingerprint", fingerprint)
    monkeypatch.setattr(run_mod, "similarity", lambda f, _: scores.get(int(f[0]), 0.95))
    monkeypatch.setattr(run_mod, "prepare", prepare)
    return scores


def _pass(conn: Any, tmp: Path, found: set[int], n: int) -> Any:
    return acquire_pass(
        conn,
        FakeDeezer(),
        tmp / f"work{n}",
        tmp / "antenne",
        (Path("/sockseek"), Path("/rsgain")),
        ("radio", "pw"),
        CFG,
        NOW,
        _sockseek(found),
    )


def test_acquire_prepares_verified_files_and_retries_failures(
    tmp_path: Path, fake_audio: dict[int, float]
) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    first = pending(conn, CFG)
    assert len(first) == 4  # max_per_pass, les mieux notés d'abord
    ok, wrong, missing = first[0], first[1], first[2:]
    fake_audio[wrong] = 0.55  # Chromaprint : un autre morceau

    rep = _pass(conn, tmp_path, {ok, wrong}, 1)
    assert (rep.n_wanted, rep.n_ready) == (4, 1)
    assert dict(rep.failures) == {"identité": 1, "aucun résultat": 2}
    assert (tmp_path / "antenne" / f"{ok}.mp3").exists()
    assert not list((tmp_path / "work1").glob("*.mp3"))  # fichiers bruts effacés

    # Deuxième passe : les échecs sont retentés (1 tentative < 2), le prêt ne l'est plus.
    again = pending(conn, CFG)
    assert ok not in again and wrong in again and set(missing) <= set(again)
    _pass(conn, tmp_path, set(), 2)
    rows = dict(conn.execute("SELECT deezer_track_id, attempts FROM acquisitions").fetchall())
    assert rows[wrong] == 2 and rows[ok] == 1
    assert wrong not in pending(conn, CFG)  # abandonné après max_attempts


def test_a_title_gone_from_deezer_is_counted(tmp_path: Path, fake_audio: dict[int, float]) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    gone = pending(conn, CFG)[0]
    rep = acquire_pass(
        conn,
        FakeDeezer(frozenset({gone})),
        tmp_path / "w",
        tmp_path / "antenne",
        (Path("/s"), Path("/r")),
        ("u", "p"),
        CFG,
        NOW,
        _sockseek(set()),
    )
    assert rep.failures["disparu de Deezer"] == 1
    assert rep.n_wanted == 3
