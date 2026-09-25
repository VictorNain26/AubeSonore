from pathlib import Path

from radio.core.config import ModelConfig
from radio.model.dataset import build_labels
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
