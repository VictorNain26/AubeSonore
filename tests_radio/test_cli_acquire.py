import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.acquire.run import AcquireReport
from radio.acquire.sockseek import SockseekError
from radio.core.config import Settings

runner = CliRunner()


def _env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, editorial: str = "") -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text(editorial)
    settings = Settings(
        _env_file=None,
        soulseek_user="radio",
        soulseek_password="pw",
        RUNTIME_DIRECTORY=tmp_path,
        RADIO_DATA_DIR=tmp_path / "data",
        RADIO_CONFIG_DIR=cfg,
    )
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    return tmp_path / "data" / "radio.db"


def _stage(db: Path) -> tuple[int, str] | None:
    row = sqlite3.connect(db).execute("SELECT ok, counts FROM stage_reports").fetchone()
    return None if row is None else (int(row[0]), str(row[1]))


def _report(rep: AcquireReport) -> Any:
    return lambda *a, **k: rep


def test_sockseek_failure_exits_1_without_recording(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _env(tmp_path, monkeypatch)

    def boom(*a: Any, **k: Any) -> AcquireReport:
        raise SockseekError("aucun index écrit")

    monkeypatch.setattr(cli, "acquire_pass", boom)
    result = runner.invoke(cli.app, ["acquire"])
    assert result.exit_code == 1
    assert "Sockseek en échec (aucun index écrit) : aucune tentative comptée" in result.output
    assert _stage(db) is None


def test_interrupted_sockseek_fails_the_stage(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _env(tmp_path, monkeypatch)
    rep = AcquireReport(n_wanted=4, n_ready=1, n_unindexed=3)
    monkeypatch.setattr(cli, "acquire_pass", _report(rep))
    result = runner.invoke(cli.app, ["acquire"])
    assert result.exit_code == 1
    assert "arrêté avant 3 titres" in result.output
    stage = _stage(db)
    assert stage is not None and stage[0] == 0 and '"non tentés": 3' in stage[1]


def test_success_rate_floor_comes_from_editorial(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _env(tmp_path, monkeypatch, "[acquisition]\nmin_attempts_for_rate = 3\n")
    rep = AcquireReport(n_wanted=3, failures=Counter({"aucun résultat": 3}))
    monkeypatch.setattr(cli, "acquire_pass", _report(rep))
    assert runner.invoke(cli.app, ["acquire"]).exit_code == 1


def test_missing_cover_is_reported_not_failed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db = _env(tmp_path, monkeypatch)
    rep = AcquireReport(n_wanted=2, n_ready=2, n_no_cover=1)
    monkeypatch.setattr(cli, "acquire_pass", _report(rep))
    result = runner.invoke(cli.app, ["acquire"])
    assert result.exit_code == 0
    assert "prêts sans pochette : 1" in result.output
    stage = _stage(db)
    assert stage is not None and stage[0] == 1 and '"sans pochette": 1' in stage[1]
