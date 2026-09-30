import os
import stat
from collections.abc import Sequence
from pathlib import Path

import pytest

from radio.acquire.sockseek import Wanted, download, read_index
from radio.core.config import AcquisitionConfig

WANTED = [
    Wanted(111, "A Certain Ratio", "Crystal", 173),
    Wanted(222, "Adrianne Lenker", "anything", 201),
    Wanted(333, "Nobody Here", "Missing Song", 200),
]


def _index(workdir: Path, rows: list[str]) -> None:
    # Format réel de Sockseek 3.0.5, relevé sur une exécution en --mock-files-dir.
    (workdir / "retenus").mkdir()
    (workdir / "retenus" / "_index.csv").write_text(
        "filepath,artist,album,title,length,tracktype,state,failurereason\n"
        + "".join(r + "\n" for r in rows)
    )


def test_download_passes_the_list_and_reads_the_index(tmp_path: Path) -> None:
    seen: dict[str, object] = {}

    def fake(args: Sequence[str]) -> int:
        seen["args"] = list(args)
        conf = Path(args[args.index("--config") + 1])
        seen["conf_mode"] = stat.S_IMODE(os.stat(conf).st_mode)
        seen["conf"] = conf.read_text()
        seen["csv"] = (tmp_path / "retenus.csv").read_text()
        (tmp_path / "111.mp3").write_bytes(b"x")
        _index(
            tmp_path,
            [
                f"{tmp_path}/111.mp3,A Certain Ratio,,Crystal,173,0,1,0",
                ",Adrianne Lenker,,anything,201,0,2,10",
            ],
        )
        return 1  # Sockseek sort en 1 dès qu'un titre échoue

    out = download(
        WANTED, tmp_path, Path("/bin/sockseek"), "radio", "s3cret", AcquisitionConfig(), fake
    )

    assert [(o.deezer_track_id, o.file, o.reason) for o in out] == [
        (111, tmp_path / "111.mp3", None),
        (222, None, "aucun fichier conforme"),
        (333, None, "absent de l'index"),
    ]
    assert seen["csv"] == (
        "Artist,Title,Length,URI\nA Certain Ratio,Crystal,173,111\n"
        "Adrianne Lenker,anything,201,222\nNobody Here,Missing Song,200,333\n"
    )
    assert seen["conf"] == "username = radio\npassword = s3cret\n"
    assert seen["conf_mode"] == 0o600
    assert not (tmp_path / "sockseek.conf").exists()
    args = seen["args"]
    assert isinstance(args, list) and "s3cret" not in " ".join(args)
    assert args[args.index("--name-format") + 1] == "{uri}"


def test_config_is_removed_even_if_sockseek_crashes(tmp_path: Path) -> None:
    def boom(args: Sequence[str]) -> int:
        raise OSError("exec")

    with pytest.raises(OSError):
        download(WANTED, tmp_path, Path("/x"), "u", "p", AcquisitionConfig(), boom)
    assert not (tmp_path / "sockseek.conf").exists()


def test_no_index_means_every_title_failed(tmp_path: Path) -> None:
    out = read_index(tmp_path / "absent.csv", WANTED[:1])
    assert [(o.file, o.reason) for o in out] == [(None, "absent de l'index")]


def test_unknown_failure_code_is_named(tmp_path: Path) -> None:
    _index(tmp_path, [",A Certain Ratio,,Crystal,173,0,2,42"])
    out = read_index(tmp_path / "retenus" / "_index.csv", WANTED[:1])
    assert out[0].reason == "état 2"
