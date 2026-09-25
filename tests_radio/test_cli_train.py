import dataclasses
import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.core.db import connect
from radio.signals.table import load_signals as real_load_signals
from tests_radio.model_factory import add_vote, make_model_db

runner = CliRunner()


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text("[model]\nmin_votes_per_class = 4\nfolds = 3\n")
    settings = Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data", RADIO_CONFIG_DIR=cfg)
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    return tmp_path


def test_cold_start_trains_but_does_not_promote(env: Path) -> None:
    make_model_db(env / "data").close()
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    out = res.output
    assert "Exemples : bibliothèque 48, oui 0, non 0, négatifs faibles 48" in out
    assert "Valeurs absentes (candidats) : " in out
    assert "Votes de leçon insuffisants : il manque 4 « oui » et 4 « non »" in out
    assert "Modèle n°1 : non promu — votes de leçon insuffisants" in out
    assert "Aucun modèle en service : candidats non notés" in out
    assert (env / "data" / "models" / "modele-0001.joblib").exists()


def test_train_promotes_then_compares(env: Path) -> None:
    conn = make_model_db(env / "data")
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    add_vote(conn, 200600, "exam", "oui")
    add_vote(conn, 300600, "exam", "non")
    add_vote(conn, 200700, "exam", "oui")
    conn.close()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert "Modèle n°1 : promu — premier modèle" in res.output
    assert "Signaux gardés : son" in res.output
    assert "Examen (nouveau modèle) : 3 votes, AUC 1,000" in res.output
    assert "Candidats notés par le modèle n°1 : " in res.output

    conn = connect(env / "data" / "radio.db")
    add_vote(conn, 200500, "lesson", "oui")
    conn.close()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert "Examen (modèle en service) : 3 votes" in res.output
    assert "Modèle n°2 : promu — au moins aussi bon que le modèle en service" in res.output


def test_train_without_negatives_exits_1(env: Path) -> None:
    conn = make_model_db(env / "data", n_artists=4, per_artist=2)
    conn.execute("DELETE FROM track_measures WHERE deezer_track_id >= 400000")
    conn.commit()
    conn.close()
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 1
    assert "Exemples insuffisants" in res.output


def test_signals_changed_during_load_fails(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    conn = make_model_db(env / "data")
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    conn.close()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output  # premier modèle, mis en service

    conn = connect(env / "data" / "radio.db")
    add_vote(conn, 200500, "lesson", "oui")
    conn.close()

    db = env / "data" / "radio.db"
    before = connect(db).execute("SELECT COUNT(*) FROM models").fetchone()[0]

    def fake_load_signals(conn, size, vocabulary=None):  # type: ignore[no-untyped-def]
        table = real_load_signals(conn, size, vocabulary=vocabulary)
        if vocabulary is None:
            return table
        # Simule un `radio signals` qui commite entre les deux chargements de `radio train`.
        return dataclasses.replace(table, track_ids=table.track_ids + 1)

    monkeypatch.setattr(cli, "load_signals", fake_load_signals)

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 1
    assert "Signaux modifiés" in res.output

    after = connect(db).execute("SELECT COUNT(*) FROM models").fetchone()[0]
    assert after == before


def test_unreadable_serving_model_exits_2(env: Path) -> None:
    conn = make_model_db(env / "data", n_artists=4, per_artist=2)
    conn.execute(
        "INSERT INTO models VALUES (1, 'd', 'modele-0001.joblib', 0.5, 1, 'v', ?, '{}')",
        (json.dumps({}),),
    )
    conn.commit()
    conn.close()
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 2
    assert "Modèle en service illisible : FileNotFoundError" in res.output


def test_no_retraining_without_new_votes_but_candidates_rescored(env: Path) -> None:
    conn = make_model_db(env / "data")
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    conn.close()
    assert runner.invoke(cli.app, ["train"]).exit_code == 0
    conn = connect(env / "data" / "radio.db")
    conn.execute("DELETE FROM scores")
    conn.commit()
    conn.close()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert (
        "Aucun nouveau vote depuis le dernier entraînement (10 votes) : pas de réentraînement"
        in res.output
    )
    assert "Candidats notés par le modèle n°1 : " in res.output
    conn = connect(env / "data" / "radio.db")
    assert conn.execute("SELECT COUNT(*) FROM models").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0] > 0
    conn.close()


def test_vote_changed_in_place_triggers_retraining(env: Path) -> None:
    conn = make_model_db(env / "data")
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    conn.close()
    assert runner.invoke(cli.app, ["train"]).exit_code == 0

    # Réimport d'un banc corrigé : même date, valeur changée.
    conn = connect(env / "data" / "radio.db")
    conn.execute("UPDATE votes SET vote = 'non' WHERE deezer_track_id = 200000")
    conn.commit()
    conn.close()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert "Aucun nouveau vote" not in res.output
    conn = connect(env / "data" / "radio.db")
    assert conn.execute("SELECT COUNT(*) FROM models").fetchone()[0] == 2
    conn.close()


def test_unreadable_serving_model_on_skip_path_exits_2(env: Path) -> None:
    conn = make_model_db(env / "data")
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    conn.close()
    assert runner.invoke(cli.app, ["train"]).exit_code == 0

    (env / "data" / "models" / "modele-0001.joblib").unlink()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 2
    assert "Modèle en service illisible : FileNotFoundError" in res.output


def test_cold_start_without_votes_trains_once(env: Path) -> None:
    make_model_db(env / "data").close()
    assert runner.invoke(cli.app, ["train"]).exit_code == 0
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert "Aucun nouveau vote depuis le dernier entraînement (0 votes)" in res.output
    assert "Aucun modèle en service : candidats non notés" in res.output
    conn = connect(env / "data" / "radio.db")
    assert conn.execute("SELECT COUNT(*) FROM models").fetchone()[0] == 1
    conn.close()
