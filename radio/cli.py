"""Commandes AubeSonore : goût et découverte."""

import logging
import sqlite3
import sys
from collections import Counter
from contextlib import closing
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import NoReturn

import numpy as np
import requests
import typer
import uvicorn
from plexapi.exceptions import PlexApiException
from pydantic import ValidationError

from radio.core.config import Editorial, Settings, load_editorial
from radio.core.db import connect
from radio.discover.negatives import import_negatives, load_negatives
from radio.discover.run import NoLibraryArtistsError, discover_pass
from radio.library.artists import register_library
from radio.library.match import coverage, match_library
from radio.library.sync import EmptyLibraryError, sync_library
from radio.model.dataset import MissingExamplesError
from radio.model.model import (
    Batch,
    TrainReport,
    last_batch,
    rescore,
    train,
    trained_on,
    votes_count,
)
from radio.notify.whatsapp import WhatsAppError, send_whatsapp
from radio.signals.audio import EffnetEmbedder, ModelError
from radio.signals.measure import measure_tracks
from radio.signals.table import load_signals
from radio.sources.deezer import DeezerClient, DeezerUnavailable
from radio.sources.lastfm import LastfmClient, LastfmUnavailable
from radio.sources.plex import LibraryGuardError, PlexSource
from radio.votes.access import AccessVerifier
from radio.votes.app import create_app
from radio.votes.select import NoScoresError, NoServingModelError, PendingBallotsError, select_batch
from radio.votes.status import Status, load_status

app = typer.Typer(no_args_is_help=True, add_completion=False)

_REASONS = (
    ("no_duration", "sans durée"),
    ("no_result", "sans résultat"),
    ("no_exact_match", "sans correspondance exacte"),
)


def _fail(message: str, code: int) -> NoReturn:
    typer.echo(message, err=True)
    raise typer.Exit(code)


def _n(x: int) -> str:
    return f"{x:,}".replace(",", "\u202f")  # espace fine insécable


def _rate(x: float) -> str:
    return f"{100 * x:.1f} %".replace(".", ",")


def _pct(a: int, b: int) -> str:
    return _rate(a / b if b else 0.0)


def _dec(x: float | None) -> str:
    return "—" if x is None else f"{x:.3f}".replace(".", ",")


def _echo(lines: list[str]) -> None:
    for line in lines:
        typer.echo(line)


def _settings() -> Settings:
    try:
        return Settings()
    except ValidationError as e:
        _fail(f".env invalide : {', '.join(str(x['loc'][0]) for x in e.errors())}", 2)


def _editorial(settings: Settings) -> Editorial:
    return load_editorial(settings.config_dir / "editorial.toml")


def _db(settings: Settings) -> closing[sqlite3.Connection]:
    return closing(connect(settings.data_dir / "radio.db"))


def _lastfm(settings: Settings) -> LastfmClient:
    if settings.lastfm_api_key is None:
        _fail("LASTFM_API_KEY doit être défini dans .env", 2)
    return LastfmClient(settings.lastfm_api_key.get_secret_value())


def _unavailable(e: Exception) -> str:
    source = "Deezer" if isinstance(e, DeezerUnavailable) else "Last.fm"
    return f"{source} indisponible ({e}) : le travail fait est gardé, relancer plus tard"


def _now() -> str:
    return datetime.now(UTC).isoformat()


@app.callback()
def main() -> None:
    """AubeSonore — goût et découverte."""
    logging.basicConfig(
        level=logging.INFO, stream=sys.stderr, format="%(asctime)s %(levelname)s %(message)s"
    )
    # À WARNING, urllib3 peut journaliser l'URL complète, clé Last.fm comprise.
    logging.getLogger("urllib3").setLevel(logging.ERROR)


@app.command("library-sync")
def library_sync() -> None:
    """Lit la bibliothèque Plex et la rapproche de Deezer."""
    settings = _settings()
    editorial = _editorial(settings)
    if settings.plex_token is None or not settings.plex_music_section:
        _fail("PLEX_TOKEN et PLEX_MUSIC_SECTION doivent être définis dans .env", 2)
    now = _now()
    try:
        tracks = PlexSource(
            settings.plex_url,
            settings.plex_token.get_secret_value(),
            settings.plex_music_section,
            PurePosixPath(settings.plex_music_root),
        ).tracks()
    except LibraryGuardError as e:
        _fail(f"Bibliothèque refusée : {e}", 2)
    except (requests.RequestException, PlexApiException) as e:
        _fail(f"Plex en erreur ({type(e).__name__})", 1)
    with _db(settings) as conn:
        try:
            sync = sync_library(conn, tracks, now)
            rep = match_library(conn, DeezerClient(), editorial.library.duration_tolerance_s, now)
        except EmptyLibraryError:
            _fail("Plex n'a renvoyé aucun titre : rien n'a été modifié", 1)
        except DeezerUnavailable as e:
            _fail(_unavailable(e), 1)
        done, total = coverage(conn)
    details = ", ".join(
        f"{label} {_n(rep.unmatched[k])}" for k, label in _REASONS if rep.unmatched.get(k)
    )
    _echo(
        [
            f"Bibliothèque Plex : {_n(sync.n_tracks)} titres ({_n(sync.n_added)} ajoutés, "
            f"{_n(sync.n_changed)} modifiés, {_n(sync.n_removed)} retirés)",
            f"Rapprochement Deezer : {_n(rep.n_todo)} à traiter → {_n(rep.n_matched)} trouvés, "
            f"{_n(sum(rep.unmatched.values()))} non trouvés"
            + (f" ({details})" if details else "")
            + f", {_n(len(rep.errors))} en erreur",
            *(f"  erreur : {err}" for err in rep.errors),
            f"Couverture : {_n(done)} / {_n(total)} titres rapprochés ({_pct(done, total)})",
        ]
    )


@app.command()
def discover() -> None:
    """Tire des graines dans la bibliothèque et découvre des titres candidats."""
    settings = _settings()
    editorial = _editorial(settings)
    lastfm = _lastfm(settings)
    with _db(settings) as conn:
        try:
            rep = discover_pass(
                conn,
                DeezerClient(),
                lastfm,
                editorial.discover,
                datetime.now(UTC),
                np.random.default_rng(),
            )
        except NoLibraryArtistsError:
            _fail(
                "Aucun artiste de la bibliothèque rapproché : lancer d'abord radio library-sync", 1
            )
        except (DeezerUnavailable, LastfmUnavailable) as e:
            _fail(_unavailable(e), 1)
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
    _echo(lines + [f"  sauté : {s}" for s in rep.skipped])


@app.command("negatives-sync")
def negatives_sync() -> None:
    """Importe les titres des artistes négatifs de démarrage (config/negatives.toml)."""
    settings = _settings()
    editorial = _editorial(settings)
    try:
        negatives = load_negatives(settings.config_dir / "negatives.toml")
    except ValidationError as e:
        _fail(f"negatives.toml invalide : {e.error_count()} erreurs", 2)
    except ValueError as e:
        _fail(f"negatives.toml invalide : {e}", 2)
    with _db(settings) as conn:
        try:
            rep = import_negatives(
                conn, DeezerClient(), negatives, editorial.discover.tracks_per_neighbour, _now()
            )
        except DeezerUnavailable as e:
            _fail(_unavailable(e), 1)
    _echo(
        [
            f"Négatifs : {_n(rep.n_artists)} artistes ({_n(rep.n_already)} déjà importés) → "
            f"{_n(rep.n_added)} titres ajoutés, {_n(rep.n_duplicates)} doublons, "
            f"{_n(rep.n_filtered)} écartés, {_n(len(rep.skipped))} sautés",
            *(f"  sauté : {s}" for s in rep.skipped),
        ]
    )


@app.command()
def signals() -> None:
    """Mesure l'empreinte audio de tous les titres connus (bibliothèque, candidats, négatifs)."""
    settings = _settings()
    try:
        embedder = EffnetEmbedder(settings.effnet_model)
    except ModelError as e:
        _fail(f"Modèle EffNet refusé : {e}", 2)
    now = _now()
    with _db(settings) as conn:
        reg = register_library(conn, now)
        try:
            meas = measure_tracks(conn, DeezerClient(), embedder, now)
        except DeezerUnavailable as e:
            _fail(_unavailable(e), 1)
        origins = Counter(load_signals(conn).origins)
    _echo(
        [
            f"Bibliothèque inscrite : {_n(reg.n_tracks)} titres, {_n(reg.n_artists)} artistes "
            f"({_n(reg.n_removed)} retirés)",
            f"Titres : {_n(meas.n_todo)} à mesurer → {_n(meas.n_ok)} mesurés, "
            f"{_n(meas.n_no_preview)} sans extrait, {_n(meas.n_audio_failed)} empreinte ratée, "
            f"{_n(meas.n_gone)} disparus de Deezer, {_n(len(meas.errors))} en erreur",
            *(f"  erreur : {x}" for x in meas.errors),
            f"Empreintes prêtes : {_n(origins.total())} titres (bibliothèque "
            f"{_n(origins['library'])}, candidats {_n(origins['candidate'])}, négatifs "
            f"{_n(origins['negative'])})",
        ]
    )


def _train_lines(r: TrainReport) -> list[str]:
    c = r.counts
    verdict = "promu" if r.promoted else "non promu"
    return [
        f"Exemples : bibliothèque {_n(c['library'])}, oui {_n(c['vote_yes'])}, "
        f"non {_n(c['vote_no'])}, négatifs faibles {_n(c['weak'])} "
        f"({_n(r.n_weak_excluded)} écartés) ; {_n(r.n_votes_unmeasured)} votes sans empreinte",
        f"Examen : {_n(r.n_exam)} votes, AUC {_dec(r.new_auc)} (modèle en service : "
        f"{_dec(r.current_auc)})",
        f"Modèle n°{r.model_id} : {verdict} — {r.verdict}",
    ]


def _batch_line(b: Batch) -> str:
    return (
        f"Dernière fournée (passe n°{b.run_id}) : {_n(b.retained)} retenus sur {_n(b.n)} candidats"
    )


@app.command("train")
def train_command() -> None:
    """Entraîne le modèle s'il y a de nouveaux votes, puis note les candidats."""
    settings = _settings()
    cfg = _editorial(settings).model
    models_dir = settings.data_dir / "models"
    lines = []
    with _db(settings) as conn:
        n = votes_count(conn)
        if n == trained_on(conn):
            lines.append(f"Aucun nouveau vote ({_n(n)} votes) : pas de réentraînement")
        else:
            try:
                lines += _train_lines(train(conn, models_dir, cfg, _now()))
            except MissingExamplesError:
                _fail(
                    "Exemples insuffisants (il faut des titres de la bibliothèque et des négatifs "
                    "mesurés) : lancer radio negatives-sync puis radio signals",
                    1,
                )
        model_id = rescore(conn, models_dir, cfg)
        batch = last_batch(conn)
    if model_id is None:
        lines.append("Aucun modèle en service : candidats non notés")
    else:
        lines.append(f"Candidats notés par le modèle n°{model_id}")
        if batch is not None:
            lines.append(_batch_line(batch))
    _echo(lines)


def _status(settings: Settings, editorial: Editorial) -> Status:
    with _db(settings) as conn:
        return load_status(
            conn,
            settings.data_dir / "models",
            editorial.model.exam_window,
            editorial.votes.quiet_days,
            datetime.now(UTC),
        )


def _status_lines(st: Status, quiet_days: int) -> list[str]:
    if st.model_id is None:
        lines = ["Aucun modèle en service"]
    else:
        lines = [f"Modèle n°{st.model_id} : AUC d'examen {_dec(st.exam_auc)} sur {_n(st.n_exam)}"]
    if st.yes is None:
        lines.append("Taux de oui des retenus : aucun vote d'examen sur la page")
    else:
        y = st.yes
        lines.append(
            f"Taux de oui des retenus : {_rate(y.rate)} [{_rate(y.low)} - {_rate(y.high)}] "
            f"sur {_n(y.n)} votes d'examen"
        )
    lines += [
        f"Dernier vote d'examen : {st.last_exam_vote or 'aucun'}",
        f"Votes des {quiet_days} derniers jours : {_n(st.recent_votes)}",
        f"Titres en attente de vote : {_n(st.pending)} "
        f"(dernière sélection : {st.last_selection or 'aucune'})",
    ]
    if st.pending == 0:
        if st.last_selection is None:
            lines.append("ALERTE : aucune sélection encore tirée (passe hebdomadaire en échec ?)")
        elif st.stale_selection_days is not None and st.stale_selection_days > quiet_days:
            lines.append(
                f"ALERTE : aucune sélection depuis {_n(st.stale_selection_days)} jours "
                "(passe hebdomadaire en échec ?)"
            )
    if st.batch is not None:
        lines.append(_batch_line(st.batch))
    return lines


@app.command()
def report() -> None:
    """État du goût : modèle en service, taux de oui, votes, dernière fournée."""
    settings = _settings()
    editorial = _editorial(settings)
    _echo(_status_lines(_status(settings, editorial), editorial.votes.quiet_days))


@app.command("votes-select")
def votes_select() -> None:
    """Tire la sélection de la semaine : examen au hasard parmi les retenus, leçon par
    incertitude."""
    settings = _settings()
    v = _editorial(settings).votes
    with _db(settings) as conn:
        try:
            sel = select_batch(
                conn,
                np.random.default_rng(),
                v.exam_per_selection,
                v.lesson_per_selection,
                _now(),
            )
        except PendingBallotsError as e:
            typer.echo(f"{_n(e.n)} titres encore en attente de vote : pas de nouvelle sélection")
            return
        except NoServingModelError:
            _fail("Aucun modèle en service : lancer radio train", 1)
        except NoScoresError:
            _fail("Le modèle en service n'a noté aucun candidat : lancer radio train", 1)
    if sel.selection_id is None:
        typer.echo("Rien à présenter : tous les candidats notés ont déjà été présentés")
        return
    typer.echo(
        f"Sélection n°{sel.selection_id} (modèle n°{sel.model_id}, fournée n°{sel.run_id}) : "
        f"{_n(len(sel.exam))} d'examen parmi {_n(sel.n_batch)} titres de la fournée, "
        f"{_n(len(sel.lesson))} de leçon"
    )


@app.command("votes-serve")
def votes_serve() -> None:
    """Sert la page de vote en local ; le tunnel Cloudflare la publie derrière Access."""
    settings = _settings()
    team, aud = settings.cf_access_team_domain, settings.cf_access_aud
    if not team or not aud:
        _fail("CF_ACCESS_TEAM_DOMAIN et CF_ACCESS_AUD doivent être définis dans .env", 2)
    web = create_app(settings.data_dir / "radio.db", DeezerClient(), AccessVerifier(team, aud))
    uvicorn.run(web, host=settings.votes_host, port=settings.votes_port)


def _page_ok(settings: Settings) -> bool:
    """Sonde le serveur local seulement : tunnel ou règle Access en panne non détectés."""
    try:
        r = requests.get(f"http://{settings.votes_host}:{settings.votes_port}/sante", timeout=5)
    except requests.RequestException:
        return False
    return r.status_code == 200


@app.command("votes-remind")
def votes_remind() -> None:
    """Envoie le rappel WhatsApp : titres en attente, taux de oui, alertes."""
    settings = _settings()
    editorial = _editorial(settings)
    if settings.whatsapp_phone is None or settings.callmebot_apikey is None:
        _fail("WHATSAPP_PHONE et CALLMEBOT_APIKEY doivent être définis dans .env", 2)
    if not settings.votes_url:
        _fail("RADIO_VOTES_URL doit être défini dans .env", 2)
    st = _status(settings, editorial)
    head = (
        f"AubeSonore : {_n(st.pending)} titres à écouter — {settings.votes_url}"
        if st.pending
        else "AubeSonore : aucun titre en attente de vote"
    )
    lines = [head] + ([] if _page_ok(settings) else ["Page de vote injoignable"])
    text = "\n".join(lines + _status_lines(st, editorial.votes.quiet_days))
    typer.echo(text)
    try:
        send_whatsapp(
            settings.whatsapp_phone.get_secret_value(),
            settings.callmebot_apikey.get_secret_value(),
            text,
        )
    except WhatsAppError as e:
        _fail(f"Rappel WhatsApp non envoyé : {e}", 1)
    typer.echo("Rappel WhatsApp envoyé")
