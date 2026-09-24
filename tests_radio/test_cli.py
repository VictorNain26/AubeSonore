import logging
from collections.abc import Callable
from pathlib import Path

import pytest
import requests
from plexapi.exceptions import Unauthorized
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.library.match import MatchReport
from radio.sources.deezer import DeezerTrack, DeezerUnavailable
from radio.sources.plex import LibraryGuardError, PlexTrack

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


def _raise(exc: Exception) -> Callable[[Settings], FakePlex]:
    def plex(settings: Settings) -> FakePlex:
        raise exc

    return plex


def test_library_guard_error_exits_2(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "_plex", _raise(LibraryGuardError("section interdite : X")))
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 2
    assert "Bibliothèque refusée : section interdite : X" in res.output


def test_plex_error_exits_1_with_type_name(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "_plex", _raise(Unauthorized("(401) unauthorized")))
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 1
    assert "Plex en erreur (Unauthorized)" in res.output


def test_empty_library_exits_1(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "_plex", lambda s: FakePlex([]))
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer())
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 1
    assert "Plex n'a renvoyé aucun titre" in res.output


def test_plex_token_never_leaks(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(
        _env_file=None,
        plex_token="tok-SECRET-123",
        plex_music_section="Musique",
        RADIO_DATA_DIR=env / "data",
        RADIO_CONFIG_DIR=env / "config",
    )
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    exc = requests.ConnectionError("http://plex?X-Plex-Token=tok-SECRET-123")
    monkeypatch.setattr(cli, "_plex", _raise(exc))
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 1
    assert "Plex en erreur (ConnectionError)" in res.output
    assert "tok-SECRET-123" not in res.output


def test_urllib3_logs_are_silenced(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # urllib3 à WARNING peut journaliser l'URL complète, clé Last.fm comprise.
    urllib3_logger = logging.getLogger("urllib3")
    monkeypatch.setattr(urllib3_logger, "level", logging.NOTSET)
    monkeypatch.setattr(cli, "_plex", lambda s: FakePlex([]))
    runner.invoke(cli.app, ["library-sync"])
    assert urllib3_logger.level == logging.ERROR


def test_match_line_formats_reason_counts() -> None:
    rep = MatchReport(
        n_todo=5000, n_matched=2000, unmatched={"no_result": 1234, "no_exact_match": 1766}
    )
    assert cli._match_line(rep) == (
        "Rapprochement Deezer : 5\u202f000 à traiter → 2\u202f000 trouvés, 3\u202f000 non trouvés "
        "(sans résultat 1\u202f234, sans correspondance exacte 1\u202f766), 0 en erreur"
    )
