"""Mesures du modèle (spec §5.4, §7) : AUC, seuil de précision, précision à taux d'acceptation
fixé, taux de oui avec intervalle de Wilson à 95 %."""

import math
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from scipy.stats import binomtest
from sklearn.metrics import roc_auc_score

Floats = npt.NDArray[np.float64]
Ints = npt.NDArray[np.int64]


def auc(labels: Ints, scores: Floats) -> float | None:
    """AUC ROC ; None s'il manque l'une des deux classes."""
    if len(np.unique(labels)) < 2:
        return None
    return float(roc_auc_score(labels, scores))


def threshold_for_precision(labels: Ints, scores: Floats, target: float) -> float | None:
    """Plus petit seuil dont la précision (part de oui parmi les notes ≥ seuil) atteint la cible,
    donc le plus grand taux d'acceptation possible. None si aucun seuil n'y arrive."""
    if len(scores) == 0:
        return None
    order = np.argsort(-scores, kind="stable")
    s, lab = scores[order], labels[order]
    precision = np.cumsum(lab) / np.arange(1, len(s) + 1)
    # Seules comptent les fins de paliers : à égalité de note, tous sont acceptés ensemble.
    block_end = np.append(s[1:] != s[:-1], True)
    ok = np.flatnonzero(block_end & (precision >= target))
    return float(s[ok[-1]]) if len(ok) else None


def precision_at_rate(labels: Ints, scores: Floats, rate: float) -> float | None:
    """Précision parmi les ⌈rate x n⌉ meilleures notes : compare deux modèles à taux égal."""
    k = math.ceil(rate * len(scores))
    if k == 0:
        return None
    top = np.argsort(-scores, kind="stable")[:k]
    return float(labels[top].mean())


def acceptance(scores: Floats, threshold: float) -> float | None:
    return float((scores >= threshold).mean()) if len(scores) else None


@dataclass(frozen=True)
class YesRate:
    n: int
    yes: int
    low: float
    high: float

    @property
    def rate(self) -> float:
        return self.yes / self.n


def yes_rate(labels: Ints, scores: Floats, threshold: float) -> YesRate | None:
    """Taux de oui parmi les titres acceptés (note ≥ seuil), intervalle de Wilson à 95 %."""
    accepted = labels[scores >= threshold]
    n, yes = len(accepted), int(accepted.sum())
    if n == 0:
        return None
    ci = binomtest(yes, n).proportion_ci(confidence_level=0.95, method="wilson")
    return YesRate(n, yes, float(ci.low), float(ci.high))
