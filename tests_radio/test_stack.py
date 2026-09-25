from pathlib import Path

import numpy as np
import pytest

from radio.model.dataset import build_labels, weights
from radio.model.evaluate import auc
from radio.model.stack import GROUPS, features, fit_stack, nested_scores, splits
from radio.signals.table import load_signals
from tests_radio.model_factory import make_model_db


def setup(tmp_path: Path):  # type: ignore[no-untyped-def]
    conn = make_model_db(tmp_path)
    table = load_signals(conn, 10)
    ds = build_labels(conn, table, 60).train
    return table, ds, weights(ds, 0.3)


def test_features_columns(tmp_path: Path) -> None:
    table, ds, _ = setup(tmp_path)
    v = len(table.vocabulary)
    assert features(table, ds.rows, GROUPS).shape == (len(ds.rows), 1 + 2 + v + 2)
    assert features(table, ds.rows, ("culture",)).shape == (len(ds.rows), v)
    assert features(table, ds.rows, ()).shape == (len(ds.rows), 0)


def test_splits_never_share_an_artist(tmp_path: Path) -> None:
    _, ds, _ = setup(tmp_path)
    folds = splits(ds.categories, ds.groups, 3)
    assert len(folds) == 3
    seen = np.concatenate([test for _, test in folds])
    assert sorted(seen.tolist()) == list(range(len(ds.rows)))
    for train, test in folds:
        assert not set(ds.groups[train].tolist()) & set(ds.groups[test].tolist())


def test_fit_stack_learns_the_taste(tmp_path: Path) -> None:
    table, ds, w = setup(tmp_path)
    stack = fit_stack(table, ds, w, 3, GROUPS)
    ids = table.track_ids
    liked = np.flatnonzero((ids >= 200000) & (ids < 300000))
    disliked = np.flatnonzero((ids >= 300000) & (ids < 400000))
    assert stack.predict(table, liked).mean() > stack.predict(table, disliked).mean() + 0.5
    assert stack.vocabulary == table.vocabulary


def test_predict_refuses_another_vocabulary(tmp_path: Path) -> None:
    table, ds, w = setup(tmp_path)
    stack = fit_stack(table, ds, w, 3, GROUPS)
    conn = make_model_db(tmp_path / "autre")
    other = load_signals(conn, 10, vocabulary=["jazz"])
    with pytest.raises(ValueError, match="vocabulaire"):
        stack.predict(other, np.arange(3))


def test_nested_scores(tmp_path: Path) -> None:
    table, ds, w = setup(tmp_path)
    full, no_culture = nested_scores(table, ds, w, 3, [GROUPS, ("rang du titre",)])
    for s in (full, no_culture):
        assert s.shape == (len(ds.rows),)
        assert ((s >= 0) & (s <= 1)).all()
        got = auc(ds.labels, s)
        assert got is not None and got > 0.9
