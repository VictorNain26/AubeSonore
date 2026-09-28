"""Writes the deliverables: archival Parquet, columnar JSON for the web, manifest."""

from __future__ import annotations

import gzip
import json
import subprocess
from decimal import Decimal
from pathlib import Path
from typing import Any

import duckdb

from musilogy.fetch import expected_sums, sha256_file
from musilogy.paths import PACKAGE_DIR, REFERENCE_DIR

TABLES = ("artists", "albums", "genres", "density", "members")
ARTISTS_WEB_COLUMNS = [
    # mbid first: it is the only key layer 1 can join on — against
    # web/genres.json.gz, against density, against anything. `name` is not an
    # identity, the witnesses alone carry three homonyms.
    "mbid",
    "name",
    "type",
    # Both edges travel with their raw evidence, not just the right one: a
    # derived value is verifiable only if what it derives from is exported too.
    "y0",
    "y0_source",
    "y0_declared",
    "y_first_album",
    "y_end",
    "y_end_source",
    "y_end_declared",
    "y_last_album",
    "y_presence_end",
    "ended",
    "country",
    "begin_area",
    "genres",
    "genre_source",
    "genres_declared",
    "genres_from_albums",
]
# A delivery has to come out in a fixed order, or the same code on the same
# extraction writes different bytes: the tables are built by parallel joins and
# aggregates, so their insertion order is whatever the threads produced. Each
# key below is total — the uniqueness invariants of 90_invariants.sql are what
# make it one. NULLS LAST is spelled out because members' key is NULL on most
# of its rows and DuckDB's placement is a session setting (default_null_order),
# not a property of the query.
ORDER_BY = {
    "artists": "mbid",
    "albums": "rg_mbid",
    "genres": "genre_mbid",
    "density": "genre_mbid, year",
    "members": "band_mbid, person_mbid, y_begin NULLS LAST, y_end NULLS LAST",
}
WEB_COLUMNS = {
    # density_eligible carries the exclusion rule of 60_density.sql itself:
    # without it a web-only consumer cannot apply the rule, recomputes density
    # from artists_timeline alone, and silently invents the 1 011 cells of the
    # art-music genres this layer deliberately withholds. The two measurements
    # stay published alongside it for whoever wants to audit the rule rather
    # than trust it.
    "genres": [
        "genre_mbid",
        "name",
        "n_artists",
        "density_eligible",
        "n_candidate_credits",
        "multi_artist_drop_pct",
    ],
    # Published too, so a consumer reads the aggregate rather than rebuilding
    # it: a consumer that recomputes it reimplements a rule, and reimplementing
    # is where the exclusion gets lost.
    "density": ["genre_mbid", "year", "present"],
}


def _git_sha() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
            cwd=PACKAGE_DIR,
        ).stdout.strip()
    except (subprocess.CalledProcessError, OSError):
        return "unknown"


def _columnar(con: duckdb.DuckDBPyConnection, table: str, columns: list[str]) -> dict[str, Any]:
    rows = con.execute(
        f"SELECT {', '.join(columns)} FROM {table} ORDER BY {ORDER_BY[table]}"
    ).fetchall()
    return {c: [r[i] for r in rows] for i, c in enumerate(columns)}


def _counters(con: duckdb.DuckDBPyConnection, table: str) -> dict[str, int]:
    """Counter table -> manifest entry. Read by column name, never by position:
    a counter added to the SQL surfaces without touching this function."""
    result = con.execute(f"SELECT * FROM {table}")
    assert result.description is not None
    names = [c[0] for c in result.description]
    row = result.fetchone()
    assert row is not None  # counter tables are single-row aggregates
    return {name: int(value) for name, value in zip(names, row, strict=True)}


def _count(con: duckdb.DuckDBPyConnection, table: str) -> int:
    row = con.execute(f"SELECT count(*) FROM {table}").fetchone()
    assert row is not None  # COUNT(*) always returns exactly one row
    return int(row[0])


def _extraction(path: Path | None) -> dict[str, Any] | None:
    """Three distinguishable states, because no record and a broken record are
    not the same thing. The sidecar is an external file read at a boundary, and
    the very failure it exists to reveal — a truncated extraction — is the one
    that can leave it unparseable: a bare json.loads would take the whole
    manifest down with it, losing the counts and the parameters, which have
    nothing to do with the sidecar. A file truncated mid-character fails at
    decode before parsing ever runs, raising UnicodeDecodeError rather than
    JSONDecodeError; both are ValueErrors, so catching ValueError covers each
    without naming them separately."""
    if path is None or not path.exists():
        return None
    try:
        recorded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"unreadable": True}
    return recorded if isinstance(recorded, dict) else {"unreadable": True}


def _extraction_matches_rows_loaded(
    extraction: dict[str, Any] | None, rows_loaded: dict[str, int]
) -> bool | None:
    """None means "no record", never conflated with a mismatch: a sidecar
    that is absent, unreadable, or missing a count says nothing, it does not
    say the extraction was clean."""
    if extraction is None or "unreadable" in extraction:
        return None
    if "artists_kept" not in extraction or "release_groups_kept" not in extraction:
        return None
    return bool(
        extraction["artists_kept"] == rows_loaded["raw_artists"]
        and extraction["release_groups_kept"] == rows_loaded["raw_release_groups"]
    )


INPUT_TABLES = ("raw_artists", "raw_release_groups")


def input_rows_loaded(con: duckdb.DuckDBPyConnection) -> dict[str, int]:
    return {table: _count(con, table) for table in INPUT_TABLES}


def extraction_matches_rows_loaded(
    con: duckdb.DuckDBPyConnection, extraction: Path | None
) -> bool | None:
    """Public because the run has to ask before anything is written: publishing
    first and failing after would replace a sound delivery with a truncated
    one, and a consumer reading the Parquet without the manifest would never
    know. The manifest reports the same verdict through the same two
    functions, so the two answers cannot drift."""
    return _extraction_matches_rows_loaded(_extraction(extraction), input_rows_loaded(con))


PARAMETERS = ("dump_year", "min_year", "multi_artist_drop_limit", "min_candidate_credits")


def _parameters(con: duckdb.DuckDBPyConnection) -> dict[str, Any]:
    """Read back from the connection, never taken from the caller: the manifest
    must say which bounds the build ran under, not the ones we meant to set."""
    row = con.execute(
        "SELECT " + ", ".join(f"getvariable('{name}')" for name in PARAMETERS)
    ).fetchone()
    assert row is not None  # a single-row projection always returns one row
    # DuckDB reads a float session variable back as a Decimal; the manifest is
    # JSON, which has no Decimal type, so it travels as a float instead.
    values = (float(v) if isinstance(v, Decimal) else v for v in row)
    return dict(zip(PARAMETERS, values, strict=True))


def publish(
    con: duckdb.DuckDBPyConnection,
    out_dir: Path,
    dump: str,
    corrections: Path | None,
    extraction: Path | None = None,
) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    web_dir = out_dir / "web"
    web_dir.mkdir(exist_ok=True)
    written: set[str] = set()

    counts: dict[str, int] = {}
    for name in TABLES:
        con.execute(
            f"COPY (SELECT * FROM {name} ORDER BY {ORDER_BY[name]}) TO ?"
            " (FORMAT parquet, COMPRESSION zstd)",
            [(out_dir / f"{name}.parquet").as_posix()],
        )
        counts[name] = _count(con, name)

    # Same reason as the web exports below: a table dropped from a previous
    # schema must not survive in the delivered directory, where a consumer
    # globbing *.parquet would load a population that no longer exists.
    for stale in out_dir.glob("*.parquet"):
        if stale.stem not in TABLES:
            stale.unlink()

    # mtime=0 rather than the default: gzip stamps the current time into its
    # header, so the same payload compressed twice gives different bytes and no
    # consumer can tell an unchanged export from a new one by its digest.
    for table, columns in WEB_COLUMNS.items():
        payload = json.dumps(
            _columnar(con, table, columns), ensure_ascii=False, separators=(",", ":")
        ).encode()
        (web_dir / f"{table}.json.gz").write_bytes(gzip.compress(payload, 9, mtime=0))
        written.add(f"{table}.json.gz")

    # Split in two: a timeline only needs the artists it can place (y0 IS NOT
    # NULL); pulling in the rest would double the payload for no benefit to
    # that consumer.
    for name, condition in (
        ("artists_timeline", "y0 IS NOT NULL"),
        ("artists_rest", "y0 IS NULL"),
    ):
        columns_sql = ", ".join(ARTISTS_WEB_COLUMNS)
        rows = con.execute(
            f"SELECT {columns_sql} FROM artists WHERE {condition} ORDER BY {ORDER_BY['artists']}"
        ).fetchall()
        payload = json.dumps(
            {c: [r[i] for r in rows] for i, c in enumerate(ARTISTS_WEB_COLUMNS)},
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        (web_dir / f"{name}.json.gz").write_bytes(gzip.compress(payload, 9, mtime=0))
        written.add(f"{name}.json.gz")

    # Prune what this run did not write. Without it an export dropped from a
    # previous schema survives in the delivered directory: a consumer globbing
    # web/*.json.gz then loads a file describing a population that no longer
    # exists, joinable to nothing. That reasoning was always about every
    # export, not only the JSON ones, hence every file under web/, not a glob.
    # rglob, like the digest walk below: with iterdir a file in a subdirectory
    # of web/ escaped pruning and was digested as delivered anyway, so the two
    # walks disagreed on what the delivery contains.
    for stale in web_dir.rglob("*"):
        if stale.is_file() and stale.relative_to(web_dir).as_posix() not in written:
            stale.unlink()

    rows_loaded = input_rows_loaded(con)
    extraction_record = _extraction(extraction)

    # Read back from disk once every file is written and the stale ones are
    # gone, never accumulated as they are produced: the manifest has to
    # describe the delivery that is there, not the one this run meant to write.
    # manifest.json is excluded because it is the file carrying these digests.
    output_sha256 = {
        path.relative_to(out_dir).as_posix(): sha256_file(path)
        for path in sorted(out_dir.rglob("*"))
        if path.is_file() and path.name != "manifest.json"
    }

    manifest = {
        "dump": dump,
        "archive_sha256": expected_sums(REFERENCE_DIR / f"{dump}.SHA256SUMS"),
        "counts": counts,
        "output_sha256": output_sha256,
        "parameters": _parameters(con),
        "inputs": {
            "rows_loaded": rows_loaded,
            # Read back rather than recomputed: these counts were taken while
            # the archive was being read, and comparing them to rows_loaded is
            # the only way a truncated extraction shows up at all.
            "extraction": extraction_record,
            # The comparison itself, not left to a human subtracting two
            # numbers in the manifest: see _extraction_matches_rows_loaded.
            "extraction_matches_rows_loaded": _extraction_matches_rows_loaded(
                extraction_record, rows_loaded
            ),
        },
        "r2_anomalies": _counters(con, "r2_anomalies"),
        "neutralised_inferences": _counters(con, "neutralised_inferences"),
        "density_exclusions": _counters(con, "density_exclusions"),
        "git_sha": _git_sha(),
        "corrections_sha256": sha256_file(corrections) if corrections else None,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    return manifest
