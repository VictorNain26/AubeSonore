"""Commandes AubeSonore v3."""

import logging
import sys
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import NoReturn

import requests
import typer
from plexapi.exceptions import PlexApiException

from radio.core.config import Settings, load_editorial
from radio.core.db import connect
from radio.library.match import MatchReport, coverage, match_library
from radio.library.sync import EmptyLibraryError, sync_library
from radio.sources.deezer import DeezerClient, DeezerUnavailable
from radio.sources.plex import LibraryGuardError, PlexSource

app = typer.Typer(no_args_is_help=True, add_completion=False)

_REASONS = (
    ("no_duration", "sans durée"),
    ("no_result", "sans résultat"),
    ("no_exact_match", "sans correspondance exacte"),
)


def _settings() -> Settings:
    return Settings()


def _plex(settings: Settings) -> PlexSource:
    if settings.plex_token is None or not settings.plex_music_section:
        _fail("PLEX_TOKEN et PLEX_MUSIC_SECTION doivent être définis dans .env", 2)
    return PlexSource(
        settings.plex_url,
        settings.plex_token.get_secret_value(),
        settings.plex_music_section,
        PurePosixPath(settings.plex_music_root),
    )


def _deezer() -> DeezerClient:
    return DeezerClient()


def _fail(message: str, code: int) -> NoReturn:
    typer.echo(message, err=True)
    raise typer.Exit(code)


def _n(x: int) -> str:
    return f"{x:,}".replace(",", " ")


def _pct(a: int, b: int) -> str:
    return f"{(100 * a / b) if b else 0:.1f} %".replace(".", ",")


def _match_line(rep: MatchReport) -> str:
    n_un = sum(rep.unmatched.values())
    details = ", ".join(
        f"{label} {rep.unmatched[k]}" for k, label in _REASONS if rep.unmatched.get(k)
    )
    un = f"{_n(n_un)} non trouvés" + (f" ({details})" if details else "")
    return (
        f"Rapprochement Deezer : {_n(rep.n_todo)} à traiter → {_n(rep.n_matched)} trouvés, "
        f"{un}, {_n(len(rep.errors))} en erreur"
    )


@app.callback()
def main() -> None:
    """AubeSonore — goût et découverte."""


@app.command("library-sync")
def library_sync() -> None:
    """Lit la bibliothèque Plex et la rapproche de Deezer."""
    logging.basicConfig(
        level=logging.INFO, stream=sys.stderr, format="%(asctime)s %(levelname)s %(message)s"
    )
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    now = datetime.now(UTC).isoformat()
    try:
        plex = _plex(settings)
        tracks = plex.tracks()
    except LibraryGuardError as e:
        _fail(f"Bibliothèque refusée : {e}", 2)
    except (requests.RequestException, PlexApiException) as e:
        _fail(f"Plex injoignable ({type(e).__name__})", 1)
    conn = connect(settings.data_dir / "radio.db")
    try:
        sync = sync_library(conn, tracks, now)
        typer.echo(
            f"Bibliothèque Plex : {_n(sync.n_tracks)} titres ({_n(sync.n_added)} ajoutés, "
            f"{_n(sync.n_changed)} modifiés, {_n(sync.n_removed)} retirés)"
        )
        rep = match_library(conn, _deezer(), editorial.library.duration_tolerance_s, now)
        done, total = coverage(conn)
    except EmptyLibraryError:
        _fail("Plex n'a renvoyé aucun titre : rien n'a été modifié", 1)
    except DeezerUnavailable as e:
        _fail(f"Deezer indisponible ({e}) : le travail fait est gardé, relancer plus tard", 1)
    finally:
        conn.close()
    typer.echo(_match_line(rep))
    for err in rep.errors:
        typer.echo(f"  erreur : {err}")
    typer.echo(f"Couverture : {_n(done)} / {_n(total)} titres rapprochés ({_pct(done, total)})")
