"""Sélection hebdomadaire des votes (spec §6.1) et bulletins en attente.

- Examen : tirage uniforme parmi les titres retenus (acceptés par le modèle en service) de la
  dernière fournée notée. Un vote d'examen n'est jamais un exemple d'entraînement
  (radio/model/dataset.py).
- Leçon : les titres les plus incertains (note la plus proche du seuil), au plus un par artiste :
  échantillonnage par incertitude (Settles, Active Learning Literature Survey, 2009).
- À l'aveugle : l'ordre de présentation est tiré au hasard, la page ne montre que l'artiste et
  le titre.
- Un titre voté ou déjà présenté ne revient jamais. Tant qu'un bulletin attend, aucune nouvelle
  sélection : les semaines sans vote ne s'empilent pas.
"""

import sqlite3
from dataclasses import dataclass

import numpy as np

VOTES = ("oui", "non", "passer")


class NoServingModelError(Exception):
    """Aucun modèle promu : rien ne dit quels titres sont retenus."""


class NoScoresError(Exception):
    """Le modèle en service n'a noté aucun candidat."""


class PendingBallotsError(Exception):
    def __init__(self, n: int) -> None:
        super().__init__(f"{n} bulletins en attente")
        self.n = n


@dataclass(frozen=True)
class Ballot:
    deezer_track_id: int
    kind: str
    position: int
    artist: str
    title: str


@dataclass(frozen=True)
class Selection:
    selection_id: int | None  # None : rien à présenter
    model_id: int
    run_id: int
    n_retained: int  # retenus de la dernière fournée, encore jamais présentés
    exam: list[int]
    lesson: list[int]


def pending_ballots(conn: sqlite3.Connection) -> list[Ballot]:
    rows = conn.execute(
        """
        SELECT b.deezer_track_id, b.kind, b.position, a.name, t.title
        FROM ballots b
        JOIN tracks t ON t.deezer_track_id = b.deezer_track_id
        JOIN artists a ON a.deezer_artist_id = t.deezer_artist_id
        LEFT JOIN votes v ON v.deezer_track_id = b.deezer_track_id
        WHERE v.deezer_track_id IS NULL
        ORDER BY b.selection_id, b.position
        """
    ).fetchall()
    return [Ballot(int(r[0]), str(r[1]), int(r[2]), str(r[3]), str(r[4])) for r in rows]


def record_vote(conn: sqlite3.Connection, track_id: int, vote: str, now: str) -> bool:
    """Enregistre le vote d'un bulletin en attente. False si le titre n'attend pas de vote."""
    if vote not in VOTES:
        raise ValueError(f"vote inconnu : {vote!r}")
    try:
        with conn:
            row = conn.execute(
                """
                SELECT b.kind FROM ballots b
                LEFT JOIN votes v ON v.deezer_track_id = b.deezer_track_id
                WHERE b.deezer_track_id = ? AND v.deezer_track_id IS NULL
                """,
                (track_id,),
            ).fetchone()
            if row is None:
                return False
            conn.execute(
                "INSERT INTO votes VALUES (?, ?, ?, ?, 'page')", (track_id, row[0], vote, now)
            )
    except sqlite3.IntegrityError:
        return False  # double geste simultané : le premier a été enregistré
    return True


def _serving(conn: sqlite3.Connection) -> tuple[int, float]:
    row = conn.execute(
        "SELECT model_id, threshold FROM models WHERE promoted = 1 ORDER BY model_id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        raise NoServingModelError
    return int(row[0]), float(row[1])


def select_batch(
    conn: sqlite3.Connection, rng: np.random.Generator, n_exam: int, n_lesson: int, now: str
) -> Selection:
    waiting = pending_ballots(conn)
    if waiting:
        raise PendingBallotsError(len(waiting))
    model_id, threshold = _serving(conn)
    last_run = conn.execute(
        "SELECT MAX(c.run_id) FROM scores s JOIN candidates c USING (deezer_track_id) "
        "WHERE s.model_id = ?",
        (model_id,),
    ).fetchone()[0]
    if last_run is None:
        raise NoScoresError
    run_id = int(last_run)
    rows = conn.execute(
        """
        SELECT s.deezer_track_id, s.score, s.accepted, c.run_id, t.deezer_artist_id
        FROM scores s
        JOIN candidates c ON c.deezer_track_id = s.deezer_track_id
        JOIN tracks t ON t.deezer_track_id = s.deezer_track_id
        WHERE s.model_id = ?
          AND s.deezer_track_id NOT IN (SELECT deezer_track_id FROM votes)
          AND s.deezer_track_id NOT IN (SELECT deezer_track_id FROM ballots)
        ORDER BY s.deezer_track_id
        """,
        (model_id,),
    ).fetchall()
    retained = [int(r[0]) for r in rows if int(r[3]) == run_id and int(r[2]) == 1]
    k = min(n_exam, len(retained))
    exam = sorted(int(t) for t in rng.choice(retained, size=k, replace=False)) if k else []
    lesson: list[int] = []
    artists: set[int] = set()
    for r in sorted(rows, key=lambda r: (abs(float(r[1]) - threshold), int(r[0]))):
        if len(lesson) == n_lesson:
            break
        tid, artist = int(r[0]), int(r[4])
        if tid in exam or artist in artists:
            continue
        lesson.append(tid)
        artists.add(artist)
    chosen = [(t, "exam") for t in exam] + [(t, "lesson") for t in lesson]
    if not chosen:
        return Selection(None, model_id, run_id, len(retained), [], [])
    positions = rng.permutation(len(chosen))
    with conn:
        cur = conn.execute(
            "INSERT INTO selections (selected_at, model_id) VALUES (?, ?)", (now, model_id)
        )
        selection_id = cur.lastrowid
        assert selection_id is not None
        conn.executemany(
            "INSERT INTO ballots VALUES (?, ?, ?, ?)",
            [
                (tid, selection_id, kind, int(p))
                for (tid, kind), p in zip(chosen, positions, strict=True)
            ],
        )
    return Selection(selection_id, model_id, run_id, len(retained), exam, lesson)
