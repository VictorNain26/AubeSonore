"""Modèle empilé (spec §5.4) : note audio, puis décision.

- Note audio : régression logistique sur l'empreinte standardisée.
- Décision : HistGradientBoosting sur la note audio et les signaux gardés ; il traite les
  valeurs absentes nativement.

Plis groupés par artiste (nom normalisé) et stratifiés par catégorie d'exemple : un artiste n'est
jamais à la fois dans l'apprentissage et le contrôle, et chaque pli reçoit sa part de votes. La
note audio du second étage est calculée hors pli ; l'évaluation est imbriquée.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
import numpy.typing as npt
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from radio.model.dataset import Dataset
from radio.signals.table import SignalTable

Floats = npt.NDArray[np.float64]
Ints = npt.NDArray[np.int64]

# Le rang du titre est séparé des signaux d'artiste : l'ablation le juge seul (revue v3-2, point 1).
GROUPS = ("rang du titre", "popularité de l'artiste", "culture", "proximité")
SEED = 0


def features(table: SignalTable, rows: Ints, groups: tuple[str, ...]) -> Floats:
    parts: list[Floats] = [np.empty((len(rows), 0))]
    if "rang du titre" in groups:
        parts.append(table.popularity[rows, :1])
    if "popularité de l'artiste" in groups:
        parts.append(table.popularity[rows, 1:])
    if "culture" in groups:
        parts.append(table.culture[rows])
    if "proximité" in groups:
        parts.append(table.proximity[rows])
    return np.hstack(parts)


def splits(strata: Ints, groups: Ints, folds: int) -> list[tuple[Ints, Ints]]:
    cv = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=SEED)
    return [
        (np.asarray(tr, dtype=np.int64), np.asarray(te, dtype=np.int64))
        for tr, te in cv.split(np.zeros(len(strata)), strata, groups)
    ]


def _audio_model() -> Any:
    return make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))


def _decision_model() -> Any:
    return HistGradientBoostingClassifier(early_stopping=False, random_state=SEED)


def _fit_decision(x: Floats, y: Ints, w: Floats) -> Any:
    """Ajuste la décision. Une colonne entièrement absente à l'apprentissage (aucun titre du pli
    n'a la mesure, ex. proximité Last.fm sur un petit pli) fait planter le calcul des seuils de
    sklearn : `_find_binning_thresholds` ne garde que le cas à une seule valeur distincte, pas
    celui à zéro valeur non absente (vérifié sur sklearn 1.9.1, bug non corrigé).
    Elle est neutralisée à 0 pour l'ajustement seulement : sans écart, HistGradientBoosting n'y
    apprend de toute façon aucune coupure. La prédiction, elle, reçoit les vraies absences —
    `predict_proba` les gère nativement, seul le calcul des seuils à l'ajustement plante."""
    all_missing = np.all(np.isnan(x), axis=0)
    xf = np.where(all_missing, 0.0, x) if all_missing.any() else x
    return _decision_model().fit(xf, y, sample_weight=w)


def _proba(model: Any, x: npt.NDArray[np.floating[Any]]) -> Floats:
    return np.asarray(model.predict_proba(x)[:, 1], dtype=np.float64)


@dataclass(frozen=True)
class Stack:
    audio: Any
    decision: Any
    groups: tuple[str, ...]
    vocabulary: list[str]

    def predict(self, table: SignalTable, rows: Ints) -> Floats:
        if table.vocabulary != self.vocabulary:
            raise ValueError("vocabulaire de culture différent de celui du modèle")
        a = _proba(self.audio, table.audio[rows])
        return _proba(self.decision, np.column_stack([a, features(table, rows, self.groups)]))


def _fit_audio(
    x: npt.NDArray[np.float32], y: Ints, w: Floats, strata: Ints, groups: Ints, folds: int
) -> tuple[Any, Floats]:
    """Modèle audio ajusté sur tout, et sa note hors pli pour le second étage."""
    oof = cross_val_predict(
        _audio_model(),
        x,
        y,
        cv=splits(strata, groups, folds),
        method="predict_proba",
        params={"logisticregression__sample_weight": w},
    )
    full = _audio_model().fit(x, y, logisticregression__sample_weight=w)
    return full, np.asarray(oof[:, 1], dtype=np.float64)


def fit_stack(
    table: SignalTable, ds: Dataset, w: Floats, folds: int, groups: tuple[str, ...]
) -> Stack:
    audio, oof = _fit_audio(table.audio[ds.rows], ds.labels, w, ds.categories, ds.groups, folds)
    x = np.column_stack([oof, features(table, ds.rows, groups)])
    decision = _fit_decision(x, ds.labels, w)
    return Stack(audio, decision, groups, list(table.vocabulary))


def nested_scores(
    table: SignalTable,
    ds: Dataset,
    w: Floats,
    folds: int,
    feature_sets: list[tuple[str, ...]],
) -> list[Floats]:
    """Notes hors pli de l'empilement entier, une par jeu de signaux : chaque pli externe est
    noté par un empilement ajusté sans lui, note audio hors pli interne comprise."""
    out = [np.zeros(len(ds.rows)) for _ in feature_sets]
    for train, test in splits(ds.categories, ds.groups, folds):
        tr, te = ds.rows[train], ds.rows[test]
        audio, oof = _fit_audio(
            table.audio[tr],
            ds.labels[train],
            w[train],
            ds.categories[train],
            ds.groups[train],
            folds,
        )
        a_test = _proba(audio, table.audio[te])
        for k, fs in enumerate(feature_sets):
            decision = _fit_decision(
                np.column_stack([oof, features(table, tr, fs)]),
                ds.labels[train],
                w[train],
            )
            out[k][test] = _proba(decision, np.column_stack([a_test, features(table, te, fs)]))
    return out
