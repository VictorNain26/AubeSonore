"""Reads one artist's lineage and contemporaries from the published tables."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import duckdb

from musilogy.build import connect
from musilogy.paths import SQL_DIR

# The term each source asserts, read from the artist's side and from the
# model's side. A teacher is not an influence: the source's own word is shown.
TERMS = {
    "mb_teacher": ("pupil of", "teacher of"),
    "mb_tribute": ("tribute to", "tribute from"),
    "mb_named_after": ("named after", "gave its name to"),
}


@dataclass(frozen=True)
class Related:
    mbid: str
    name: str
    disambiguation: str | None
    y0: int | None
    y_end: int | None
    term: str
    source: str


@dataclass(frozen=True)
class Contemporary:
    mbid: str
    name: str
    disambiguation: str | None
    y0: int
    y_presence_end: int
    scene: str
    shared_genres: list[str]
    jaccard: float


def open_published(out_dir: Path) -> duckdb.DuckDBPyConnection:
    """The published Parquet, under the table names the SQL rules use, so the
    contemporaries macro reads them as it reads the build's own tables."""
    con = connect()
    for table in ("artists", "lineage"):
        path = (out_dir / f"{table}.parquet").as_posix()
        con.execute(f"CREATE VIEW {table} AS SELECT * FROM read_parquet('{path}')")
    con.execute((SQL_DIR / "70_contemporaries.sql").read_text(encoding="utf-8"))
    return con


def describe(con: duckdb.DuckDBPyConnection, mbid: str) -> tuple[str, str | None] | None:
    row = con.execute("SELECT name, disambiguation FROM artists WHERE mbid = ?", [mbid]).fetchone()
    return None if row is None else (row[0], row[1])


def _related(con: duckdb.DuckDBPyConnection, mbid: str, side: str) -> list[Related]:
    this, other, term = (
        ("artist_mbid", "model_mbid", 0)
        if side == "inspirations"
        else ("model_mbid", "artist_mbid", 1)
    )
    # No order by notoriety: by source, then date, then mbid, a total order.
    rows = con.execute(
        f"SELECT a.mbid, a.name, a.disambiguation, a.y0, a.y_end, l.source "
        f"FROM lineage l JOIN artists a ON a.mbid = l.{other} WHERE l.{this} = ? "
        f"ORDER BY l.source, a.y0 NULLS LAST, a.mbid",
        [mbid],
    ).fetchall()
    return [
        Related(mbid, name, disambiguation, y0, y_end, TERMS[source][term], source)
        for mbid, name, disambiguation, y0, y_end, source in rows
    ]


def inspirations(con: duckdb.DuckDBPyConnection, mbid: str) -> list[Related]:
    return _related(con, mbid, "inspirations")


def descendants(con: duckdb.DuckDBPyConnection, mbid: str) -> list[Related]:
    return _related(con, mbid, "descendants")


def contemporaries(
    con: duckdb.DuckDBPyConnection, mbid: str, limit: int
) -> tuple[int, list[Contemporary]]:
    """The total beside one page: the list is ordered, never cut."""
    rows = con.execute("SELECT * FROM contemporaries(?)", [mbid]).fetchall()
    return len(rows), [Contemporary(*r) for r in rows[:limit]]
