from pathlib import Path

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.sources.deezer import DeezerTrack, DeezerUnavailable
from radio.sources.plex import PlexTrack

runner = CliRunner()


class FakePlex:
    def __init__(self, tracks: list[PlexTrack]) -> None:
        self._tracks = tracks

    def tracks(self) -> list[PlexTrack]:
        return self._tracks


class FakeDeezer:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        if self.fail:
            raise DeezerUnavailable("code 4")
        if "Mannequin" in query:
            return [DeezerTrack(7, "Mannequin", "Mannequin", 157, 1, 70, "Wire", True)]
        return []


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text("[library]\nduration_tolerance_s = 3\n")
    settings = Settings(
        _env_file=None,
        plex_token="tok",
        plex_music_section="Musique",
        RADIO_DATA_DIR=tmp_path / "data",
        RADIO_CONFIG_DIR=cfg,
    )
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    return tmp_path


def test_library_sync_end_to_end(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    tracks = [
        PlexTrack("1", "Wire", "Mannequin", "Pink Flag", 157000, 2),
        PlexTrack("2", "Wire", "Nope", "Pink Flag", 100000, 0),
    ]
    monkeypatch.setattr(cli, "_plex", lambda s: FakePlex(tracks))
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer())
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 0, res.output
    assert "Bibliothèque Plex : 2 titres (2 ajoutés, 0 modifiés, 0 retirés)" in res.stdout
    assert (
        "Rapprochement Deezer : 2 à traiter → 1 trouvés, 1 non trouvés (sans résultat 1), "
        "0 en erreur" in res.stdout
    )
    assert "Couverture : 1 / 2 titres rapprochés (50,0 %)" in res.stdout
    assert (env / "data" / "radio.db").exists()


def test_missing_config_exits_2(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        cli, "_settings", lambda: Settings(_env_file=None, RADIO_CONFIG_DIR=env / "config")
    )
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 2
    assert "PLEX_TOKEN" in res.output


def test_deezer_unavailable_exits_1(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        cli, "_plex", lambda s: FakePlex([PlexTrack("1", "Wire", "Mannequin", "P", 157000, 0)])
    )
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer(fail=True))
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 1
    assert "Deezer indisponible" in res.output


def test_thousands_are_formatted_in_french() -> None:
    assert cli._n(3424) == "3\u202f424"
    assert cli._pct(2900, 3424) == "84,7 %"
