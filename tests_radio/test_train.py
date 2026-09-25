from pathlib import Path

import numpy as np
import pytest

from radio.core.config import ModelConfig
from radio.model.dataset import LIBRARY, VOTE_NO, VOTE_YES, build_labels
from radio.model.evaluate import acceptance, threshold_for_precision
from radio.model.stack import GROUPS
from radio.model.train import WEAK_WEIGHTS, train_model
from radio.signals.table import load_signals
from tests_radio.model_factory import add_vote, make_model_db

CFG = ModelConfig(min_votes_per_class=4, folds=3)


def test_cold_start_without_votes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    table = load_signals(conn, 10)
    r = train_model(table, build_labels(conn, table, 60), CFG)
    assert r.missing_votes == {"oui": 4, "non": 4}
    assert r.weak_weight == WEAK_WEIGHTS[-1]
    assert list(r.weak_weight_aucs) == [WEAK_WEIGHTS[-1]]
    assert r.ablation == []
    assert r.threshold is None and r.lesson_yes is None and r.library_acceptance is None
    assert r.stack.groups == GROUPS


def test_training_with_enough_votes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    for a in range(6):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    table = load_signals(conn, 10)
    r = train_model(table, build_labels(conn, table, 60), CFG)
    assert r.missing_votes == {"oui": 0, "non": 0}
    assert list(r.weak_weight_aucs) == list(WEAK_WEIGHTS)
    assert r.weak_weight in WEAK_WEIGHTS
    assert [a.removed for a in r.ablation] == list(GROUPS)
    assert r.stack.groups == tuple(a.removed for a in r.ablation if a.kept)
    assert r.threshold is not None
    assert r.lesson_auc is not None and r.lesson_auc > 0.8
    assert r.lesson_yes is not None and r.lesson_yes.rate >= 0.9
    assert r.library_acceptance is not None and r.library_acceptance > 0.5
    assert 0 <= r.n_library_complete <= r.counts["library"]


def test_threshold_and_guardrail_use_out_of_fold_scores(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    conn = make_model_db(tmp_path)
    for a in range(6):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    table = load_signals(conn, 10)
    labels = build_labels(conn, table, 60)
    ds = labels.train
    votes = np.isin(ds.categories, [VOTE_YES, VOTE_NO])
    fixed = np.random.default_rng(1).random(len(ds.labels))
    # garantit un seuil, avec des notes distinctes de ce qu'ajusterait le modèle
    fixed[votes & (ds.labels == 1)] += 1.0

    def fake(table, ds, w, folds, sets):  # type: ignore[no-untyped-def]
        return [fixed.copy() for _ in sets]

    monkeypatch.setattr("radio.model.train.nested_scores", fake)

    r = train_model(table, labels, CFG)

    thr = threshold_for_precision(ds.labels[votes], fixed[votes], CFG.target_precision)
    assert thr is not None
    assert r.threshold == thr
    lib = ds.categories == LIBRARY
    assert r.library_acceptance == acceptance(fixed[lib], thr)
