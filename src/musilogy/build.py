"""Chains the transformation SQL files on a DuckDB connection."""

from __future__ import annotations

from pathlib import Path

import duckdb

RAW_ARTIST_COLUMNS = (
    "{mbid:'VARCHAR', name:'VARCHAR', type:'VARCHAR', begin:'VARCHAR', "
    "\"end\":'VARCHAR', ended:'BOOLEAN', country:'VARCHAR', begin_area:'VARCHAR', "
    "genres:'STRUCT(mbid VARCHAR, name VARCHAR, votes INTEGER)[]', "
    "members:'STRUCT(mbid VARCHAR, begin VARCHAR, \"end\" VARCHAR)[]'}"
)
RAW_RG_COLUMNS = (
    "{mbid:'VARCHAR', title:'VARCHAR', date:'VARCHAR', secondary:'VARCHAR[]', artists:'VARCHAR[]', "
    "genres:'STRUCT(mbid VARCHAR, name VARCHAR, votes INTEGER)[]'}"
)


def load_raw(con: duckdb.DuckDBPyConnection, artists: Path, rgs: Path) -> None:
    con.execute(
        f"CREATE OR REPLACE TABLE raw_artists AS SELECT * FROM read_ndjson("
        f"'{artists.as_posix()}', columns={RAW_ARTIST_COLUMNS}, "
        f"format='newline_delimited')"
    )
    con.execute(
        f"CREATE OR REPLACE TABLE raw_release_groups AS SELECT * FROM read_ndjson("
        f"'{rgs.as_posix()}', columns={RAW_RG_COLUMNS}, format='newline_delimited')"
    )


def apply_corrections(con: duckdb.DuckDBPyConnection, corrections: Path | None) -> int:
    if corrections is None:
        # Always materialized, even empty: the fast suite builds
        # fixtures with corrections=None, and the corrections_file_too_large
        # invariant reads this table without depending on the dump.
        con.execute(
            "CREATE OR REPLACE TABLE corrections (mbid VARCHAR, field VARCHAR, "
            "value VARCHAR, justification VARCHAR, source VARCHAR)"
        )
        return 0
    con.execute(
        "CREATE OR REPLACE TABLE corrections AS SELECT * FROM read_csv("
        f"'{corrections.as_posix()}', header=true, "
        "columns={mbid:'VARCHAR', field:'VARCHAR', value:'VARCHAR', "
        "justification:'VARCHAR', source:'VARCHAR'})"
    )
    for field in ("begin", "end"):
        con.execute(
            f'UPDATE raw_artists SET "{field}" = c.value FROM corrections c '
            f"WHERE c.mbid = raw_artists.mbid AND c.field = '{field}'"
        )
    row = con.execute("SELECT count(*) FROM corrections").fetchone()
    assert row is not None  # COUNT(*) always returns exactly one row
    return int(row[0])


def build(
    con: duckdb.DuckDBPyConnection,
    sql_dir: Path,
    artists: Path,
    rgs: Path,
    corrections: Path | None,
    dump_year: int = 2026,
    min_year: int = 1850,
    multi_artist_drop_limit: float = 50.0,
    min_candidate_credits: int = 200,
) -> None:
    load_raw(con, artists, rgs)
    apply_corrections(con, corrections)
    con.execute(f"SET VARIABLE dump_year = {dump_year}")
    con.execute(f"SET VARIABLE min_year = {min_year}")
    # The two bounds of density's exclusion rule (55_genre_reliability.sql,
    # 60_density.sql) travel as session variables, like the calendar window:
    # a rule that removes data must be readable and overridable from here,
    # not buried in a literal inside the SQL that applies it.
    con.execute(f"SET VARIABLE multi_artist_drop_limit = {multi_artist_drop_limit}")
    con.execute(f"SET VARIABLE min_candidate_credits = {min_candidate_credits}")
    for path in sorted(sql_dir.glob("*.sql")):
        if path.name.startswith("90_"):
            continue
        con.execute(path.read_text(encoding="utf-8"))


INVARIANTS = (
    "duplicate_artist",
    "artist_unexpected_type",
    "birth_misread",
    "artist_out_of_window",
    "end_before_begin",
    "end_after_dump_year",
    "end_before_min_year",
    "y0_source_mismatch",
    "y_end_source_mismatch",
    "first_album_mismatch",
    "last_album_mismatch",
    "album_without_artist",
    "album_out_of_window",
    "album_extra_secondary_type",
    "artist_genres_out_of_order",
    "genre_source_mismatch",
    "genres_from_albums_mismatch",
    "unknown_genre",
    "genre_n_artists_mismatch",
    "presence_out_of_range",
    "presence_end_mismatch",
    "density_out_of_range",
    "density_above_band_count",
    "density_population_mismatch",
    "density_missing_cell",
    "density_excluded_genre_present",
    "member_without_band",
    "member_without_person",
    "duplicate_member",
    "corrections_file_too_large",
    "corrections_invalid",
    "corrections_duplicate",
)


def check_invariants(con: duckdb.DuckDBPyConnection, sql_dir: Path) -> list[tuple[str, int]]:
    con.execute((sql_dir / "90_invariants.sql").read_text(encoding="utf-8"))
    violations: list[tuple[str, int]] = []
    for name in INVARIANTS:
        row = con.execute(f"SELECT count(*) FROM {name}").fetchone()
        assert row is not None  # COUNT(*) always returns exactly one row
        n = int(row[0])
        if n:
            violations.append((name, n))
    return violations
