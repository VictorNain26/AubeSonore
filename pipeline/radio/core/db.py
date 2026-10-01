"""SQLite : connexion et migrations numérotées (PRAGMA user_version)."""

import sqlite3
from pathlib import Path

MIGRATIONS = Path(__file__).parent / "migrations"


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    _migrate(conn)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Clés étrangères coupées pendant les migrations et vérifiées avant validation : procédure
    officielle de reconstruction de table (https://www.sqlite.org/lang_altertable.html#otheralter).
    Un script ne contient ni BEGIN ni COMMIT : schéma et user_version passent ensemble."""
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for script in sorted(MIGRATIONS.glob("*.sql")):
        version = int(script.name.split("_", 1)[0])
        if version <= current:
            continue
        sql = script.read_text(encoding="utf-8")
        try:
            conn.executescript(f"BEGIN;\n{sql}\nPRAGMA user_version = {version};")
            if conn.execute("PRAGMA foreign_key_check").fetchone() is not None:
                raise sqlite3.IntegrityError(f"clés étrangères rompues par {script.name}")
            conn.commit()
        except sqlite3.Error:
            conn.rollback()
            raise
