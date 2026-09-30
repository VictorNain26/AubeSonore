"""État du goût, pour le rapport et le rappel hebdomadaire (spec §7, §8).

Le taux de oui se mesure sur les votes d'examen de la page : des titres retenus, tirés au hasard
et présentés à l'aveugle. L'AUC du modèle en service se mesure sur toute la fenêtre d'examen.
"""

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np

from radio.model.dataset import build_labels
from radio.model.model import Batch, YesRate, auc, last_batch, predict, serving, yes_rate
from radio.signals.table import load_signals
from radio.votes.select import pending_ballots


@dataclass(frozen=True)
class Status:
    model_id: int | None
    exam_auc: float | None
    n_exam: int
    yes: YesRate | None
    last_exam_vote: str | None
    pending: int
    last_selection: str | None
    stale_selection_days: int | None
    recent_votes: int
    batch: Batch | None


def load_status(
    conn: sqlite3.Connection,
    models_dir: Path,
    exam_window: int,
    quiet_days: int,
    now: datetime,
) -> Status:
    current = serving(conn, models_dir)
    exam_auc, n_exam = None, 0
    if current is not None:
        table = load_signals(conn)
        exam = build_labels(conn, table, exam_window).exam
        exam_auc, n_exam = auc(exam.labels, predict(current[1], table, exam.rows)), len(exam.rows)
    page = conn.execute(
        """
        SELECT vote = 'oui' FROM votes WHERE kind = 'exam' AND source = 'page' AND vote != 'passer'
        ORDER BY voted_at DESC LIMIT ?
        """,
        (exam_window,),
    ).fetchall()
    last_exam = conn.execute(
        "SELECT MAX(voted_at) FROM votes WHERE kind = 'exam' AND vote != 'passer'"
    ).fetchone()[0]
    since = (now - timedelta(days=quiet_days)).isoformat()
    recent = conn.execute(
        "SELECT COUNT(*) FROM votes WHERE voted_at >= ? AND vote != 'passer'", (since,)
    ).fetchone()[0]
    last_selection = conn.execute("SELECT MAX(selected_at) FROM selections").fetchone()[0]
    return Status(
        model_id=None if current is None else current[0],
        exam_auc=exam_auc,
        n_exam=n_exam,
        yes=yes_rate(np.array([int(r[0]) for r in page], dtype=np.int64)),
        last_exam_vote=last_exam,
        pending=len(pending_ballots(conn)),
        last_selection=last_selection,
        stale_selection_days=None
        if last_selection is None
        else (now - datetime.fromisoformat(last_selection)).days,
        recent_votes=int(recent),
        batch=last_batch(conn),
    )
