import gzip
import json
import struct
import subprocess

import pytest
from conftest import build_synthetic, synthetic_artist, unreliable_genre_records

import musilogy.publish
from musilogy import REFERENCE_DUMP as DUMP
from musilogy.fetch import expected_sums, sha256_file
from musilogy.paths import PACKAGE_DIR, REFERENCE_DIR
from musilogy.publish import publish, write_frieze_blob, write_frieze_ids, write_lineage_blob

REF_SUMS = REFERENCE_DIR / f"{DUMP}.SHA256SUMS"


def read_web(out_dir, name):
    return json.loads(gzip.decompress((out_dir / "web" / f"{name}.json.gz").read_bytes()))


def test_publish_writes_every_table(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    for name in ("bands", "albums", "genres", "density", "members"):
        assert (tmp_path / f"{name}.parquet").exists()
        assert name in manifest["counts"]
    assert manifest["dump"] == DUMP
    assert "genre_parents" not in manifest["counts"]


def test_members_is_archived_but_stays_out_of_the_web_export(con, tmp_path):
    # The Parquet archive is where the membership table belongs. The web
    # export already weighs 15.6 MB gzip for the timeline alone and layer 1's
    # payload budget is a known open problem: 601k relation rows would make it
    # worse for a consumer that has not asked for them.
    publish(con, tmp_path, DUMP, None)
    assert (tmp_path / "members.parquet").exists()
    assert not (tmp_path / "web" / "members.json.gz").exists()


def test_web_export_is_columnar_and_gzipped(con, tmp_path):
    publish(con, tmp_path, DUMP, None)
    raw = (tmp_path / "web" / "bands_timeline.json.gz").read_bytes()
    assert raw[:2] == b"\x1f\x8b"
    data = json.loads(gzip.decompress(raw))
    assert len(data["name"]) == len(data["y0"])


def test_web_export_carries_what_a_consumer_needs_to_join_and_to_audit(con, tmp_path):
    # The join key and the genres first: without mbid, the 380k timeline rows
    # can be joined to nothing — not to web/genres.json.gz, not to density —
    # and without genres the frieze cannot filter. Then both edges' raw
    # evidence, not just the right one: a derived value is verifiable only if
    # what it derives from travels with it.
    publish(con, tmp_path, DUMP, None)
    data = read_web(tmp_path, "bands_timeline")
    assert set(data) >= {
        "mbid",
        "name",
        "genres",
        "genre_source",
        "genres_declared",
        "genres_from_albums",
        "y0",
        "y0_source",
        "y0_declared",
        "y_first_album",
        "y_end",
        "y_end_source",
        "y_end_declared",
        "y_last_album",
        "y_presence_end",
    }
    assert all(data["mbid"])
    assert len(set(data["mbid"])) == len(data["mbid"])

    vocabulary = set(read_web(tmp_path, "genres")["genre_mbid"])
    exported = [g["mbid"] for row in data["genres"] for g in row]
    assert exported, "no band carries a genre: the join is not exercised"
    assert set(exported) <= vocabulary


def test_web_artifacts_alone_reproduce_the_published_density(tmp_path):
    # The regression that matters. A web-only consumer applies the rule of
    # 60_density.sql to bands_timeline + genres. The rule now travels as a
    # column, `density_eligible`, so this test reads that column instead of
    # recomposing the two bounds it stands for; the two measurements stay
    # published alongside it for whoever wants to audit the rule rather than
    # trust it. If the column did not travel, a web-only consumer could not
    # see which genres are excluded and would rebuild the cells this layer
    # withholds — on the reference dump, 828 of them, on exactly the
    # art-music genres the exclusion targets.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    out = tmp_path / "out"
    publish(c, out, DUMP, None)

    vocabulary = read_web(out, "genres")
    excluded = {
        mbid
        for mbid, eligible in zip(
            vocabulary["genre_mbid"], vocabulary["density_eligible"], strict=True
        )
        if not eligible
    }
    assert excluded, "the scenario must exercise at least one excluded genre"

    timeline = read_web(out, "bands_timeline")
    rebuilt = set()
    for i, kind in enumerate(timeline["type"]):
        y0, end = timeline["y0"][i], timeline["y_presence_end"][i]
        if kind != "Group" or y0 is None or end is None:
            continue
        for genre in timeline["genres"][i] or []:
            if genre["mbid"] in excluded:
                continue
            rebuilt |= {(genre["mbid"], year) for year in range(y0, end + 1)}

    published = {
        (mbid, year)
        for mbid, year in zip(
            read_web(out, "density")["genre_mbid"], read_web(out, "density")["year"], strict=True
        )
    }
    assert rebuilt == published


def test_publish_removes_a_parquet_it_no_longer_writes(con, tmp_path):
    stale = tmp_path / "genre_parents.parquet"
    stale.write_bytes(b"not a parquet, and it must not survive anyway")
    manifest = publish(con, tmp_path, DUMP, None)
    assert not stale.exists()
    assert "genre_parents" not in manifest["counts"]
    assert (tmp_path / "bands.parquet").exists()


def test_publish_removes_a_web_export_it_no_longer_writes(con, tmp_path):
    # A schema change leaves the previous export behind: publish() used to
    # write only, never delete, so a file from an older population stayed in
    # the delivered directory next to the current ones.
    web = tmp_path / "web"
    web.mkdir(parents=True)
    stale = web / "bands.json.gz"
    stale.write_bytes(gzip.compress(b'{"name":[]}'))
    publish(con, tmp_path, DUMP, None)
    assert not stale.exists()
    assert (web / "bands_timeline.json.gz").exists()


def test_name_is_not_an_identity_in_the_web_export(con, tmp_path):
    # Three homonym witnesses: keyed by `name`, layer 1 would merge distinct
    # artists. This is why the export carries mbid.
    publish(con, tmp_path, DUMP, None)
    rest = read_web(tmp_path, "bands_rest")
    assert len(set(rest["name"])) < len(rest["name"])
    assert len(set(rest["mbid"])) == len(rest["mbid"])


def test_web_export_is_split_between_timeline_eligible_and_the_rest(con, tmp_path):
    publish(con, tmp_path, DUMP, None)
    timeline = read_web(tmp_path, "bands_timeline")
    rest = read_web(tmp_path, "bands_rest")
    assert all(y0 is not None for y0 in timeline["y0"])
    assert all(y0 is None for y0 in rest["y0"])
    total = con.execute("SELECT count(*) FROM bands").fetchone()[0]
    assert len(timeline["name"]) + len(rest["name"]) == total


def test_presence_is_never_published(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    assert "presence" not in manifest["counts"]
    assert not (tmp_path / "presence.parquet").exists()
    assert not (tmp_path / "web" / "presence.json.gz").exists()


def test_manifest_carries_archive_checksums(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["archive_sha256"] == expected_sums(REF_SUMS)


def test_manifest_carries_r2_anomaly_counters(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["r2_anomalies"] == {
        "begin_illegible": 1,
        "end_illegible": 1,
        "begin_future": 1,
        "end_future": 1,
        "begin_below_min_year": 2,
        "end_below_min_year": 0,
        "end_before_begin": 1,
    }


def test_manifest_carries_the_three_neutralised_inference_counters(con, tmp_path):
    # One counter per guard of 30_bands_lifespan.sql. On the witnesses:
    # Polska Radio One (formed 2015, last album 2014) for the end, Wiener
    # Philharmoniker and Handel and Haydn Society (begins below 1850) for the
    # begin. A neutralised anomaly stays visible instead of being absorbed.
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["neutralised_inferences"] == {
        "first_album_after_declared_end": 0,
        "last_album_before_declared_begin": 1,
        "first_album_with_begin_below_min_year": 2,
    }


def test_manifest_counts_what_the_density_exclusion_rule_removes(tmp_path):
    # A rule that removes data must leave a visible trace. The two numbers
    # differ on purpose (one genre, carried by two bands): a counter reporting
    # the genre count in both slots would pass on a scenario where they match.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    manifest = publish(c, tmp_path / "out", DUMP, None)
    assert manifest["density_exclusions"] == {"genres": 1, "band_genre_pairs": 2}


def test_manifest_carries_git_sha(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    expected = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
        cwd=PACKAGE_DIR,
    ).stdout.strip()
    assert manifest["git_sha"] == expected


def test_manifest_carries_corrections_checksum_when_present(con, tmp_path):
    corrections = tmp_path / "corrections.csv"
    corrections.write_text("mbid,field,value,justification,source\n", encoding="utf-8")
    manifest = publish(con, tmp_path, DUMP, corrections)
    assert manifest["corrections_sha256"] == sha256_file(corrections)


def test_manifest_corrections_checksum_is_none_without_file(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["corrections_sha256"] is None


def test_r2_anomaly_counters_are_not_mismapped_between_subrules(tmp_path):
    # Deliberately distinct counts per sub-rule: on the shared fixtures,
    # several counters hold the same value, and a key swap (begin_future <->
    # end_future, begin_below_min_year <-> end_below_min_year, for example)
    # would otherwise go unnoticed.
    records = (
        [synthetic_artist(f"begin-illegible-{i}", "????-01-01", None) for i in range(2)]
        + [synthetic_artist(f"end-illegible-{i}", "2000-01-01", "????-06") for i in range(3)]
        + [synthetic_artist(f"begin-future-{i}", "2090-01-01", None) for i in range(4)]
        + [synthetic_artist(f"end-future-{i}", "2000-01-01", "2090-01-01") for i in range(5)]
        + [synthetic_artist(f"end-before-begin-{i}", "2010-01-01", "2005-01-01") for i in range(6)]
        + [synthetic_artist(f"begin-below-min-{i}", "0742", None) for i in range(7)]
        + [synthetic_artist(f"end-below-min-{i}", None, "1700-01-01") for i in range(8)]
    )
    c = build_synthetic(tmp_path, records)
    manifest = publish(c, tmp_path / "out", DUMP, None)

    assert manifest["r2_anomalies"] == {
        "begin_illegible": 2,
        "end_illegible": 3,
        "begin_future": 4,
        "end_future": 5,
        "begin_below_min_year": 7,
        "end_below_min_year": 8,
        "end_before_begin": 6,
    }


def test_parquet_archives_are_zstd_compressed(con, tmp_path):
    publish(con, tmp_path, DUMP, None)
    parquet_path = (tmp_path / "bands.parquet").as_posix()
    codecs = con.execute(
        f"SELECT DISTINCT compression FROM parquet_metadata('{parquet_path}')"
    ).fetchall()
    assert codecs == [("ZSTD",)]


def test_manifest_carries_the_parameters_the_build_actually_used(tmp_path):
    # Two runs with different bounds produced indistinguishable manifests: a
    # published dataset was not replayable from its own artifacts. Read back
    # from the connection, never from the caller, so the manifest reports what
    # the build used rather than what the caller meant to set.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(
        tmp_path, artists, release_groups, min_candidate_credits=5, multi_artist_drop_limit=99.5
    )
    manifest = publish(c, tmp_path / "out", DUMP, None)
    assert manifest["parameters"] == {
        "dump_year": 2026,
        "min_year": 1850,
        "multi_artist_drop_limit": 99.5,
        "min_candidate_credits": 5,
    }


def test_manifest_counts_the_rows_that_fed_the_build(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    loaded = manifest["inputs"]["rows_loaded"]
    assert loaded["raw_artists"] == con.execute("SELECT count(*) FROM raw_artists").fetchone()[0]
    assert (
        loaded["raw_release_groups"]
        == con.execute("SELECT count(*) FROM raw_release_groups").fetchone()[0]
    )


def test_manifest_replays_the_extraction_counts_beside_the_rows_loaded(con, tmp_path):
    # The point of recording them: a truncated extraction — a full disk — makes
    # the build silently smaller, and nothing else in the manifest would show
    # it. Published side by side, kept-at-extraction against rows-loaded, the
    # discrepancy is readable.
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text(
        json.dumps(
            {
                "artists_kept": 7,
                "artists_dropped": 3,
                "release_groups_kept": 5,
                "release_groups_dropped": 11,
            }
        ),
        encoding="utf-8",
    )
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["inputs"]["extraction"]["artists_kept"] == 7
    assert manifest["inputs"]["extraction"]["release_groups_dropped"] == 11


def test_manifest_says_so_when_no_extraction_record_exists(con, tmp_path):
    # The synthetic builds have no extraction step at all. Null is the honest
    # answer; an absent key would let a reader assume nothing was dropped.
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["inputs"]["extraction"] is None


def test_manifest_survives_a_truncated_extraction_record(con, tmp_path):
    # A truncated sidecar is precisely the "full disk during extraction"
    # scenario this task targets. A bare json.loads used to raise
    # JSONDecodeError and take the whole manifest down with it: no counts, no
    # parameters, even though those have nothing to do with the sidecar.
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text('{"artists_kept": 7', encoding="utf-8")
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["counts"]
    assert manifest["inputs"]["extraction"] == {"unreadable": True}


def test_manifest_survives_an_extraction_record_that_is_not_an_object(con, tmp_path):
    # A JSON file whose top level is a list parses without error and would
    # otherwise flow into the manifest as a shape no reader expects.
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text("[1, 2, 3]", encoding="utf-8")
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["inputs"]["extraction"] == {"unreadable": True}


def test_manifest_survives_a_sidecar_truncated_mid_character(con, tmp_path):
    # MusicBrainz names are full of non-ASCII; a truncation landing inside a
    # multi-byte character fails at decode, before json.loads ever runs,
    # raising UnicodeDecodeError rather than JSONDecodeError. This fails if the
    # except clause is narrowed back to json.JSONDecodeError alone.
    sidecar = tmp_path / "extraction.json"
    sidecar.write_bytes('{"name": "Motörhead"}'.encode()[:14])
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["counts"]
    assert manifest["inputs"]["extraction"] == {"unreadable": True}


def test_manifest_says_so_when_the_extraction_path_does_not_exist(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None, tmp_path / "missing-extraction.json")
    assert manifest["inputs"]["extraction"] is None


def test_manifest_says_extraction_matches_rows_loaded_when_counts_agree(con, tmp_path):
    # 29 artists and 3632 release-groups are what the fixtures actually load
    # (test_manifest_counts_the_rows_that_fed_the_build): a sidecar claiming
    # exactly those counts is the case the discrepancy check must let through.
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text(
        json.dumps({"artists_kept": 29, "release_groups_kept": 3632}), encoding="utf-8"
    )
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["inputs"]["extraction_matches_rows_loaded"] is True


def test_manifest_says_extraction_does_not_match_rows_loaded_on_a_mismatch(con, tmp_path):
    # A truncated extraction: fewer release-groups made it to disk than the
    # extraction step reported keeping. The boolean must go False rather than
    # leave a human to subtract the two numbers by hand.
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text(
        json.dumps({"artists_kept": 28, "release_groups_kept": 3627}), encoding="utf-8"
    )
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["inputs"]["extraction_matches_rows_loaded"] is False


def test_manifest_extraction_match_is_none_without_a_sidecar(con, tmp_path):
    # "No record" is not "mismatch": three states, not two.
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["inputs"]["extraction_matches_rows_loaded"] is None


def test_manifest_extraction_match_is_none_when_the_sidecar_is_unreadable(con, tmp_path):
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text('{"artists_kept": 7', encoding="utf-8")
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["inputs"]["extraction_matches_rows_loaded"] is None


def test_manifest_extraction_match_is_none_when_a_count_key_is_missing(con, tmp_path):
    sidecar = tmp_path / "extraction.json"
    sidecar.write_text(json.dumps({"artists_kept": 28}), encoding="utf-8")
    manifest = publish(con, tmp_path / "out", DUMP, None, sidecar)
    assert manifest["inputs"]["extraction_matches_rows_loaded"] is None


# A delivery is reproducible only if its rows come out in a fixed order: same
# code and same extraction must give the same bytes, or no consumer can cache
# by digest and no two dumps can be diffed. The engine builds these tables with
# parallel joins and aggregates, so insertion order is whatever the threads
# produced — publishing has to impose the order itself.
PARQUET_KEYS = {
    "bands": ["mbid"],
    "albums": ["rg_mbid"],
    "genres": ["genre_mbid"],
    "density": ["genre_mbid", "year"],
    "members": ["band_mbid", "person_mbid", "y_begin", "y_end"],
}
WEB_KEYS = {
    "genres": ["genre_mbid"],
    "density": ["genre_mbid", "year"],
    "bands_timeline": ["mbid"],
    "bands_rest": ["mbid"],
}


def nulls_last(row):
    """members' key carries NULL years on 464k of its 601k rows, so the test
    has to state where NULLs sort — Python refuses to compare None to an int,
    and DuckDB's placement is a session setting rather than a property of the
    query."""
    return tuple((value is None, value) for value in row)


@pytest.mark.parametrize("table", sorted(PARQUET_KEYS))
def test_published_parquet_rows_are_ordered_by_their_key(con, tmp_path, table):
    publish(con, tmp_path, DUMP, None)
    columns = ", ".join(PARQUET_KEYS[table])
    path = (tmp_path / f"{table}.parquet").as_posix()
    rows = con.execute(f"SELECT {columns} FROM read_parquet('{path}')").fetchall()
    assert rows == sorted(rows, key=nulls_last)


@pytest.mark.parametrize("export", sorted(WEB_KEYS))
def test_web_export_rows_are_ordered_by_their_key(con, tmp_path, export):
    publish(con, tmp_path, DUMP, None)
    data = read_web(tmp_path, export)
    rows = list(zip(*(data[column] for column in WEB_KEYS[export]), strict=True))
    assert rows == sorted(rows, key=nulls_last)


@pytest.mark.parametrize("export", sorted(WEB_KEYS))
def test_web_export_carries_no_timestamp(con, tmp_path, export):
    # Ordering the rows is not enough for a reproducible delivery: the gzip
    # header holds an mtime field, so the same bytes compressed twice differ.
    # Asserted on the header rather than by publishing twice and diffing —
    # mtime has one-second resolution, and two publications of the fixtures
    # land in the same second, so the comparison would sleep on the bug.
    publish(con, tmp_path, DUMP, None)
    header = (tmp_path / "web" / f"{export}.json.gz").read_bytes()[:8]
    assert int.from_bytes(header[4:8], "little") == 0


def test_manifest_carries_the_digest_of_every_delivered_file(con, tmp_path):
    # The delivery is byte-reproducible, which is only useful if the digests
    # travel with it: without them a consumer cannot tell a truncated download
    # from a complete one, nor an unchanged export from a new one, and the
    # reproducibility cannot be checked by anyone but the producer. Compared as
    # sets, so a file pruned from a previous schema cannot linger in the
    # manifest either.
    manifest = publish(con, tmp_path, DUMP, None)
    delivered = {
        path.relative_to(tmp_path).as_posix()
        for path in tmp_path.rglob("*")
        if path.is_file() and path.name != "manifest.json"
    }
    assert set(manifest["output_sha256"]) == delivered
    for name, digest in manifest["output_sha256"].items():
        assert digest == sha256_file(tmp_path / name)


def read_frieze_blob(raw):
    """Mirrors what the browser does: a header, then typed-array views."""
    assert raw[:4] == b"MFZ1"
    n, pairs = struct.unpack_from("<II", raw, 8)
    o = 16
    name_offsets = struct.unpack_from(f"<{n + 1}I", raw, o)
    o += 4 * (n + 1)
    genre_offsets = struct.unpack_from(f"<{n + 1}I", raw, o)
    o += 4 * (n + 1)
    spans = struct.unpack_from(f"<{2 * n}H", raw, o)
    o += 4 * n
    genre_ids = struct.unpack_from(f"<{pairs}H", raw, o)
    o += 2 * pairs
    albums = struct.unpack_from(f"<{n}B", raw, o)
    o += n
    names = raw[o:]
    return {
        "n": n,
        "pairs": pairs,
        "spans": spans,
        "albums": albums,
        "genre_ids": genre_ids,
        "genre_offsets": genre_offsets,
        "names": [names[name_offsets[i] : name_offsets[i + 1] - 1].decode() for i in range(n)],
    }


def test_frieze_blob_round_trips_every_band(con, tmp_path):
    path = tmp_path / "frieze.bin.gz"
    written = write_frieze_blob(con, path)
    blob = read_frieze_blob(gzip.decompress(path.read_bytes()))
    expected = con.execute(
        "SELECT name, y0, y1, ended, y_end_is_declared, n_albums FROM frieze ORDER BY i"
    ).fetchall()
    assert written == blob["n"] == len(expected)
    assert blob["names"] == [r[0] for r in expected]
    for i, (_, y0, y1, ended, declared, n_albums) in enumerate(expected):
        assert blob["spans"][2 * i] & 0x7FFF == y0
        assert blob["spans"][2 * i + 1] & 0x7FFF == y1
        assert bool(blob["spans"][2 * i] >> 15) == ended
        assert bool(blob["spans"][2 * i + 1] >> 15) == declared
        assert blob["albums"][i] == n_albums


def test_frieze_blob_genre_ids_round_trip_through_the_published_vocabulary(con, tmp_path):
    # genre_ids stores indices into web/genres.json.gz's row order, not mbids:
    # if the vocabulary were ever built in a different order on either side,
    # every genre in the blob would silently point at the wrong name.
    # The delivered file is read back as the expected vocabulary, never the
    # SELECT write_frieze_blob itself uses: the two orders are fixed by two
    # independent literals — a local one in publish.py, ORDER_BY["genres"] for
    # the JSON — and re-deriving one of them here would compare it to itself.
    publish(con, tmp_path, DUMP, None)
    blob = read_frieze_blob(gzip.decompress((tmp_path / "web" / "frieze.bin.gz").read_bytes()))
    vocabulary = read_web(tmp_path, "genres")["genre_mbid"]
    expected = con.execute(
        "SELECT f.i, coalesce(list_transform(b.genres, g -> g.mbid), []) "
        "FROM frieze f JOIN bands b ON b.mbid = f.mbid ORDER BY f.i"
    ).fetchall()
    for i, genre_mbids in expected:
        start, end = blob["genre_offsets"][i], blob["genre_offsets"][i + 1]
        decoded = {vocabulary[gid] for gid in blob["genre_ids"][start:end]}
        assert decoded == set(genre_mbids)


def test_frieze_blob_sections_are_aligned_for_typed_arrays(con, tmp_path):
    # A TypedArray whose byteOffset is not a multiple of its element size throws
    # RangeError in the browser, so the offsets are asserted rather than hoped
    # for. Computed the way a reader computes them, from the header alone.
    path = tmp_path / "frieze.bin.gz"
    write_frieze_blob(con, path)
    raw = gzip.decompress(path.read_bytes())
    n, pairs = struct.unpack_from("<II", raw, 8)
    name_offsets_at = 16
    genre_offsets_at = name_offsets_at + 4 * (n + 1)
    spans_at = genre_offsets_at + 4 * (n + 1)
    genre_ids_at = spans_at + 4 * n
    albums_at = genre_ids_at + 2 * pairs
    assert name_offsets_at % 4 == 0
    assert genre_offsets_at % 4 == 0
    assert spans_at % 2 == 0
    assert genre_ids_at % 2 == 0
    assert albums_at + n <= len(raw)


def test_frieze_blob_carries_no_timestamp(con, tmp_path):
    path = tmp_path / "frieze.bin.gz"
    write_frieze_blob(con, path)
    assert int.from_bytes(path.read_bytes()[4:8], "little") == 0


def test_lineage_blob_round_trips_every_edge(con, tmp_path):
    # Read the way a browser reads it: three typed-array views over one buffer,
    # each at an offset the reader derives from the header alone.
    path = tmp_path / "lineage.bin.gz"
    written = write_lineage_blob(con, path)
    raw = gzip.decompress(path.read_bytes())
    assert raw[:4] == b"MLN1"
    assert struct.unpack_from("<H", raw, 4)[0] == 1
    n = struct.unpack_from("<I", raw, 8)[0]
    assert n == written
    src_at, dst_at = 12, 12 + 4 * n
    shared_at = dst_at + 4 * n
    assert src_at % 4 == 0
    assert dst_at % 4 == 0
    assert len(raw) == shared_at + n
    src = struct.unpack_from(f"<{n}I", raw, src_at)
    dst = struct.unpack_from(f"<{n}I", raw, dst_at)
    shared = struct.unpack_from(f"<{n}B", raw, shared_at)
    assert (
        list(zip(src, dst, shared, strict=True))
        == con.execute("SELECT src, dst, shared FROM lineage ORDER BY src, dst").fetchall()
    )


def test_lineage_blob_carries_no_timestamp(con, tmp_path):
    path = tmp_path / "lineage.bin.gz"
    write_lineage_blob(con, path)
    assert int.from_bytes(path.read_bytes()[4:8], "little") == 0


def test_frieze_ids_are_raw_sixteen_byte_uuids_in_row_order(con, tmp_path):
    # Published without gzip: UUIDs do not compress, and the row order is what
    # makes the join to frieze.bin implicit. The header is what lets a reader
    # refuse a stale cached copy: paired with a fresh frieze.bin it would
    # misattribute every name, and only frieze.bin could say what it was.
    path = tmp_path / "frieze_ids.bin"
    written = write_frieze_ids(con, path)
    raw = path.read_bytes()
    assert raw[:4] == b"MID1"
    assert struct.unpack_from("<H", raw, 4)[0] == 1
    assert struct.unpack_from("<I", raw, 8)[0] == written
    assert len(raw) == 16 + written * 16
    got = [raw[16 * (k + 1) : 16 * (k + 2)].hex() for k in range(written)]
    expected = con.execute("SELECT mbid FROM frieze ORDER BY i").fetchall()
    assert got == [mbid.replace("-", "") for (mbid,) in expected]


def test_manifest_counts_the_blobs_from_what_was_written(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    assert manifest["counts"]["frieze"] == con.execute("SELECT count(*) FROM frieze").fetchone()[0]
    assert (
        manifest["counts"]["lineage"] == con.execute("SELECT count(*) FROM lineage").fetchone()[0]
    )


def test_publish_refuses_to_deliver_blobs_that_disagree_on_the_band_count(
    con, tmp_path, monkeypatch
):
    # frieze.bin.gz and frieze_ids.bin are joined by row position and nothing
    # else, so a count that drifts between the two shifts every name after the
    # divergence with no other symptom. The serialisers' return values are the
    # only place that can be seen, which is why they are no longer discarded.
    monkeypatch.setattr(
        musilogy.publish, "write_frieze_ids", lambda con, path: write_frieze_ids(con, path) - 1
    )
    with pytest.raises(ValueError, match=r"frieze_ids\.bin"):
        publish(con, tmp_path, DUMP, None)


def test_publish_delivers_the_three_blobs_and_digests_them(con, tmp_path):
    manifest = publish(con, tmp_path, DUMP, None)
    for name in ("web/frieze.bin.gz", "web/lineage.bin.gz", "web/frieze_ids.bin"):
        assert (tmp_path / name).exists()
        assert name in manifest["output_sha256"]


def test_publish_prunes_a_stale_file_left_in_a_subdirectory_of_web(con, tmp_path):
    # The pruning loop and the digest walk must agree on what web/ contains:
    # with iterdir the nested file survived pruning and was digested as
    # delivered, so the manifest announced a file no run had written.
    nested = tmp_path / "web" / "old"
    nested.mkdir(parents=True)
    stale = nested / "bands_timeline.json.gz"
    stale.write_bytes(b"stale")
    manifest = publish(con, tmp_path, DUMP, None)
    assert not stale.exists()
    assert "web/old/bands_timeline.json.gz" not in manifest["output_sha256"]


def test_publish_prunes_a_stale_blob_but_keeps_the_ones_it_just_wrote(con, tmp_path):
    # The widened pruning loop walks every file in web/, not just *.json.gz:
    # this fails if the three blob names are missing from `written`, since the
    # loop would then delete the very files write_frieze_blob and friends just
    # wrote.
    web = tmp_path / "web"
    web.mkdir(parents=True)
    stale = web / "old.bin"
    stale.write_bytes(b"stale")
    publish(con, tmp_path, DUMP, None)
    assert not stale.exists()
    for name in ("frieze.bin.gz", "lineage.bin.gz", "frieze_ids.bin"):
        assert (web / name).exists()
