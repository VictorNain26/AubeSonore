import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import REPO_ROOT, load_editorial
from radio.core.db import connect


def db(tmp_path: Path) -> sqlite3.Connection:
    conn = connect(tmp_path / "radio.db")
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (1, 'Wire')")
    return conn


def add_track(conn: sqlite3.Connection, tid: int, origin: str = "candidate") -> None:
    conn.execute(
        "INSERT INTO tracks VALUES (?, 1, 'Mannequin', ?, 'wire|mannequin', 'd')", (tid, origin)
    )


def test_migration_002_creates_tables(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 2
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {
        "artists",
        "tracks",
        "track_measures",
        "discover_runs",
        "run_seeds",
        "candidates",
        "negative_artists",
    } <= names


def test_dedupe_key_unique_except_library(tmp_path: Path) -> None:
    conn = db(tmp_path)
    add_track(conn, 10)
    with pytest.raises(sqlite3.IntegrityError):
        add_track(conn, 11)
    add_track(conn, 12, origin="negative")
    add_track(conn, 13, origin="library")
    add_track(conn, 14, origin="library")


def test_measure_rows_are_consistent(tmp_path: Path) -> None:
    conn = db(tmp_path)
    add_track(conn, 10)
    bad: list[tuple[object, ...]] = [
        (10, "ok", 5, None),
        (10, "ok", 5, b"\0" * 16),
        (10, "no_preview", 5, b"\0" * 5120),
        (10, "gone", 5, None),
        (10, "no_preview", None, None),
    ]
    for row in bad:
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO track_measures VALUES (?, ?, ?, ?, 'm', 'd')", row)
    conn.execute("INSERT INTO track_measures VALUES (10, 'ok', 5, ?, 'm', 'd')", (b"\0" * 5120,))


def test_artist_rows_are_consistent(tmp_path: Path) -> None:
    conn = db(tmp_path)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("UPDATE artists SET fetched_at = 'd' WHERE deezer_artist_id = 1")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "UPDATE artists SET fetched_at = 'd', nb_fan = 3, deezer_related = '[]',"
            " lastfm_found = 1 WHERE deezer_artist_id = 1"
        )
    conn.execute(
        "UPDATE artists SET fetched_at = 'd', nb_fan = 3, deezer_related = '[]',"
        " lastfm_found = 0 WHERE deezer_artist_id = 1"
    )


def test_one_running_run_at_most(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    conn.execute("INSERT INTO discover_runs (started_at, status) VALUES ('d', 'running')")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO discover_runs (started_at, status) VALUES ('d', 'running')")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO discover_runs (started_at, status) VALUES ('d', 'done')")


def test_editorial_v3_2_sections(tmp_path: Path) -> None:
    ed = load_editorial(REPO_ROOT / "config" / "editorial.toml")
    d = ed.discover
    assert (d.seeds_per_run, d.seed_cooldown_days) == (15, 30)
    assert (d.tracks_per_neighbour, d.lastfm_similar_limit) == (10, 100)
    assert ed.signals.culture_vocabulary == 200
    p = tmp_path / "e.toml"
    p.write_text("[discover]\nseeds_per_run = 0\n")
    with pytest.raises(ValidationError):
        load_editorial(p)
