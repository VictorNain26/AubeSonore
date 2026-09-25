import dataclasses
import json
from pathlib import Path
from typing import cast

import joblib
import numpy as np
import pytest

from radio.core.config import ModelConfig
from radio.model.dataset import ExamSet, build_labels
from radio.model.evaluate import YesRate
from radio.model.promote import (
    Decision,
    ExamMetrics,
    Serving,
    batch_acceptance,
    current_model,
    decide,
    exam_metrics,
    save_model,
    write_scores,
)
from radio.model.stack import Stack
from radio.model.train import TrainResult, train_model
from radio.signals.table import SignalTable, load_signals
from tests_radio.model_factory import add_vote, make_model_db

CFG = ModelConfig(min_votes_per_class=4, folds=3)
BASE = TrainResult(
    stack=cast(Stack, None),
    weak_weight=0.1,
    counts={},
    missing_votes={"oui": 0, "non": 0},
    weak_weight_aucs={},
    ablation=[],
    threshold=0.5,
    lesson_auc=0.9,
    lesson_yes=None,
    lesson_acceptance=0.4,
    library_acceptance=0.9,
    library_acceptance_complete=0.85,
    n_library_complete=10,
)
GOOD = ExamMetrics(20, 0.8, YesRate(10, 9, 0.6, 0.98))


def test_first_model_is_promoted() -> None:
    assert decide(BASE, GOOD, None, CFG) == Decision(True, ["premier modèle"])


def test_missing_votes_block_promotion() -> None:
    r = dataclasses.replace(BASE, threshold=None, missing_votes={"oui": 3, "non": 10})
    d = decide(r, GOOD, None, CFG)
    assert not d.promoted
    assert d.reasons == ["votes de leçon insuffisants : il manque 3 « oui » et 10 « non »"]


def test_unreachable_precision_blocks_promotion() -> None:
    d = decide(dataclasses.replace(BASE, threshold=None), GOOD, None, CFG)
    assert d.reasons == ["précision 90,0 % inatteignable sur les votes de leçon"]


def test_guard_rail_blocks_promotion() -> None:
    d = decide(dataclasses.replace(BASE, library_acceptance_complete=0.7), GOOD, None, CFG)
    assert d == Decision(
        False, ["garde-fou : bibliothèque acceptée (signaux complets) 70,0 % < 80,0 %"]
    )


def test_a_worse_model_is_not_promoted() -> None:
    worse = ExamMetrics(20, 0.7, YesRate(10, 8, 0.5, 0.95))
    d = decide(BASE, worse, GOOD, CFG)
    assert not d.promoted
    assert d.reasons == [
        "AUC d'examen 0,700 < 0,800 (modèle en service)",
        "taux de oui d'examen 80,0 % < 90,0 % (modèle en service)",
    ]


def test_comparison_needs_exam_votes() -> None:
    d = decide(BASE, ExamMetrics(0, None, None), GOOD, CFG)
    assert not d.promoted
    assert d.reasons[0].startswith("comparaison impossible sur l'examen (0 votes")


def test_as_good_as_current_is_promoted() -> None:
    d = decide(BASE, GOOD, GOOD, CFG)
    assert d == Decision(True, ["au moins aussi bon que le modèle en service sur l'examen"])


def trained(tmp_path: Path):  # type: ignore[no-untyped-def]
    conn = make_model_db(tmp_path)
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    add_vote(conn, 200600, "exam", "oui")
    add_vote(conn, 300600, "exam", "non")
    table = load_signals(conn, 10)
    labels = build_labels(conn, table, 60)
    return conn, table, labels, train_model(table, labels, CFG)


def test_history_and_serving_model(tmp_path: Path) -> None:
    conn, table, labels, r = trained(tmp_path)
    assert r.threshold is not None
    exam = exam_metrics(r.stack, r.threshold, table, labels.exam)
    assert exam.n == 2 and exam.auc == 1.0
    models = tmp_path / "models"
    first = save_model(conn, models, r, exam, Decision(False, ["x"]), CFG, "d1")
    assert current_model(conn, models) is None
    second = save_model(conn, models, r, exam, Decision(True, ["premier modèle"]), CFG, "d2")
    assert (first, second) == (1, 2)
    serving = current_model(conn, models)
    assert serving is not None and serving.model_id == 2
    assert serving.threshold == r.threshold
    rows = labels.exam.rows
    assert np.allclose(serving.stack.predict(table, rows), r.stack.predict(table, rows))
    row = conn.execute("SELECT * FROM models WHERE model_id = 2").fetchone()
    assert row["file"] == "modele-0002.joblib" and row["promoted"] == 1
    assert json.loads(row["params"])["weak_weight"] == r.weak_weight
    assert json.loads(row["metrics"])["exam"]["auc"] == 1.0


def test_exam_metrics_without_exam() -> None:
    empty = ExamSet(np.zeros(0, dtype=np.int64), np.zeros(0, dtype=np.int64), None)
    got = exam_metrics(cast(Stack, None), 0.5, cast(SignalTable, None), empty)
    assert got == ExamMetrics(0, None, None)


def test_write_scores_and_batch_acceptance(tmp_path: Path) -> None:
    conn, table, _, r = trained(tmp_path)
    assert r.threshold is not None
    conn.execute("INSERT INTO discover_runs VALUES (1, 'd', 'd', 'done'), (2, 'd', 'd', 'done')")
    conn.execute("INSERT INTO candidates VALUES (200000, 1, 1000, 2000)")
    conn.execute("INSERT INTO candidates VALUES (200700, 2, 1000, 2007)")
    conn.execute("INSERT INTO candidates VALUES (300700, 2, 1000, 3007)")
    conn.commit()
    model_id = save_model(
        conn, tmp_path / "m", r, ExamMetrics(0, None, None), Decision(True, ["p"]), CFG, "d"
    )
    n, accepted = write_scores(conn, Serving(model_id, r.stack, r.threshold), table)
    n_candidates = conn.execute(
        "SELECT COUNT(*) FROM tracks t JOIN track_measures m USING (deezer_track_id) "
        "WHERE t.origin = 'candidate' AND m.status = 'ok'"
    ).fetchone()[0]
    assert n == n_candidates
    assert tuple(conn.execute("SELECT COUNT(*), SUM(accepted) FROM scores").fetchone()) == (
        n,
        accepted,
    )
    assert batch_acceptance(conn) == (
        2,
        2,
        conn.execute(
            "SELECT SUM(accepted) FROM scores WHERE deezer_track_id IN (200700, 300700)"
        ).fetchone()[0],
    )
    write_scores(conn, Serving(model_id, r.stack, r.threshold), table)
    assert conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0] == n


def test_current_model_file_must_be_a_stack(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=2, per_artist=1)
    models = tmp_path / "models"
    models.mkdir()
    joblib.dump({"pas": "un modèle"}, models / "modele-0001.joblib")
    conn.execute(
        "INSERT INTO models VALUES (1, 'd', 'modele-0001.joblib', 0.5, 1, 'v', '{}', '{}')"
    )
    conn.commit()
    with pytest.raises(ValueError, match="n'est pas un modèle"):
        current_model(conn, models)
