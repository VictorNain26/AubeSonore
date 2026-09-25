from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from radio.core.config import ModelConfig
from radio.model.dataset import build_labels
from radio.model.promote import Decision, exam_metrics, save_model, votes_seen
from radio.model.train import train_model
from radio.signals.table import load_signals
from radio.votes.select import select_batch
from radio.votes.status import load_status
from tests_radio.model_factory import NOW, add_vote, make_model_db, serve_scores

CFG = ModelConfig(min_votes_per_class=4, folds=3)
LATER = datetime(2026, 9, 26, tzinfo=UTC)


def test_status_measures_the_serving_model_on_exam_votes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    add_vote(conn, 200600, "exam", "non")
    add_vote(conn, 200700, "exam", "non")
    add_vote(conn, 300600, "exam", "oui", at="2026-09-25T09:00:00+00:00")
    add_vote(conn, 300700, "lesson", "non", at="2026-09-01T09:00:00+00:00")  # hors 7 jours
    table = load_signals(conn, 10)
    labels = build_labels(conn, table, 60)
    r = train_model(table, labels, CFG)
    assert r.threshold is not None
    exam = exam_metrics(r.stack, r.threshold, table, labels.exam)
    decision = Decision(True, ["premier modèle"])
    mid = save_model(conn, tmp_path / "models", r, exam, decision, CFG, NOW, votes_seen(conn))

    st = load_status(conn, tmp_path / "models", 10, CFG, 7, LATER)
    assert st.model_id == mid
    assert st.exam is not None and st.exam.n == 3
    assert st.exam.yes is not None
    assert (st.exam.yes.n, st.exam.yes.yes) == (2, 0)  # les deux aimés retenus, votés « non »
    assert st.last_exam_vote == "2026-09-25T09:00:00+00:00"
    assert st.recent_votes == 13
    assert st.pending == 0 and st.last_selection is None and st.batch is None


def test_status_without_a_model_still_counts_votes_and_ballots(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    assert load_status(conn, tmp_path / "models", 10, CFG, 7, LATER).model_id is None
    serve_scores(conn)  # modèle n°1 promu, sans fichier : on ne mesure que la file ici
    select_batch(conn, np.random.default_rng(0), 10, 10, NOW)
    conn.execute("UPDATE models SET promoted = 0, threshold = NULL")
    conn.commit()
    st = load_status(conn, tmp_path / "models", 10, CFG, 7, LATER)
    assert st.model_id is None and st.exam is None
    assert st.pending == 20
    assert st.last_selection == NOW
    assert st.batch == (2, 48, 24)
    assert st.recent_votes == 0 and st.last_exam_vote is None
