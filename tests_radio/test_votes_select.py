from pathlib import Path

import numpy as np
import pytest

from radio.votes.select import (
    NoScoresError,
    NoServingModelError,
    PendingBallotsError,
    pending_ballots,
    record_vote,
    select_batch,
)
from tests_radio.model_factory import NOW, make_model_db, serve_scores


def _rng(seed: int = 0) -> np.random.Generator:
    return np.random.default_rng(seed)


def test_exam_from_latest_batch_lesson_most_uncertain(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    sel = select_batch(conn, _rng(), 10, 10, NOW)
    assert sel.selection_id == 1 and sel.model_id == 1
    assert sel.run_id == 2 and sel.n_retained == 24
    assert len(sel.exam) == 10
    assert all(2006 <= t // 100 < 2012 for t in sel.exam)  # retenus de la dernière fournée
    assert len(sel.lesson) == 10
    assert all(t % 100 == 0 for t in sel.lesson)  # k = 0 : les plus proches du seuil
    assert len({t // 100 for t in sel.lesson}) == 10  # un par artiste
    assert not set(sel.exam) & set(sel.lesson)
    ballots = pending_ballots(conn)
    assert sorted(b.position for b in ballots) == list(range(20))
    kinds = {b.deezer_track_id: b.kind for b in ballots}
    assert kinds == {**dict.fromkeys(sel.exam, "exam"), **dict.fromkeys(sel.lesson, "lesson")}
    assert ballots[0].artist.startswith("Art ") and ballots[0].title.startswith("Titre ")


def test_no_new_selection_while_ballots_wait(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    select_batch(conn, _rng(), 10, 10, NOW)
    with pytest.raises(PendingBallotsError) as e:
        select_batch(conn, _rng(), 10, 10, NOW)
    assert e.value.n == 20


def test_votes_empty_the_queue_and_titles_never_return(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    first = select_batch(conn, _rng(), 10, 10, NOW)
    with pytest.raises(ValueError):
        record_vote(conn, first.exam[0], "peut-être", NOW)
    for b in pending_ballots(conn):
        assert record_vote(conn, b.deezer_track_id, "oui", NOW)
    assert pending_ballots(conn) == []
    assert not record_vote(conn, first.exam[0], "non", NOW)  # déjà voté
    assert not record_vote(conn, 400000, "oui", NOW)  # jamais présenté
    kinds = dict(
        conn.execute("SELECT deezer_track_id, kind FROM votes WHERE source = 'page'").fetchall()
    )
    assert all(kinds[t] == "exam" for t in first.exam)
    assert all(kinds[t] == "lesson" for t in first.lesson)
    second = select_batch(conn, _rng(1), 10, 10, NOW)
    shown = set(first.exam) | set(first.lesson)
    assert not (set(second.exam) | set(second.lesson)) & shown
    retained_shown = {t for t in shown if 2006 <= t // 100 < 2012}
    assert second.n_retained == 24 - len(retained_shown)


def test_small_pool_gives_what_there_is(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    sel = select_batch(conn, _rng(), 30, 0, NOW)
    assert len(sel.exam) == 24 and sel.lesson == []


def test_needs_a_serving_model_and_its_scores(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    with pytest.raises(NoServingModelError):
        select_batch(conn, _rng(), 10, 10, NOW)
    conn.execute("INSERT INTO models VALUES (1, 'd', 'f', 0.5, 1, 'v', '{}', '{}')")
    conn.commit()
    with pytest.raises(NoScoresError):
        select_batch(conn, _rng(), 10, 10, NOW)
