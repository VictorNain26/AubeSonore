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
        sql = script.read_text(encoding="utf-8")
        # Un seul script : le schéma et user_version (transactionnel) passent ensemble ou pas du
        # tout. Un executescript nu validerait chaque instruction une à une.
        try:
            conn.executescript(f"BEGIN;\n{sql}\nPRAGMA user_version = {version};\nCOMMIT;")
        except sqlite3.Error:
            # executescript s'arrête sur l'erreur sans annuler : la transaction resterait ouverte
            # et garderait le verrou d'écriture.
            conn.rollback()
            raise
