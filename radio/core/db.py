"""SQLite : connexion et migrations numérotées (PRAGMA user_version)."""

import sqlite3
from pathlib import Path

MIGRATIONS = Path(__file__).parent / "migrations"


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    _migrate(conn)
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for script in sorted(MIGRATIONS.glob("*.sql")):
        version = int(script.name.split("_", 1)[0])
        if version <= current:
            continue
        with conn:
            conn.executescript(script.read_text(encoding="utf-8"))
            conn.execute(f"PRAGMA user_version = {version}")
