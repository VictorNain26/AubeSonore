"""Commandes AubeSonore v3."""

import logging
import sqlite3
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Annotated, NoReturn

import numpy as np
import requests
import typer
import uvicorn
from plexapi.exceptions import PlexApiException
from pydantic import ValidationError

from radio.core.config import Editorial, ModelConfig, Settings, load_editorial
from radio.core.db import connect
from radio.discover.negatives import import_negatives, load_negatives
from radio.discover.run import DiscoverReport, NoLibraryArtistsError, discover_pass
from radio.library.artists import RegisterReport, register_library
from radio.library.match import MatchReport, coverage, match_library
from radio.library.sync import EmptyLibraryError, sync_library
from radio.model.dataset import Labels, MissingExamplesError, build_labels
from radio.model.evaluate import YesRate
from radio.model.promote import (
    Decision,
    ExamMetrics,
    Serving,
    batch_acceptance,
    current_model,
    decide,
    exam_metrics,
    last_votes_seen,
    save_model,
    votes_seen,
    write_scores,
)
from radio.model.train import TrainResult, train_model
from radio.notify.whatsapp import WhatsAppError, send_whatsapp
from radio.signals.artists import FetchReport, fetch_artists
from radio.signals.audio import EffnetEmbedder, ModelError
from radio.signals.measure import MeasureReport, measure_tracks
from radio.signals.table import SignalTable, load_signals
from radio.sources.deezer import DeezerClient, DeezerUnavailable
from radio.sources.lastfm import LastfmClient, LastfmUnavailable
from radio.sources.plex import LibraryGuardError, PlexSource
from radio.votes.access import AccessVerifier
from radio.votes.app import create_app
from radio.votes.importer import import_votes, load_bench, vote_counts
from radio.votes.select import (
    NoScoresError,
    NoServingModelError,
    PendingBallotsError,
    select_batch,
)
from radio.votes.status import Status, load_status

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


_ORIGINS = {"library": "bibliothèque", "candidate": "candidats", "negative": "négatifs"}


def _missing_lines(table: SignalTable) -> list[str]:
    return [
        f"Valeurs absentes ({_ORIGINS.get(origin, origin)}) : "
        + ", ".join(f"{k} {_rate(v)}" for k, v in rates.items())
        for origin, rates in table.missing_rates_by_origin().items()
    ]


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
    lines += _missing_lines(table)
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


@app.command("votes-import")
def votes_import(
    votes_dir: Annotated[Path, typer.Argument(help="Dossier des votes du banc, un JSON par titre")],
    series: Annotated[Path, typer.Argument(help="series.json du banc : s1 examen, s2 leçon")],
    source: Annotated[str, typer.Option(help="Origine des votes, gardée en base")] = (
        "banc-2026-09-24"
    ),
) -> None:
    """Importe les votes du banc d'écoute (série 1 → examen, série 2 → leçon)."""
    _logging()
    settings = _settings()
    try:
        votes = load_bench(votes_dir, series)
    except (OSError, KeyError, TypeError, ValueError) as e:
        _fail(f"Banc d'écoute illisible : {type(e).__name__} {e}", 2)
    conn = connect(settings.data_dir / "radio.db")
    try:
        rep = import_votes(conn, _deezer(), votes, source, datetime.now(UTC).isoformat())
        counts = vote_counts(conn)
    except DeezerUnavailable as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    typer.echo(
        f"Votes du banc : {_n(rep.n_votes)} lus → {_n(rep.n_recorded)} enregistrés, "
        f"{_n(rep.n_added)} titres ajoutés, {_n(rep.n_mapped)} rattachés à un titre connu, "
        f"{_n(len(rep.not_found))} introuvables sur Deezer, {_n(len(rep.skipped))} sautés"
    )
    for x in rep.not_found:
        typer.echo(f"  introuvable : {x}")
    for x in rep.skipped:
        typer.echo(f"  sauté : {x}")
    kinds = (("exam", "examen"), ("lesson", "leçon"))
    typer.echo(
        "Votes en base : "
        + ", ".join(
            f"{label} {_n(sum(counts.get(k, {}).values()))} ("
            + ", ".join(f"{v} {_n(counts.get(k, {}).get(v, 0))}" for v in ("oui", "non", "passer"))
            + ")"
            for k, label in kinds
        )
    )
    if rep.n_added:
        typer.echo(f"{_n(rep.n_added)} nouveaux titres à mesurer : lancer radio signals")


def _dec(x: float | None, digits: int = 3) -> str:
    return "—" if x is None else f"{x:.{digits}f}".replace(".", ",")


def _opt_rate(x: float | None) -> str:
    return "—" if x is None else _rate(x)


def _yes(y: YesRate | None) -> str:
    if y is None:
        return "aucun titre accepté"
    return f"taux de oui {_rate(y.rate)} [{_rate(y.low)} - {_rate(y.high)}] sur {_n(y.n)} acceptés"


def _exam_line(label: str, e: ExamMetrics) -> str:
    if e.n == 0:
        return f"{label} : aucun vote d'examen"
    return f"{label} : {_n(e.n)} votes, AUC {_dec(e.auc)}, {_yes(e.yes)}"


def _batch_line(batch: tuple[int, int, int], cfg: ModelConfig) -> str:
    run_id, n, acc = batch
    alert = n > 0 and acc / n < cfg.candidate_acceptance_alert
    return f"Dernière fournée (passe n°{run_id}) : {_pct(acc, n)} acceptés" + (
        f" — ALERTE : sous {_rate(cfg.candidate_acceptance_alert)}" if alert else ""
    )


def _scored_line(model_id: int, n: int, acc: int) -> str:
    return (
        f"Candidats notés par le modèle n°{model_id} : {_n(n)}, {_n(acc)} acceptés ({_pct(acc, n)})"
    )


def _train_lines(
    r: TrainResult,
    labels: Labels,
    table: SignalTable,
    new: ExamMetrics,
    cur: ExamMetrics | None,
    decision: Decision,
    model_id: int,
    scored: tuple[int, int, int] | None,
    batch: tuple[int, int, int] | None,
    cfg: ModelConfig,
) -> list[str]:
    c = r.counts
    lines = [
        f"Exemples : bibliothèque {_n(c['library'])}, oui {_n(c['vote_yes'])}, "
        f"non {_n(c['vote_no'])}, négatifs faibles {_n(c['weak'])} "
        f"({_n(labels.n_weak_excluded)} écartés) ; examen {_n(len(labels.exam.rows))} "
        f"(dernier vote : {labels.exam.last_vote or 'aucun'}) ; "
        f"{_n(labels.n_votes_unmeasured)} votes sans signaux",
        *_missing_lines(table),
    ]
    m = r.missing_votes
    if any(m.values()):
        lines.append(
            f"Votes de leçon insuffisants : il manque {_n(m['oui'])} « oui » et {_n(m['non'])} "
            f"« non » ; négatifs faibles maintenus (poids {_dec(r.weak_weight, 1)}), "
            "ni seuil ni ablation"
        )
    lines.append(
        "Poids des négatifs faibles : "
        + " ; ".join(f"{_dec(k, 1)} → AUC {_dec(v)}" for k, v in r.weak_weight_aucs.items())
        + f" ; retenu {_dec(r.weak_weight, 1)}"
    )
    for a in r.ablation:
        verdict = "gardé" if a.kept else "retiré"
        lines.append(
            f"  sans {a.removed} : AUC {_dec(a.auc)}, précision {_opt_rate(a.precision)} "
            f"→ {verdict}"
        )
    lines.append("Signaux gardés : " + ", ".join(("son", *r.stack.groups)))
    if r.threshold is None:
        lines.append(
            f"Leçon (hors pli) : AUC {_dec(r.lesson_auc)}, aucun seuil "
            f"(précision visée {_rate(cfg.target_precision)})"
        )
    else:
        lines.append(
            f"Leçon (hors pli, seuil choisi sur ces votes) : AUC {_dec(r.lesson_auc)}, "
            f"seuil {_dec(r.threshold)} → {_yes(r.lesson_yes)}, "
            f"{_opt_rate(r.lesson_acceptance)} des votes acceptés"
        )
        lines.append(
            f"Garde-fou : bibliothèque acceptée {_opt_rate(r.library_acceptance)} (artiste "
            f"retiré), {_opt_rate(r.library_acceptance_complete)} sur "
            f"{_n(r.n_library_complete)} titres aux signaux complets ; minimum "
            f"{_rate(cfg.library_acceptance_min)}"
        )
    lines.append(_exam_line("Examen (nouveau modèle)", new))
    if cur is not None:
        lines.append(_exam_line("Examen (modèle en service)", cur))
    verdict = "promu" if decision.promoted else "non promu"
    lines.append(f"Modèle n°{model_id} : {verdict} — " + " ; ".join(decision.reasons))
    if scored is None:
        lines.append("Aucun modèle en service : candidats non notés")
    else:
        sid, n, acc = scored
        lines.append(_scored_line(sid, n, acc))
    if batch is not None:
        lines.append(_batch_line(batch, cfg))
    return lines


def _rescore_lines(
    conn: sqlite3.Connection, models_dir: Path, size: int, cfg: ModelConfig
) -> list[str]:
    """Sans nouveau vote : pas de réentraînement (spec §8), mais les candidats de la semaine
    sont notés par le modèle en service."""
    try:
        current = current_model(conn, models_dir)
    except (OSError, ValueError, EOFError) as e:
        _fail(f"Modèle en service illisible : {type(e).__name__}", 2)
    if current is None:
        return ["Aucun modèle en service : candidats non notés"]
    table = load_signals(conn, size, vocabulary=current.stack.vocabulary)
    n, acc = write_scores(conn, current, table)
    lines = [_scored_line(current.model_id, n, acc)]
    batch = batch_acceptance(conn)
    if batch is not None:
        lines.append(_batch_line(batch, cfg))
    return lines


@app.command()
def train() -> None:
    """Entraîne le modèle, le compare au modèle en service et note les candidats."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    cfg = editorial.model
    size = editorial.signals.culture_vocabulary
    models_dir = settings.data_dir / "models"
    conn = connect(settings.data_dir / "radio.db")
    try:
        seen = votes_seen(conn)
        if seen == last_votes_seen(conn):
            lines = [
                f"Aucun nouveau vote depuis le dernier entraînement ({_n(seen['n'])} votes) : "
                "pas de réentraînement",
                *_rescore_lines(conn, models_dir, size, cfg),
            ]
            for line in lines:
                typer.echo(line)
            return
        table = load_signals(conn, size)
        labels = build_labels(conn, table, cfg.exam_window)
        try:
            current = current_model(conn, models_dir)
        except (OSError, ValueError, EOFError) as e:
            _fail(f"Modèle en service illisible : {type(e).__name__}", 2)
        cur_table = None
        if current is not None:
            # Même ensemble de lignes que `table` (vérifié juste après) : seul le vocabulaire
            # (colonnes) change.
            cur_table = load_signals(conn, size, vocabulary=current.stack.vocabulary)
            if not np.array_equal(cur_table.track_ids, table.track_ids):
                _fail(
                    "Signaux modifiés pendant le chargement (radio signals en cours ?) : "
                    "relancer radio train",
                    1,
                )
        result = train_model(table, labels, cfg)
        new_exam = exam_metrics(result.stack, result.threshold, table, labels.exam)
        cur_exam = None
        if current is not None:
            assert cur_table is not None
            cur_exam = exam_metrics(current.stack, current.threshold, cur_table, labels.exam)
        decision = decide(result, new_exam, cur_exam, cfg)
        now = datetime.now(UTC).isoformat()
        model_id = save_model(conn, models_dir, result, new_exam, decision, cfg, now, seen)
        serving, serving_table = current, cur_table
        if decision.promoted and result.threshold is not None:
            serving, serving_table = Serving(model_id, result.stack, result.threshold), table
        scored = None
        batch = None
        if serving is not None and serving_table is not None:
            n, acc = write_scores(conn, serving, serving_table)
            scored = (serving.model_id, n, acc)
            batch = batch_acceptance(conn)
    except MissingExamplesError:
        _fail(
            "Exemples insuffisants (il faut des titres de la bibliothèque et des négatifs "
            "mesurés) : lancer radio negatives-sync puis radio signals",
            1,
        )
    finally:
        conn.close()
    for line in _train_lines(
        result, labels, table, new_exam, cur_exam, decision, model_id, scored, batch, cfg
    ):
        typer.echo(line)


def _status_lines(st: Status, editorial: Editorial) -> list[str]:
    v = editorial.votes
    lines = []
    if st.model_id is None or st.exam is None:
        lines.append("Aucun modèle en service")
    else:
        line = _exam_line(f"Examen (modèle n°{st.model_id})", st.exam)
        if st.exam.yes is not None and st.exam.yes.rate < v.yes_rate_alert:
            line += f" — ALERTE : taux de oui sous {_rate(v.yes_rate_alert)}"
        lines.append(line)
    lines.append(f"Dernier vote d'examen : {st.last_exam_vote or 'aucun'}")
    lines.append(
        f"Votes des {v.quiet_days} derniers jours : {_n(st.recent_votes)}"
        + ("" if st.recent_votes else " — pas de réentraînement")
    )
    lines.append(
        f"Titres en attente de vote : {_n(st.pending)} "
        f"(dernière sélection : {st.last_selection or 'aucune'})"
    )
    if st.pending == 0:
        if st.last_selection is None:
            lines.append("ALERTE : aucune sélection encore tirée (passe hebdomadaire en échec ?)")
        elif st.stale_selection_days is not None and st.stale_selection_days > v.quiet_days:
            lines.append(
                f"ALERTE : aucune sélection depuis {_n(st.stale_selection_days)} jours "
                "(passe hebdomadaire en échec ?)"
            )
    if st.batch is not None:
        lines.append(_batch_line(st.batch, editorial.model))
    return lines


def _reminder(st: Status, editorial: Editorial, url: str, page_ok: bool) -> str:
    head = (
        f"AubeSonore : {_n(st.pending)} titres à écouter — {url}"
        if st.pending
        else "AubeSonore : aucun titre en attente de vote"
    )
    lines = [head]
    if not page_ok:
        lines.append("Page de vote injoignable")
    return "\n".join(lines + _status_lines(st, editorial))


def _page_ok(settings: Settings) -> bool:
    """Sonde le serveur local seulement : tunnel ou règle Access en panne non détectés."""
    try:
        r = requests.get(f"http://{settings.votes_host}:{settings.votes_port}/sante", timeout=5)
    except requests.RequestException:
        return False
    return r.status_code == 200


def _status(settings: Settings, editorial: Editorial) -> Status:
    conn = connect(settings.data_dir / "radio.db")
    try:
        return load_status(
            conn,
            settings.data_dir / "models",
            editorial.signals.culture_vocabulary,
            editorial.model,
            editorial.votes.quiet_days,
            datetime.now(UTC),
        )
    except (OSError, ValueError, EOFError) as e:
        _fail(f"Modèle en service illisible : {type(e).__name__}", 2)
    finally:
        conn.close()


@app.command()
def report() -> None:
    """État du goût : examen du modèle en service, votes, sélection, dernière fournée."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    for line in _status_lines(_status(settings, editorial), editorial):
        typer.echo(line)


@app.command("votes-select")
def votes_select() -> None:
    """Tire la sélection de la semaine : examen au hasard parmi les retenus, leçon par
    incertitude."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    v = editorial.votes
    conn = connect(settings.data_dir / "radio.db")
    try:
        sel = select_batch(
            conn,
            _rng(),
            v.exam_per_selection,
            v.lesson_per_selection,
            datetime.now(UTC).isoformat(),
        )
    except PendingBallotsError as e:
        typer.echo(f"{_n(e.n)} titres encore en attente de vote : pas de nouvelle sélection")
        return
    except NoServingModelError:
        _fail(
            "Aucun modèle en service : voter sur le banc, lancer radio votes-import puis "
            "radio train",
            1,
        )
    except NoScoresError:
        _fail("Le modèle en service n'a noté aucun candidat : lancer radio train", 1)
    finally:
        conn.close()
    if sel.selection_id is None:
        typer.echo("Rien à présenter : tous les candidats notés ont déjà été présentés")
        return
    typer.echo(
        f"Sélection n°{sel.selection_id} (modèle n°{sel.model_id}, fournée n°{sel.run_id}) : "
        f"{_n(len(sel.exam))} d'examen parmi {_n(sel.n_retained)} retenus, "
        f"{_n(len(sel.lesson))} de leçon"
    )
    if len(sel.exam) < v.exam_per_selection:
        typer.echo(
            f"  examen incomplet : {_n(sel.n_retained)} titres retenus non présentés dans la "
            "dernière fournée"
        )


@app.command("votes-serve")
def votes_serve() -> None:
    """Sert la page de vote en local ; le tunnel Cloudflare la publie derrière Access."""
    _logging()
    settings = _settings()
    team, aud = settings.cf_access_team_domain, settings.cf_access_aud
    if not team or not aud:
        _fail("CF_ACCESS_TEAM_DOMAIN et CF_ACCESS_AUD doivent être définis dans .env", 2)
    if "/" in team or not team.endswith(".cloudflareaccess.com"):
        _fail("CF_ACCESS_TEAM_DOMAIN attend la forme <équipe>.cloudflareaccess.com", 2)
    web = create_app(settings.data_dir / "radio.db", _deezer(), AccessVerifier(team, aud))
    uvicorn.run(web, host=settings.votes_host, port=settings.votes_port)


@app.command("votes-remind")
def votes_remind() -> None:
    """Envoie le rappel WhatsApp : titres en attente, examen, alertes."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    if settings.whatsapp_phone is None or settings.callmebot_apikey is None:
        _fail("WHATSAPP_PHONE et CALLMEBOT_APIKEY doivent être définis dans .env", 2)
    if not settings.votes_url:
        _fail("RADIO_VOTES_URL doit être défini dans .env", 2)
    text = _reminder(
        _status(settings, editorial), editorial, settings.votes_url, _page_ok(settings)
    )
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
