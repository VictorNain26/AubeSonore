import logging
import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import Settings, load_editorial
from radio.core.db import MIGRATIONS, connect
from radio.core.http import log_retry


def test_connect_applies_migrations(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 9
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"library_tracks", "deezer_matches"} <= names
    assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_connect_is_idempotent(tmp_path: Path) -> None:
    connect(tmp_path / "radio.db").close()
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 9


def test_migration_9_marks_published_discoveries(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    old = tmp_path / "migrations"
    old.mkdir()
    for script in sorted(MIGRATIONS.glob("00[1-8]_*.sql")):
        (old / script.name).write_text(script.read_text(encoding="utf-8"), encoding="utf-8")
    monkeypatch.setattr("radio.core.db.MIGRATIONS", old)
    conn = connect(tmp_path / "radio.db")
    conn.execute("INSERT INTO artists VALUES (1, 'A')")
    for tid in (1, 2, 3):
        conn.execute("INSERT INTO tracks VALUES (?, 1, 'T', 'candidate', ?, 'd')", (tid, f"k{tid}"))
    conn.execute("INSERT INTO acquisitions VALUES (1, 'ready', NULL, 1, '/a/1.mp3', 'd')")
    conn.execute("INSERT INTO acquisitions VALUES (2, 'ready', NULL, 1, '/a/2.mp3', 'd')")
    conn.execute("INSERT INTO acquisitions VALUES (3, 'failed', 'identité', 2, NULL, 'd')")
    conn.execute("INSERT INTO antenne VALUES (1, 'decouverte', 10, 's', 'antenne/1.mp3', 'd')")
    conn.commit()
    conn.close()
    monkeypatch.setattr("radio.core.db.MIGRATIONS", MIGRATIONS)

    conn = connect(tmp_path / "radio.db")
    rows = conn.execute("SELECT deezer_track_id, status, file FROM acquisitions ORDER BY 1")
    assert [tuple(r) for r in rows] == [
        (1, "published", None),
        (2, "ready", "/a/2.mp3"),
        (3, "failed", None),
    ]


def test_failed_migration_leaves_nothing_behind(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    script = migrations / "001_test.sql"
    script.write_text("CREATE TABLE partial (x INTEGER);\nINSERT INTO missing VALUES (1);\n")
    monkeypatch.setattr("radio.core.db.MIGRATIONS", migrations)
    db = tmp_path / "radio.db"

    with pytest.raises(sqlite3.OperationalError):
        connect(db)

    check = sqlite3.connect(db)
    names = {r[0] for r in check.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "partial" not in names
    assert check.execute("PRAGMA user_version").fetchone()[0] == 0
    check.close()

    script.write_text("CREATE TABLE partial (x INTEGER);\nINSERT INTO partial VALUES (1);\n")
    conn = connect(db)
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 1
    assert [tuple(r) for r in conn.execute("SELECT x FROM partial")] == [(1,)]
    conn.close()


def test_match_row_consistency_is_enforced(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    conn.execute(
        "INSERT INTO library_tracks VALUES ('k1', 'A', 'T', 'Al', 200000, 0, '2026-09-24', NULL)"
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO deezer_matches VALUES ('k1', 'matched', NULL, NULL, NULL, '2026-09-24')"
        )


def test_editorial_loads_and_validates(tmp_path: Path) -> None:
    p = tmp_path / "editorial.toml"
    p.write_text("[library]\nduration_tolerance_s = 3\n")
    assert load_editorial(p).library.duration_tolerance_s == 3
    p.write_text("[library]\nduration_tolerance_s = 60\n")
    with pytest.raises(ValidationError):
        load_editorial(p)


def test_settings_reads_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("PLEX_TOKEN", "tok")
    monkeypatch.setenv("PLEX_MUSIC_SECTION", "Musique")
    s = Settings(_env_file=None)
    assert s.plex_token is not None and s.plex_token.get_secret_value() == "tok"
    assert s.plex_music_section == "Musique"
    assert "tok" not in repr(s)


def test_retry_hook_logs_no_arguments(caplog: pytest.LogCaptureFixture) -> None:
    class Details:
        name = "radio.sources.lastfm.LastfmClient._call"
        caused_by = RuntimeError("https://x?api_key=SECRET")
        retry_num = 2
        args = ("SECRET",)
        kwargs = {"api_key": "SECRET"}  # noqa: RUF012

    with caplog.at_level(logging.WARNING):
        log_retry(Details())  # type: ignore[arg-type]
    assert "SECRET" not in caplog.text
    assert "RuntimeError" in caplog.text and "attempt 2" in caplog.text
