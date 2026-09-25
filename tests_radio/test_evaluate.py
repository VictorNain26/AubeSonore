import numpy as np
import pytest

from radio.model.evaluate import (
    acceptance,
    auc,
    precision_at_rate,
    threshold_for_precision,
    yes_rate,
)

L = np.array([1, 1, 0, 1, 0, 0], dtype=np.int64)
S = np.array([0.9, 0.8, 0.7, 0.6, 0.5, 0.1])


def test_auc() -> None:
    assert auc(L, S) == pytest.approx(8 / 9)
    assert auc(np.ones(3, dtype=np.int64), S[:3]) is None


def test_threshold_for_precision_takes_the_widest_acceptance() -> None:
    # Précisions cumulées : 1, 1, 2/3, 3/4, 3/5, 1/2.
    assert threshold_for_precision(L, S, 0.75) == 0.6
    assert threshold_for_precision(L, S, 0.9) == 0.8
    assert threshold_for_precision(np.zeros(3, dtype=np.int64), S[:3], 0.9) is None
    assert threshold_for_precision(L[:0], S[:0], 0.9) is None


def test_threshold_respects_ties() -> None:
    labels = np.array([1, 0, 1], dtype=np.int64)
    scores = np.array([0.9, 0.9, 0.2])
    # 0,9 accepte ensemble le « oui » et le « non » : précision 1/2, jamais 1.
    assert threshold_for_precision(labels, scores, 0.9) is None


def test_precision_at_rate() -> None:
    assert precision_at_rate(L, S, 0.5) == pytest.approx(2 / 3)
    assert precision_at_rate(L, S, 0.0) is None


def test_acceptance() -> None:
    assert acceptance(S, 0.6) == pytest.approx(4 / 6)
    assert acceptance(S[:0], 0.6) is None


def test_yes_rate_with_wilson_interval() -> None:
    labels = np.array([1] * 9 + [0] + [0] * 5, dtype=np.int64)
    scores = np.array([0.9] * 10 + [0.1] * 5)
    y = yes_rate(labels, scores, 0.5)
    assert y is not None
    assert (y.n, y.yes, y.rate) == (10, 9, 0.9)
    assert y.low == pytest.approx(0.59585, abs=1e-5)
    assert y.high == pytest.approx(0.98212, abs=1e-5)
    assert yes_rate(labels, scores, 0.95) is None
