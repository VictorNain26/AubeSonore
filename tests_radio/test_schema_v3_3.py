import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import load_editorial
from radio.core.db import connect


def test_migration_003_creates_tables(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] >= 3
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"votes", "models", "scores"} <= names


def test_a_vote_survives_without_its_track(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    # Pas de clé étrangère : un vote ne se perd jamais, même si son titre quitte `tracks`.
    conn.execute("INSERT INTO votes VALUES (999, 'exam', 'oui', '2026-09-24', 'banc')")
    assert conn.execute("SELECT COUNT(*) FROM votes").fetchone()[0] == 1


@pytest.mark.parametrize(
    "row",
    [
        (1, "examen", "oui", "d", "s"),
        (1, "exam", "passe", "d", "s"),
    ],
)
def test_vote_values_are_checked(tmp_path: Path, row: tuple[object, ...]) -> None:
    conn = connect(tmp_path / "radio.db")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO votes VALUES (?, ?, ?, ?, ?)", row)


def test_a_promoted_model_has_a_threshold(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO models (trained_at, file, threshold, promoted, verdict, params, metrics)"
            " VALUES ('d', 'f', NULL, 1, 'v', '{}', '{}')"
        )


def test_model_config(tmp_path: Path) -> None:
    path = tmp_path / "editorial.toml"
    path.write_text("[model]\nmin_votes_per_class = 3\nfolds = 3\n")
    m = load_editorial(path).model
    assert (m.min_votes_per_class, m.folds) == (3, 3)
    assert (m.target_precision, m.library_acceptance_min) == (0.90, 0.80)
    assert (m.candidate_acceptance_alert, m.exam_window) == (0.10, 60)
    path.write_text("[model]\nfolds = 2\n")
    with pytest.raises(ValidationError):
        load_editorial(path)
