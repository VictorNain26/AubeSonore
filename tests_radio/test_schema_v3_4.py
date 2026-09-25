import sqlite3
from pathlib import Path

import pytest

from radio.core.config import REPO_ROOT, Settings, load_editorial
from radio.core.db import connect


def test_schema_v4_selections_and_ballots(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 4
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (1, 'A')")
    conn.execute("INSERT INTO tracks VALUES (10, 1, 'T', 'candidate', 'a|t', 'd')")
    conn.execute("INSERT INTO tracks VALUES (11, 1, 'U', 'candidate', 'a|u', 'd')")
    conn.execute("INSERT INTO models VALUES (1, 'd', 'f', 0.5, 1, 'v', '{}', '{}')")
    conn.execute("INSERT INTO selections VALUES (1, 'd', 1)")
    conn.execute("INSERT INTO ballots VALUES (10, 1, 'exam', 0)")
    with pytest.raises(sqlite3.IntegrityError):  # un titre n'est présenté qu'une fois
        conn.execute("INSERT INTO ballots VALUES (10, 1, 'lesson', 1)")
    with pytest.raises(sqlite3.IntegrityError):  # une position par sélection
        conn.execute("INSERT INTO ballots VALUES (11, 1, 'exam', 0)")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO ballots VALUES (11, 1, 'autre', 1)")
    with pytest.raises(sqlite3.IntegrityError):  # la sélection doit exister
        conn.execute("INSERT INTO ballots VALUES (11, 9, 'exam', 1)")


def test_votes_config_and_settings() -> None:
    ed = load_editorial(REPO_ROOT / "config" / "editorial.toml")
    assert ed.votes.exam_per_selection == 10
    assert ed.votes.lesson_per_selection == 10
    assert ed.votes.yes_rate_alert == 0.90
    assert ed.votes.quiet_days == 7
    s = Settings(
        _env_file=None,
        whatsapp_phone="+33600000000",
        callmebot_apikey="cle-secrete-123",
        cf_access_team_domain="aube.cloudflareaccess.com",
        cf_access_aud="aud-tag",
    )
    assert s.votes_host == "127.0.0.1"
    assert s.votes_port == 8040
    assert s.votes_url is None
    assert "cle-secrete-123" not in repr(s)
    assert "+33600000000" not in repr(s)
