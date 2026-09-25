"""Commandes AubeSonore v3."""

import logging
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import NoReturn

import numpy as np
import requests
import typer
from plexapi.exceptions import PlexApiException
from pydantic import ValidationError

from radio.core.config import Settings, load_editorial
from radio.core.db import connect
from radio.discover.negatives import import_negatives, load_negatives
from radio.discover.run import DiscoverReport, NoLibraryArtistsError, discover_pass
from radio.library.artists import RegisterReport, register_library
from radio.library.match import MatchReport, coverage, match_library
from radio.library.sync import EmptyLibraryError, sync_library
from radio.signals.artists import FetchReport, fetch_artists
from radio.signals.audio import EffnetEmbedder, ModelError
from radio.signals.measure import MeasureReport, measure_tracks
from radio.signals.table import SignalTable, load_signals
from radio.sources.deezer import DeezerClient, DeezerUnavailable
from radio.sources.lastfm import LastfmClient, LastfmUnavailable
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


def _lastfm(settings: Settings) -> LastfmClient:
    if settings.lastfm_api_key is None:
        _fail("LASTFM_API_KEY doit être défini dans .env", 2)
    return LastfmClient(settings.lastfm_api_key.get_secret_value())


def _rng() -> np.random.Generator:
    return np.random.default_rng()


def _logging() -> None:
    logging.basicConfig(
        level=logging.INFO, stream=sys.stderr, format="%(asctime)s %(levelname)s %(message)s"
    )
    # À WARNING, urllib3 peut journaliser l'URL complète, clé Last.fm comprise.
    logging.getLogger("urllib3").setLevel(logging.ERROR)


def _unavailable(e: Exception) -> str:
    source = "Deezer" if isinstance(e, DeezerUnavailable) else "Last.fm"
    return f"{source} indisponible ({e}) : le travail fait est gardé, relancer plus tard"


def _discover_lines(rep: DiscoverReport) -> list[str]:
    kind = "reprise" if rep.resumed else "nouvelle"
    lines = [
        f"Découverte : passe n°{rep.run_id} ({kind}), {_n(rep.n_seeds)} graines → "
        f"{_n(rep.n_neighbours)} voisins, {_n(rep.n_seen)} titres vus → {_n(rep.n_added)} "
        f"ajoutés, {_n(rep.n_duplicates)} doublons, {_n(rep.n_filtered)} écartés (pas "
        f"l'artiste principal ou sans extrait), {_n(len(rep.skipped))} sautés"
    ]
    if rep.n_dropped:
        lines.append(
            f"  {_n(rep.n_dropped)} graines de la passe reprise ont quitté la bibliothèque"
        )
    lines += [f"  sauté : {s}" for s in rep.skipped]
    return lines


def _fail(message: str, code: int) -> NoReturn:
    typer.echo(message, err=True)
    raise typer.Exit(code)


def _n(x: int) -> str:
    return f"{x:,}".replace(",", "\u202f")  # espace insécable fine (U+202F)


def _pct(a: int, b: int) -> str:
    return f"{(100 * a / b) if b else 0:.1f} %".replace(".", ",")


def _match_line(rep: MatchReport) -> str:
    n_un = sum(rep.unmatched.values())
    details = ", ".join(
        f"{label} {_n(rep.unmatched[k])}" for k, label in _REASONS if rep.unmatched.get(k)
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
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    now = datetime.now(UTC).isoformat()
    try:
        plex = _plex(settings)
        tracks = plex.tracks()
    except LibraryGuardError as e:
        _fail(f"Bibliothèque refusée : {e}", 2)
    except (requests.RequestException, PlexApiException) as e:
        _fail(f"Plex en erreur ({type(e).__name__})", 1)
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
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    typer.echo(_match_line(rep))
    for err in rep.errors:
        typer.echo(f"  erreur : {err}")
    typer.echo(f"Couverture : {_n(done)} / {_n(total)} titres rapprochés ({_pct(done, total)})")


@app.command()
def discover() -> None:
    """Tire des graines dans la bibliothèque et découvre des titres candidats."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    lastfm = _lastfm(settings)
    conn = connect(settings.data_dir / "radio.db")
    try:
        rep = discover_pass(conn, _deezer(), lastfm, editorial.discover, datetime.now(UTC), _rng())
    except NoLibraryArtistsError:
        _fail("Aucun artiste de la bibliothèque rapproché : lancer d'abord radio library-sync", 1)
    except (DeezerUnavailable, LastfmUnavailable) as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    for line in _discover_lines(rep):
        typer.echo(line)


@app.command("negatives-sync")
def negatives_sync() -> None:
    """Importe les titres des artistes négatifs de démarrage (config/negatives.toml)."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    try:
        negatives = load_negatives(settings.config_dir / "negatives.toml")
    except ValidationError as e:
        _fail(f"negatives.toml invalide : {e.error_count()} erreurs", 2)
    except ValueError as e:
        _fail(f"negatives.toml invalide : {e}", 2)
    conn = connect(settings.data_dir / "radio.db")
    try:
        rep = import_negatives(
            conn,
            _deezer(),
            negatives,
            editorial.discover.tracks_per_neighbour,
            datetime.now(UTC).isoformat(),
        )
    except DeezerUnavailable as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    typer.echo(
        f"Négatifs : {_n(rep.n_artists)} artistes ({_n(rep.n_already)} déjà importés) → "
        f"{_n(rep.n_added)} titres ajoutés, {_n(rep.n_duplicates)} doublons, "
        f"{_n(rep.n_filtered)} écartés, {_n(len(rep.skipped))} sautés"
    )
    for s in rep.skipped:
        typer.echo(f"  sauté : {s}")


def _embedder(settings: Settings) -> EffnetEmbedder:
    return EffnetEmbedder(settings.effnet_model)


def _rate(x: float) -> str:
    return f"{100 * x:.1f} %".replace(".", ",")


def _signals_lines(
    reg: RegisterReport, fetch: FetchReport, meas: MeasureReport, table: SignalTable
) -> list[str]:
    lines = [
        f"Bibliothèque inscrite : {_n(reg.n_tracks)} titres, {_n(reg.n_artists)} artistes "
        f"({_n(reg.n_removed)} retirés)",
        f"Artistes : {_n(fetch.n_todo)} à lire → {_n(fetch.n_fetched)} lus, "
        f"{_n(len(fetch.not_on_deezer))} introuvables sur Deezer, {_n(len(fetch.skipped))} sautés",
        f"Titres : {_n(meas.n_todo)} à mesurer → {_n(meas.n_ok)} mesurés, "
        f"{_n(meas.n_no_preview)} sans extrait, {_n(meas.n_audio_failed)} empreinte ratée, "
        f"{_n(meas.n_gone)} disparus de Deezer, {_n(len(meas.errors))} en erreur",
    ]
    lines += [f"  introuvable : {x}" for x in fetch.not_on_deezer]
    lines += [f"  sauté : {x}" for x in fetch.skipped]
    lines += [f"  erreur : {x}" for x in meas.errors]
    by_origin = Counter(table.origins)
    lines.append(
        f"Signaux prêts : {_n(len(table.origins))} titres (bibliothèque "
        f"{_n(by_origin['library'])}, candidats {_n(by_origin['candidate'])}, négatifs "
        f"{_n(by_origin['negative'])})"
    )
    rates = table.missing_rates()
    if rates:
        lines.append("Valeurs absentes : " + ", ".join(f"{k} {_rate(v)}" for k, v in rates.items()))
    return lines


@app.command()
def signals() -> None:
    """Mesure les signaux de tous les titres connus (bibliothèque, candidats, négatifs)."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    lastfm = _lastfm(settings)
    try:
        embedder = _embedder(settings)
    except ModelError as e:
        _fail(f"Modèle EffNet refusé : {e}", 2)
    now = datetime.now(UTC).isoformat()
    deezer = _deezer()
    conn = connect(settings.data_dir / "radio.db")
    try:
        reg = register_library(conn, now)
        # La mesure audio ne dépend que de Deezer (~13 h) : elle passe avant Last.fm pour ne
        # jamais être retardée par une panne Last.fm (F2).
        meas = measure_tracks(conn, deezer, embedder, now)
        fetch = fetch_artists(conn, deezer, lastfm, editorial.discover.lastfm_similar_limit, now)
        table = load_signals(conn, editorial.signals.culture_vocabulary)
    except (DeezerUnavailable, LastfmUnavailable) as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    for line in _signals_lines(reg, fetch, meas, table):
        typer.echo(line)
