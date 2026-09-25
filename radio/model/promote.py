"""Examen, promotion et historique (spec §7) ; notes des candidats par le modèle en service.

Un nouveau modèle n'est mis en service que s'il a un seuil, respecte le garde-fou et fait au
moins aussi bien que le modèle courant sur les votes d'examen (AUC et taux de oui au seuil).
Chaque entraînement est historisé (table `models`, fichier joblib), promu ou non.
"""

import dataclasses
import hashlib
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import sklearn

from radio.core.config import ModelConfig
from radio.model.dataset import ExamSet
from radio.model.evaluate import YesRate, auc, yes_rate
from radio.model.stack import SEED, Stack
from radio.model.train import TrainResult
from radio.signals.audio import MODEL_TAG
from radio.signals.table import SignalTable


def _pct(x: float) -> str:
    return f"{100 * x:.1f} %".replace(".", ",")


@dataclass(frozen=True)
class ExamMetrics:
    n: int
    auc: float | None
    yes: YesRate | None


def exam_metrics(
    stack: Stack, threshold: float | None, table: SignalTable, exam: ExamSet
) -> ExamMetrics:
    if len(exam.rows) == 0:
        return ExamMetrics(0, None, None)
    s = stack.predict(table, exam.rows)
    yes = None if threshold is None else yes_rate(exam.labels, s, threshold)
    return ExamMetrics(len(exam.rows), auc(exam.labels, s), yes)


@dataclass(frozen=True)
class Decision:
    promoted: bool
    reasons: list[str]


def decide(
    result: TrainResult, new: ExamMetrics, current: ExamMetrics | None, cfg: ModelConfig
) -> Decision:
    if result.threshold is None:
        m = result.missing_votes
        if any(m.values()):
            why = (
                f"votes de leçon insuffisants : il manque {m['oui']} « oui » et {m['non']} « non »"
            )
        else:
            why = f"précision {_pct(cfg.target_precision)} inatteignable sur les votes de leçon"
        return Decision(False, [why])
    reasons = []
    for name, rate in (
        ("bibliothèque acceptée", result.library_acceptance),
        ("bibliothèque acceptée (signaux complets)", result.library_acceptance_complete),
    ):
        if rate is not None and rate < cfg.library_acceptance_min:
            reasons.append(f"garde-fou : {name} {_pct(rate)} < {_pct(cfg.library_acceptance_min)}")
    if current is not None:
        if new.auc is None or current.auc is None or new.yes is None or current.yes is None:
            reasons.append(
                f"comparaison impossible sur l'examen ({new.n} votes : il faut des « oui », des "
                "« non » et des titres acceptés par les deux modèles)"
            )
        else:
            if new.auc < current.auc:
                reasons.append(
                    f"AUC d'examen {new.auc:.3f} < {current.auc:.3f} (modèle en service)".replace(
                        ".", ","
                    )
                )
            if new.yes.rate < current.yes.rate:
                reasons.append(
                    f"taux de oui d'examen {_pct(new.yes.rate)} < {_pct(current.yes.rate)} "
                    "(modèle en service)"
                )
    if reasons:
        return Decision(False, reasons)
    first = current is None
    return Decision(
        True,
        ["premier modèle" if first else "au moins aussi bon que le modèle en service sur l'examen"],
    )


@dataclass(frozen=True)
class Serving:
    model_id: int
    stack: Stack
    threshold: float


def _params(result: TrainResult, cfg: ModelConfig) -> dict[str, Any]:
    return {
        "weak_weight": result.weak_weight,
        "groups": list(result.stack.groups),
        "vocabulary_size": len(result.stack.vocabulary),
        "folds": cfg.folds,
        "target_precision": cfg.target_precision,
        "seed": SEED,
        "embedding": MODEL_TAG,
        "sklearn": sklearn.__version__,
    }


def _metrics(result: TrainResult, exam: ExamMetrics) -> dict[str, Any]:
    def yes(y: YesRate | None) -> dict[str, Any] | None:
        return None if y is None else dataclasses.asdict(y)

    return {
        "counts": result.counts,
        "missing_votes": result.missing_votes,
        "weak_weight_aucs": {str(k): v for k, v in result.weak_weight_aucs.items()},
        "ablation": [dataclasses.asdict(a) for a in result.ablation],
        "lesson_auc": result.lesson_auc,
        "lesson_yes": yes(result.lesson_yes),
        "lesson_acceptance": result.lesson_acceptance,
        "library_acceptance": result.library_acceptance,
        "library_acceptance_complete": result.library_acceptance_complete,
        "n_library_complete": result.n_library_complete,
        "exam": {"n": exam.n, "auc": exam.auc, "yes": yes(exam.yes)},
    }


def votes_seen(conn: sqlite3.Connection) -> dict[str, Any]:
    """Empreinte des votes qui comptent (« passer » exclu) : nombre et condensat du contenu
    (id, sorte, valeur), pour détecter un vote modifié en place (réimport d'un banc corrigé) et
    pas seulement un vote ajouté."""
    rows = conn.execute(
        "SELECT deezer_track_id, kind, vote FROM votes WHERE vote != 'passer' "
        "ORDER BY deezer_track_id"
    ).fetchall()
    digest = hashlib.sha256()
    for tid, kind, vote in rows:
        digest.update(f"{tid}|{kind}|{vote}\n".encode())
    return {"n": len(rows), "digest": digest.hexdigest()}


def last_votes_seen(conn: sqlite3.Connection) -> dict[str, Any] | None:
    """Les votes vus par le dernier entraînement, promu ou non. None avant le premier modèle,
    ou pour un modèle antérieur à l'empreinte."""
    row = conn.execute("SELECT params FROM models ORDER BY model_id DESC LIMIT 1").fetchone()
    if row is None:
        return None
    seen = json.loads(row[0]).get("votes")
    return seen if isinstance(seen, dict) else None


def save_model(
    conn: sqlite3.Connection,
    models_dir: Path,
    result: TrainResult,
    exam: ExamMetrics,
    decision: Decision,
    cfg: ModelConfig,
    now: str,
    votes: dict[str, Any],
) -> int:
    models_dir.mkdir(parents=True, exist_ok=True)
    with conn:
        cur = conn.execute(
            """
            INSERT INTO models (trained_at, file, threshold, promoted, verdict, params, metrics)
            VALUES (?, '', ?, ?, ?, ?, ?)
            """,
            (
                now,
                result.threshold,
                int(decision.promoted),
                " ; ".join(decision.reasons),
                json.dumps({**_params(result, cfg), "votes": votes}),
                json.dumps(_metrics(result, exam)),
            ),
        )
        model_id = cur.lastrowid
        assert model_id is not None
        file = f"modele-{model_id:04d}.joblib"
        # Dans la transaction : si l'écriture du fichier échoue, la ligne n'existe pas.
        joblib.dump(result.stack, models_dir / file)
        conn.execute("UPDATE models SET file = ? WHERE model_id = ?", (file, model_id))
    return model_id


def current_model(conn: sqlite3.Connection, models_dir: Path) -> Serving | None:
    """Le dernier modèle promu. joblib ne lit que les fichiers écrits par save_model."""
    row = conn.execute(
        "SELECT model_id, file, threshold FROM models WHERE promoted = 1 "
        "ORDER BY model_id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return None
    stack = joblib.load(models_dir / row["file"])
    if not isinstance(stack, Stack):
        raise ValueError(f"{row['file']} n'est pas un modèle AubeSonore")
    return Serving(int(row["model_id"]), stack, float(row["threshold"]))


def write_scores(conn: sqlite3.Connection, serving: Serving, table: SignalTable) -> tuple[int, int]:
    rows = np.flatnonzero(np.array(table.origins) == "candidate").astype(np.int64)
    scores = serving.stack.predict(table, rows) if len(rows) else np.zeros(0)
    accepted = scores >= serving.threshold
    with conn:
        conn.execute("DELETE FROM scores")
        conn.executemany(
            "INSERT INTO scores VALUES (?, ?, ?, ?)",
            [
                (int(table.track_ids[i]), serving.model_id, float(s), int(a))
                for i, s, a in zip(rows, scores, accepted, strict=True)
            ],
        )
    return len(rows), int(accepted.sum())


def batch_acceptance(conn: sqlite3.Connection) -> tuple[int, int, int] | None:
    """Taux d'acceptation de la dernière passe de découverte (spec §7.3)."""
    row = conn.execute(
        """
        SELECT c.run_id, COUNT(*), SUM(s.accepted)
        FROM scores s JOIN candidates c USING (deezer_track_id)
        GROUP BY c.run_id ORDER BY c.run_id DESC LIMIT 1
        """
    ).fetchone()
    return None if row is None else (int(row[0]), int(row[1]), int(row[2]))
