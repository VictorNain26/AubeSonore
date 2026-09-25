"""Entraînement (spec §5.4, §7.3, §8).

Sans assez de votes de leçon (« oui » ET « non ») : négatifs faibles maintenus au poids le plus
fort de la grille, ni ablation ni seuil ; le modèle est rapporté mais ne peut pas être promu.

Avec assez de votes, tout se juge sur les votes de leçon notés hors pli :
- le poids des négatifs faibles ;
- l'ablation : un groupe de signaux qui n'aide pas est retiré du modèle ;
- le seuil (précision visée).
"""

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from radio.core.config import ModelConfig
from radio.model.dataset import LIBRARY, VOTE_NO, VOTE_YES, Labels, weights
from radio.model.evaluate import (
    YesRate,
    acceptance,
    auc,
    precision_at_rate,
    threshold_for_precision,
    yes_rate,
)
from radio.model.stack import GROUPS, Stack, features, fit_stack, nested_scores
from radio.signals.table import SignalTable

WEAK_WEIGHTS = (0.0, 0.1, 0.3)


@dataclass(frozen=True)
class Ablation:
    removed: str
    auc: float | None
    precision: float | None
    kept: bool


@dataclass(frozen=True)
class TrainResult:
    stack: Stack
    weak_weight: float
    counts: dict[str, int]
    missing_votes: dict[str, int]
    weak_weight_aucs: dict[float, float | None]
    ablation: list[Ablation]
    threshold: float | None
    lesson_auc: float | None
    lesson_yes: YesRate | None
    lesson_acceptance: float | None
    library_acceptance: float | None
    library_acceptance_complete: float | None
    n_library_complete: int


def _worse(x: float | None, ref: float | None) -> bool:
    return x is not None and ref is not None and x < ref


def _rank(a: float | None) -> float:
    return -1.0 if a is None else a


def train_model(table: SignalTable, labels: Labels, cfg: ModelConfig) -> TrainResult:
    ds = labels.train
    counts = ds.counts()
    missing = {
        "oui": max(0, cfg.min_votes_per_class - counts["vote_yes"]),
        "non": max(0, cfg.min_votes_per_class - counts["vote_no"]),
    }
    enough = not any(missing.values())
    votes = np.isin(ds.categories, [VOTE_YES, VOTE_NO])
    yv = ds.labels[votes]

    grid = WEAK_WEIGHTS if enough else (WEAK_WEIGHTS[-1],)
    sets: list[tuple[str, ...]] = [GROUPS]
    if enough:
        sets += [tuple(g for g in GROUPS if g != r) for r in GROUPS]
    runs = {lam: nested_scores(table, ds, weights(ds, lam), cfg.folds, sets) for lam in grid}
    aucs = {lam: auc(yv, runs[lam][0][votes]) for lam in grid}
    # À égalité (ou sans AUC), le premier de la grille : le moins de négatifs faibles.
    lam = max(grid, key=lambda x: _rank(aucs[x]))
    by_set = dict(zip(sets, runs[lam], strict=True))

    ablation: list[Ablation] = []
    kept: tuple[str, ...] = GROUPS
    if enough:
        full = by_set[GROUPS][votes]
        full_thr = threshold_for_precision(yv, full, cfg.target_precision)
        rate = None if full_thr is None else acceptance(full, full_thr)
        full_auc = auc(yv, full)
        full_prec = None if rate is None else precision_at_rate(yv, full, rate)
        for removed in GROUPS:
            s = by_set[tuple(g for g in GROUPS if g != removed)][votes]
            a = auc(yv, s)
            p = None if rate is None else precision_at_rate(yv, s, rate)
            ablation.append(Ablation(removed, a, p, _worse(a, full_auc) or _worse(p, full_prec)))
        kept = tuple(x.removed for x in ablation if x.kept)

    w = weights(ds, lam)
    scores = by_set[kept] if kept in by_set else nested_scores(table, ds, w, cfg.folds, [kept])[0]
    threshold = threshold_for_precision(yv, scores[votes], cfg.target_precision) if enough else None
    lib = ds.categories == LIBRARY
    complete = lib & ~np.isnan(features(table, ds.rows, kept)).any(axis=1)

    def at(mask: npt.NDArray[np.bool_]) -> float | None:
        return None if threshold is None else acceptance(scores[mask], threshold)

    return TrainResult(
        stack=fit_stack(table, ds, w, cfg.folds, kept),
        weak_weight=lam,
        counts=counts,
        missing_votes=missing,
        weak_weight_aucs=aucs,
        ablation=ablation,
        threshold=threshold,
        lesson_auc=auc(yv, scores[votes]),
        lesson_yes=None if threshold is None else yes_rate(yv, scores[votes], threshold),
        lesson_acceptance=at(votes),
        library_acceptance=at(lib),
        library_acceptance_complete=at(complete),
        n_library_complete=int(complete.sum()),
    )
