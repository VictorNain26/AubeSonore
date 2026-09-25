"""État du goût, pour le rapport et le rappel hebdomadaire (spec §7.2, §7.3, §8).

Le taux de oui se mesure sur les derniers votes d'examen avec le modèle en service : seul
l'examen juge (spec §7.1).
"""

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from radio.core.config import ModelConfig
from radio.model.dataset import build_labels
from radio.model.promote import ExamMetrics, batch_acceptance, current_model, exam_metrics
from radio.signals.table import load_signals
from radio.votes.select import pending_ballots


@dataclass(frozen=True)
class Status:
    model_id: int | None
    exam: ExamMetrics | None  # modèle en service sur la fenêtre d'examen
    last_exam_vote: str | None
    pending: int
    last_selection: str | None
    stale_selection_days: int | None  # âge de `last_selection` par rapport à `now` (spec §8)
    recent_votes: int  # votes des `quiet_days` derniers jours
    batch: tuple[int, int, int] | None  # dernière fournée : passe, notés, acceptés


def load_status(
    conn: sqlite3.Connection,
    models_dir: Path,
    vocabulary_size: int,
    cfg: ModelConfig,
    quiet_days: int,
    now: datetime,
) -> Status:
    serving = current_model(conn, models_dir)
    exam = None
    if serving is not None:
        table = load_signals(conn, vocabulary_size, vocabulary=serving.stack.vocabulary)
        labels = build_labels(conn, table, cfg.exam_window)
        exam = exam_metrics(serving.stack, serving.threshold, table, labels.exam)
    last_exam = conn.execute(
        "SELECT MAX(voted_at) FROM votes WHERE kind = 'exam' AND vote != 'passer'"
    ).fetchone()[0]
    since = (now - timedelta(days=quiet_days)).isoformat()
    recent = conn.execute("SELECT COUNT(*) FROM votes WHERE voted_at >= ?", (since,)).fetchone()[0]
    last_selection = conn.execute("SELECT MAX(selected_at) FROM selections").fetchone()[0]
    stale_selection_days = (
        None if last_selection is None else (now - datetime.fromisoformat(last_selection)).days
    )
    return Status(
        model_id=None if serving is None else serving.model_id,
        exam=exam,
        last_exam_vote=last_exam,
        pending=len(pending_ballots(conn)),
        last_selection=last_selection,
        stale_selection_days=stale_selection_days,
        recent_votes=int(recent),
        batch=batch_acceptance(conn),
    )
