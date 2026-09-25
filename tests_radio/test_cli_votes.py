from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Editorial, Settings
from radio.model.evaluate import YesRate
from radio.model.promote import ExamMetrics
from radio.notify.whatsapp import WhatsAppError
from radio.votes.status import Status
from tests_radio.model_factory import make_model_db, serve_scores

runner = CliRunner()
KEY = "cle-secrete-123"
PHONE = "+33600000000"


def _settings(tmp_path: Path, **extra: Any) -> Settings:
    cfg = tmp_path / "config"
    cfg.mkdir(exist_ok=True)
    (cfg / "editorial.toml").write_text("")
    return Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data", RADIO_CONFIG_DIR=cfg, **extra)


@pytest.fixture
def full(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    s = _settings(
        tmp_path,
        cf_access_team_domain="aube.cloudflareaccess.com",
        cf_access_aud="aud-tag",
        whatsapp_phone=PHONE,
        callmebot_apikey=KEY,
        RADIO_VOTES_URL="https://votes.example.org",
    )
    monkeypatch.setattr(cli, "_settings", lambda: s)
    return tmp_path


def _st(**kw: Any) -> Status:
    base: dict[str, Any] = {
        "model_id": 3,
        "exam": ExamMetrics(60, 0.8, YesRate(48, 40, 0.70, 0.91)),
        "last_exam_vote": "2026-09-20T10:00:00+00:00",
        "pending": 20,
        "last_selection": "2026-09-27T03:40:00+00:00",
        "recent_votes": 12,
        "batch": (7, 400, 60),
    }
    base.update(kw)
    return Status(**base)


def test_reminder_counts_waiting_titles_and_raises_alerts() -> None:
    ed = Editorial()
    text = cli._reminder(_st(), ed, "https://votes.example.org", page_ok=True)
    assert text.startswith("AubeSonore : 20 titres à écouter — https://votes.example.org")
    assert "Examen (modèle n°3) : 60 votes, AUC 0,800, taux de oui 83,3 %" in text
    assert "ALERTE : taux de oui sous 90,0 %" in text
    assert "Dernier vote d'examen : 2026-09-20T10:00:00+00:00" in text
    assert "injoignable" not in text
    quiet = _st(
        pending=0,
        recent_votes=0,
        exam=ExamMetrics(60, 0.9, YesRate(50, 47, 0.84, 0.98)),
        batch=(7, 400, 20),
    )
    text = cli._reminder(quiet, ed, "https://votes.example.org", page_ok=False)
    assert text.startswith("AubeSonore : aucun titre en attente de vote")
    assert "Page de vote injoignable" in text
    assert "Votes des 7 derniers jours : 0 — pas de réentraînement" in text
    assert "ALERTE : taux de oui" not in text
    assert "Dernière fournée (passe n°7) : 5,0 % acceptés — ALERTE : sous 10,0 %" in text
    assert "Aucun modèle en service" in cli._reminder(_st(model_id=None, exam=None), ed, "u", True)


def test_votes_select_draws_then_waits(full: Path) -> None:
    conn = make_model_db(full / "data")
    serve_scores(conn)
    conn.close()
    res = runner.invoke(cli.app, ["votes-select"])
    assert res.exit_code == 0, res.output
    assert (
        "Sélection n°1 (modèle n°1, fournée n°2) : 10 d'examen parmi 24 retenus, 10 de leçon"
        in res.output
    )
    res = runner.invoke(cli.app, ["votes-select"])
    assert res.exit_code == 0, res.output
    assert "20 titres encore en attente de vote : pas de nouvelle sélection" in res.output


def test_votes_select_without_model_fails(full: Path) -> None:
    make_model_db(full / "data").close()
    res = runner.invoke(cli.app, ["votes-select"])
    assert res.exit_code == 1
    assert "Aucun modèle en service" in res.output


def test_votes_serve_requires_access_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli, "_settings", lambda: _settings(tmp_path))
    res = runner.invoke(cli.app, ["votes-serve"])
    assert res.exit_code == 2
    assert "CF_ACCESS_TEAM_DOMAIN et CF_ACCESS_AUD" in res.output
    bad = _settings(tmp_path, cf_access_team_domain="https://aube.fr", cf_access_aud="a")
    monkeypatch.setattr(cli, "_settings", lambda: bad)
    res = runner.invoke(cli.app, ["votes-serve"])
    assert res.exit_code == 2
    assert "<équipe>.cloudflareaccess.com" in res.output


def test_votes_serve_runs_uvicorn_on_loopback(full: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    def fake_run(app: Any, host: str, port: int) -> None:
        seen.update(app=app, host=host, port=port)

    monkeypatch.setattr(cli.uvicorn, "run", fake_run)
    res = runner.invoke(cli.app, ["votes-serve"])
    assert res.exit_code == 0, res.output
    assert (seen["host"], seen["port"]) == ("127.0.0.1", 8040)
    assert seen["app"].title == "FastAPI"


def test_votes_remind_sends_the_status(full: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    make_model_db(full / "data").close()
    sent: list[tuple[str, str, str]] = []
    monkeypatch.setattr(cli, "send_whatsapp", lambda p, k, t: sent.append((p, k, t)))
    monkeypatch.setattr(cli, "_page_ok", lambda s: True)
    res = runner.invoke(cli.app, ["votes-remind"])
    assert res.exit_code == 0, res.output
    assert len(sent) == 1
    phone, key, text = sent[0]
    assert (phone, key) == (PHONE, KEY)
    assert text.startswith("AubeSonore : aucun titre en attente de vote")
    assert "Aucun modèle en service" in text
    assert "Rappel WhatsApp envoyé" in res.output
    assert KEY not in res.output and PHONE not in res.output


def test_votes_remind_failure_is_visible(full: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    make_model_db(full / "data").close()

    def refuse(p: str, k: str, t: str) -> None:
        raise WhatsAppError("HTTP 210 : quota CallMeBot épuisé (16 messages / 4 h)")

    monkeypatch.setattr(cli, "send_whatsapp", refuse)
    monkeypatch.setattr(cli, "_page_ok", lambda s: True)
    res = runner.invoke(cli.app, ["votes-remind"])
    assert res.exit_code == 1
    assert "Rappel WhatsApp non envoyé : HTTP 210" in res.output
    assert KEY not in res.output


def test_votes_remind_requires_its_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli, "_settings", lambda: _settings(tmp_path))
    res = runner.invoke(cli.app, ["votes-remind"])
    assert res.exit_code == 2
    assert "WHATSAPP_PHONE et CALLMEBOT_APIKEY" in res.output


def test_report_prints_the_status(full: Path) -> None:
    make_model_db(full / "data").close()
    res = runner.invoke(cli.app, ["report"])
    assert res.exit_code == 0, res.output
    assert "Aucun modèle en service" in res.output
    assert "Titres en attente de vote : 0 (dernière sélection : aucune)" in res.output
