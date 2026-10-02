"""CLI entry point: run, snapshot-popularity, make-fixtures, artist."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

import duckdb

from musilogy import REFERENCE_DUMP as DUMP
from musilogy import REFERENCE_POPULARITY
from musilogy import artist as lineage
from musilogy.build import build, check_invariants, connect
from musilogy.extract import extract, reduce_artist, reduce_release_group
from musilogy.fetch import (
    POPULARITY_BATCH,
    expected_sums,
    fetch_dump,
    fetch_popularity,
    sha256_file,
    verify,
)
from musilogy.paths import (
    CORRECTIONS_CSV,
    FIXTURES_DIR,
    RAW_DIR,
    REFERENCE_DIR,
    SQL_DIR,
    out_dir,
    popularity_snapshot,
    popularity_sums,
    work_dir,
)
from musilogy.publish import extraction_matches_rows_loaded, publish

SUMS_PATH = REFERENCE_DIR / f"{DUMP}.SHA256SUMS"
WORK_DIR = work_dir(DUMP)
ARTISTS_JSONL = WORK_DIR / "artists.jsonl"
RELEASE_GROUPS_JSONL = WORK_DIR / "release_groups.jsonl"
POPULARITY_JSONL = popularity_snapshot(REFERENCE_POPULARITY)

WITNESSES = [
    "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",  # The Beatles
    "9d953ee6-4ea6-4b0e-aea6-7268d380bef1",  # homonym
    "8d3431db-bc83-4dc2-93b8-0e46e31d09f7",  # homonym
    "9a58fda3-f4ed-4080-a3a5-f457aac9fcdd",  # Joy Division
    "f1106b17-dcbb-45f6-b938-199ccfab50cc",  # New Order
    "a3cb23fc-acd3-4ce0-8f36-1e5aa6a18432",  # U2
    "8f6bd1e4-fbe1-4f50-aa9b-94c450ec0f11",  # Portishead
    "97c86b2c-2765-46a2-aef8-76a7e24c430f",  # XTC
    "e598d30e-4ce1-402e-94a7-6f44779da6b7",  # Orange Juice
    "6959c3d5-3e7f-41bb-aba3-50e38225d23d",  # homonym
    "a9424175-8b06-44ad-a1f4-319e92a50879",  # Disincarnate
    "125948ec-7f91-4d1a-8b83-accbf50fae3d",  # 3OH!3
    "d25be955-6fed-4303-bffb-8c440c191edb",  # Lethal Shöck
    "53fc0417-7585-490c-b2ea-5f9737e14c0f",  # Blackdeath
    "1434b0d0-d647-421e-b345-1b9847045a52",  # Cleef
    "6dfa03fb-8b02-4055-b7cc-e48f426b13f8",  # Unheilig
    "d770374d-05e9-4ed3-a068-3fbd4e6e4dd6",  # Wiener Philharmoniker
    "0ab49580-c84f-44d4-875f-d83760ea2cfe",  # Maroon 5
    "703c4c92-43f7-4268-9f85-0ca6f0cd1a22",  # Polska Radio One
    "f7338f2a-136b-4d5e-b099-5504cf997f58",  # Cardiacs
    "bd13909f-1c29-4c27-a874-d4aaf27c5b1a",  # Fleetwood Mac
    "3cb86073-22d7-43d5-8f22-422b1e54988e",  # ROD
    "212faddb-cd09-4fbc-9336-3ed7cadfba68",  # Flesh Field
    "8a1f012c-acc1-4dda-878f-43ac02f2366f",  # Demented Are Go!
    "62f7a211-0056-45fe-934a-37a388a7356f",  # The Belle Stars
    "35ddcb29-4c16-4af6-b6f8-32143ee24a6c",  # Handel and Haydn Society
    "d36b0fad-abd7-44e4-88fa-f638bbf8c9a6",  # Thunder Jolt
    "03c2e506-e8bb-4bd6-9693-5aa97c8eea1c",  # Inspiral Carpets
    "7b7f9365-45fc-43b0-a8c3-83f7451ddbd5",  # $.99 Dreams: its genres come from its albums
    "87c5dedd-371d-4a53-9f7f-80522fb7f3cb",  # Björk: a living solo artist
    "5441c29d-3602-4898-b1a1-b77fa23b8e50",  # David Bowie: albums released after his death
    "24f1766e-9635-4d58-a4d4-9413f9f98a4c",  # Johann Sebastian Bach: dead before min_year
    "6fa2e161-200e-475a-8492-3755594581f9",  # Bernard Sumner: member of two witness bands
]


def fetch_and_extract() -> None:
    """fetch → extract. Replayable: fetch_dump does not re-download an
    archive it has already verified, and extract rewrites its output on every
    call."""
    artist_archive = fetch_dump(DUMP, "artist.tar.xz", RAW_DIR, SUMS_PATH)
    rg_archive = fetch_dump(DUMP, "release-group.tar.xz", RAW_DIR, SUMS_PATH)
    artists_kept, artists_dropped = extract(artist_archive, reduce_artist, ARTISTS_JSONL)
    rgs_kept, rgs_dropped = extract(rg_archive, reduce_release_group, RELEASE_GROUPS_JSONL)
    (WORK_DIR / "extraction.json").write_text(
        json.dumps(
            {
                "artists_kept": artists_kept,
                "artists_dropped": artists_dropped,
                "release_groups_kept": rgs_kept,
                "release_groups_dropped": rgs_dropped,
            },
            indent=1,
        ),
        encoding="utf-8",
    )


def snapshot_popularity() -> None:
    """Asks ListenBrainz about every artist of the extraction. The counts move
    every day, so a snapshot cannot be taken again: like the dump, it is
    fetched once, its digest committed under reference/, and a run reads the
    one REFERENCE_POPULARITY pins, never a fresh one."""
    if not ARTISTS_JSONL.exists():
        fetch_and_extract()
    date = datetime.now(UTC).date().isoformat()
    dest = popularity_snapshot(date)
    cur = connect().execute(
        f"SELECT mbid FROM read_ndjson('{ARTISTS_JSONL.as_posix()}', columns={{mbid:'VARCHAR'}}) "
        "ORDER BY mbid"
    )
    batches = iter(lambda: [r[0] for r in cur.fetchmany(POPULARITY_BATCH)], [])
    n = fetch_popularity(batches, dest)
    popularity_sums(date).write_text(f"{sha256_file(dest)}  {dest.name}\n", encoding="utf-8")
    print(f"{n} artists asked; pin it: REFERENCE_POPULARITY = {date!r}")


def verified_popularity() -> Path:
    if not POPULARITY_JSONL.exists():
        raise SystemExit(
            f"ListenBrainz snapshot {REFERENCE_POPULARITY} missing at {POPULARITY_JSONL}; "
            "it cannot be taken again: `musilogy snapshot-popularity`, then pin the new one"
        )
    sums = expected_sums(popularity_sums(REFERENCE_POPULARITY))
    verify(POPULARITY_JSONL, sums[POPULARITY_JSONL.name])
    return POPULARITY_JSONL


def _stop_on_extraction_mismatch(con: duckdb.DuckDBPyConnection, extraction: Path) -> None:
    """Called before publish(), never after: a run that wrote its Parquet and
    only then failed would have replaced a sound delivery with a truncated
    one, and a consumer reading the tables without the manifest could not tell.
    Nothing is written here, so the previous publication survives a refusal.

    `is False`, never a truthiness test: None says the sidecar is absent,
    unreadable or missing a count, which is silence and not agreement — every
    extraction predating the sidecar reports exactly that. False says the build
    loaded something other than what the extraction wrote, so the tables are
    narrower than their source and nothing downstream can tell."""
    if extraction_matches_rows_loaded(con, extraction) is False:
        raise SystemExit(
            f"extraction mismatch: {extraction} disagrees with the rows loaded, nothing published"
        )


def run() -> None:
    """Full execution: fetch → extract (when needed) → transform → validate → publish."""
    if not ARTISTS_JSONL.exists() or not RELEASE_GROUPS_JSONL.exists():
        fetch_and_extract()

    popularity = verified_popularity()

    con = connect()
    build(
        con,
        SQL_DIR,
        ARTISTS_JSONL,
        RELEASE_GROUPS_JSONL,
        CORRECTIONS_CSV,
        popularity=popularity,
        popularity_snapshot=REFERENCE_POPULARITY,
    )

    violations = check_invariants(con, SQL_DIR)
    if violations:
        raise SystemExit(f"invariants violated: {violations}")

    extraction = WORK_DIR / "extraction.json"
    _stop_on_extraction_mismatch(con, extraction)

    manifest = publish(con, out_dir(DUMP), DUMP, CORRECTIONS_CSV, extraction)
    print(manifest["counts"])


def make_fixtures() -> None:
    """Extracts the witness records from the full extractions, plus every
    artist a witness is linked to: a link only survives when both of its ends
    are artists, so without them the witnesses would carry none. The linked
    artists come without their release-groups, which keeps the fixtures small
    and leaves their dates unrepresentative — tests read their links only."""
    work = WORK_DIR
    out = FIXTURES_DIR
    out.mkdir(parents=True, exist_ok=True)
    wanted = set(WITNESSES)

    linked: set[str] = set()
    with (work / "artists.jsonl").open(encoding="utf-8") as src:
        for line in src:
            rec = json.loads(line)
            if rec["mbid"] in wanted:
                linked |= {r["mbid"] for r in rec["relations"] if r["mbid"]}

    kept = []
    with (
        (out / "artists.jsonl").open("w", encoding="utf-8") as fh,
        (work / "artists.jsonl").open(encoding="utf-8") as src,
    ):
        for line in src:
            rec = json.loads(line)
            if rec["mbid"] in wanted or rec["mbid"] in linked:
                fh.write(line)
                kept.append(rec["mbid"])

    with (
        (out / "release_groups.jsonl").open("w", encoding="utf-8") as fh,
        (work / "release_groups.jsonl").open(encoding="utf-8") as src,
    ):
        for line in src:
            rec = json.loads(line)
            if wanted & set(rec["artists"]):
                fh.write(line)

    # Every fixture artist, as the snapshot asked about every artist: a
    # witness with no row would fail popularity_unrequested.
    kept_set = set(kept)
    with (
        (out / "popularity.jsonl").open("w", encoding="utf-8") as fh,
        verified_popularity().open(encoding="utf-8") as src,
    ):
        for line in src:
            if json.loads(line)["artist_mbid"] in kept_set:
                fh.write(line)

    print("witnesses found:", len(wanted & set(kept)), "linked artists:", len(set(kept) - wanted))
    missing = wanted - set(kept)
    print("missing:", missing or "none")


def _label(name: str, disambiguation: str | None, y0: int | None, y_end: int | None) -> str:
    """Name, disambiguation and years: what tells two homonyms apart."""
    years = "" if y0 is None else f" {y0}-{'' if y_end is None else y_end}"
    return name + ("" if disambiguation is None else f" ({disambiguation})") + years


def artist(mbid: str, limit: int, published: Path) -> None:
    """Prints the three lists of one artist with their provenance, read from
    the published tables: judging the result on known artists comes before
    any front end reads them."""
    # A run published before lineage existed has artists.parquet alone.
    missing = [t for t in ("artists", "lineage") if not (published / f"{t}.parquet").exists()]
    if missing:
        raise SystemExit(f"{', '.join(missing)} not published in {published}: run `musilogy run`")
    con = lineage.open_published(published)
    found = lineage.describe(con, mbid)
    if found is None:
        raise SystemExit(f"unknown artist: {mbid}")
    print(_label(found[0], found[1], None, None), mbid)
    for title, rows in (
        ("Inspirations", lineage.inspirations(con, mbid)),
        ("Descendants", lineage.descendants(con, mbid)),
    ):
        print(f"\n{title}")
        if not rows:
            print("  no known source")
        for r in rows:
            label = _label(r.name, r.disambiguation, r.y0, r.y_end)
            print(f"  {r.term}: {label}  [{r.source}] {r.mbid}")
    total, page = lineage.contemporaries(con, mbid, limit)
    print(f"\nContemporaries — {total}, by shared genres (Jaccard), then mbid")
    if not total:
        print("  none: no year, no genre, no place, or no one sharing them")
    for c in page:
        print(
            f"  {c.jaccard:.2f} {_label(c.name, c.disambiguation, c.y0, c.y_presence_end)}"
            f"  — {', '.join(c.shared_genres)}  [same {c.scene}] {c.mbid}"
        )


def _page_size(value: str) -> int:
    n = int(value)
    if n < 1:
        # A negative slice would print every contemporary but the last ones.
        raise argparse.ArgumentTypeError(f"at least 1, got {n}")
    return n


def main() -> None:
    parser = argparse.ArgumentParser(prog="musilogy")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("run", help="fetch → extract → transform → validate → publish")
    subparsers.add_parser(
        "snapshot-popularity", help="take a dated ListenBrainz snapshot of every artist"
    )
    subparsers.add_parser("make-fixtures", help="extract witness records for the test fixtures")
    read = subparsers.add_parser("artist", help="an artist's lineage and contemporaries")
    read.add_argument("mbid")
    read.add_argument(
        "--limit", type=_page_size, default=20, help="contemporaries shown (default 20)"
    )

    args = parser.parse_args()
    if args.command == "run":
        run()
    elif args.command == "snapshot-popularity":
        snapshot_popularity()
    elif args.command == "make-fixtures":
        make_fixtures()
    elif args.command == "artist":
        artist(args.mbid, args.limit, out_dir(DUMP))


if __name__ == "__main__":
    main()
