import duckdb
import pytest

from musilogy import REFERENCE_DUMP
from musilogy.build import build, check_invariants
from musilogy.paths import SQL_DIR, work_dir

# artists: 682 447 groups, orchestras and choirs, plus 1 599 244 persons. Every
# count the persons moved splits along type: restricted to the other types, the
# source breakdowns, placeable, the anomalies, the demo and live measurements and
# the count without album give back the figures they had before persons joined.
BASELINE = {
    "artists": 2_281_691,
    "albums": 1_290_584,
    "genres": 1_729,
    "density": 58_767,
    "links": 771_147,
    "lineage": 32_667,
}
# links: every artist-to-artist relation, oriented source -> target and
# de-duplicated across the two artists that carry it. Memberships replace the
# former `members` table (601 759 rows), which read them from the band's side:
# it kept members that are not artists of this pipeline, now cut and counted,
# and published 2 397 group-in-group memberships reversed.
LINK_TYPE_BREAKDOWN = {
    "member of band": 588_501,
    "is person": 68_334,
    "teacher": 29_242,
    "parent": 15_520,
    "sibling": 14_961,
    "married": 9_719,
    "collaboration": 8_176,
    "founder": 7_328,
    "conductor position": 7_062,
    "instrumental supporting musician": 5_487,
    "subgroup": 3_424,
    "tribute": 2_780,
    "supporting musician": 2_512,
    "vocal supporting musician": 2_138,
    "artist rename": 1_847,
    "involved with": 1_770,
    "artistic director": 1_212,
    "named after artist": 666,
    "voice actor": 235,
    "composer-in-residence": 227,
    "artist-in-residence": 6,
}
# lineage reads three link types, one row per pair and source: the teacher
# pairs taught over several spans of years (20) and one tribute pair recorded
# twice are why these sit below their LINK_TYPE_BREAKDOWN counts.
LINEAGE_SOURCE_BREAKDOWN = {"mb_teacher": 29_222, "mb_tribute": 2_779, "mb_named_after": 666}
# Links with an end outside `artists` (characters, untyped artists...).
LINK_EXCLUSIONS = {"to_unextracted_artist": 38_442}
# What the density exclusion rule (55_genre_reliability.sql) costs: 13 genres,
# 4 311 (band, genre) pairs, 1 011 cells and 37 138 band-years. artists, albums,
# genres and links keep every one of them — population and projection are
# different things, and only the projection narrows.
DENSITY_EXCLUSIONS = {"genres": 13, "artist_genre_pairs": 4_311}
# Witness measurements of the multi-artist bias, from both extremes: classical
# loses almost all its candidate credits, alternative metal almost none. A
# definition computed from `albums` instead of raw_release_groups, or one that
# forgot to explode the credited artists, moves these.
MULTI_ARTIST_DROP = {
    "classical": (27_199, 94.3),
    "orchestral": (3_771, 86.3),
    "string quartet": (2_866, 83.3),
    "jazz": (13_410, 13.4),
    "rock": (37_870, 1.8),
    "alternative metal": (3_006, 0.6),
}
Y0_SOURCE_BREAKDOWN = {"declared": 235_246, "first_album": 346_442, None: 1_700_003}
Y_END_SOURCE_BREAKDOWN = {"declared": 147_025, "last_album": 438_801, None: 1_695_865}
# 25_band_genres.sql: the declared genres win, the albums take over. Every
# count below that moved when it landed splits exactly along this column —
# restricted to 'declared' artists, density, present and the excluded pairs give
# back their previous values (52 201, 1 972 825 and 1 554).
GENRE_SOURCE_BREAKDOWN = {"declared": 199_611, "albums": 153_624, None: 1_928_456}
PLACEABLE = 581_688
DENSITY_PRESENT = 4_242_411
# The date readings the dump loses, and the album inferences the guards of
# 30_bands_lifespan.sql refuse. Frozen here too: a guard that stops firing is
# as much a regression as a count that moves.
DATE_ANOMALIES = {
    "begin_illegible": 34,
    "end_illegible": 35,
    "begin_future": 15,
    "end_future": 11,
    "begin_below_min_year": 258,
    "end_below_min_year": 6_493,
    "end_before_begin": 3,
    "birth_illegible": 8_962,
    "birth_future": 2,
}
NEUTRALISED_INFERENCES = {
    "first_album_after_declared_end": 2_000,
    "last_album_before_declared_begin": 271,
    "first_album_with_begin_below_min_year": 73,
    "album_with_end_below_min_year": 235,
    "first_album_with_birth_below_min_year": 326,
    "first_album_before_birth": 32,
    "last_album_before_birth": 17,
}
# The measurements that argue for a rule of 20_albums.sql rather than describe
# an output: accepting Demo and excluding Live are decisions these numbers
# justify, and the README used to be their only home — where they drifted.
# (release-groups both demo and studio, of which demo first, median years earlier)
DEMO_BEFORE_STUDIO = (3_723, 2_297, 3.0)
# Artists carrying a live release dated more than 20 years after their last studio
# album: the reason a live date is not evidence of activity.
LIVE_LONG_AFTER_LAST_STUDIO = 914
BANDS_WITHOUT_ALBUM = 1_801_156
WORK = work_dir(REFERENCE_DUMP)


def test_the_baseline_looks_for_the_extractions_at_an_absolute_path():
    # Relative to the cwd, this suite skipped silently outside the repo root:
    # a green run that checked nothing. The skip must mean "no extraction on
    # disk", never "wrong directory".
    assert WORK.is_absolute()


def single_row(con, table):
    result = con.execute(f"SELECT * FROM {table}")
    return dict(zip([c[0] for c in result.description], result.fetchone(), strict=True))


@pytest.mark.slow
def test_reference_dump_matches_the_baseline():
    if not (WORK / "artists.jsonl").exists() or not (WORK / "release_groups.jsonl").exists():
        pytest.skip("extractions missing: run Task 3")
    con = duckdb.connect(":memory:")
    build(con, SQL_DIR, WORK / "artists.jsonl", WORK / "release_groups.jsonl", None)
    assert check_invariants(con, SQL_DIR) == []
    for table, expected in BASELINE.items():
        row = con.execute(f"SELECT count(*) FROM {table}").fetchone()
        assert row is not None
        got = row[0]
        assert got == expected, f"{table}: expected {expected}, got {got}"

    for column, expected_breakdown in (
        ("y0_source", Y0_SOURCE_BREAKDOWN),
        ("y_end_source", Y_END_SOURCE_BREAKDOWN),
        ("genre_source", GENRE_SOURCE_BREAKDOWN),
    ):
        got_breakdown = dict(
            con.execute(f"SELECT {column}, count(*) FROM artists GROUP BY {column}").fetchall()
        )
        assert got_breakdown == expected_breakdown, column

    row = con.execute("SELECT count(*) FROM artists WHERE y0 IS NOT NULL").fetchone()
    assert row is not None
    assert row[0] == PLACEABLE

    # The cell count alone says nothing about what fills the cells: a band
    # gained or lost inside an existing (genre, year) moves present without
    # moving the count.
    row = con.execute("SELECT sum(present) FROM density").fetchone()
    assert row is not None
    assert row[0] == DENSITY_PRESENT

    assert single_row(con, "r2_anomalies") == DATE_ANOMALIES
    assert single_row(con, "neutralised_inferences") == NEUTRALISED_INFERENCES
    assert single_row(con, "density_exclusions") == DENSITY_EXCLUSIONS
    assert single_row(con, "link_exclusions") == LINK_EXCLUSIONS
    assert dict(con.execute("SELECT type, count(*) FROM links GROUP BY type").fetchall()) == (
        LINK_TYPE_BREAKDOWN
    )
    assert (
        dict(con.execute("SELECT source, count(*) FROM lineage GROUP BY source").fetchall())
        == LINEAGE_SOURCE_BREAKDOWN
    )

    for name, expected_measure in MULTI_ARTIST_DROP.items():
        row = con.execute(
            "SELECT n_candidate_credits, multi_artist_drop_pct FROM genres WHERE name = ?", [name]
        ).fetchone()
        assert row == expected_measure, f"{name}: expected {expected_measure}, got {row}"

    # The rule empties the projection, never the vocabulary: not one excluded
    # genre keeps a density row, and `classical` is still a genre.
    row = con.execute(
        "SELECT count(DISTINCT d.genre_mbid) FROM density d JOIN genres g USING (genre_mbid) "
        "WHERE g.multi_artist_drop_pct >= 50 AND g.n_candidate_credits >= 200"
    ).fetchone()
    assert row is not None
    assert row[0] == 0
    row = con.execute("SELECT count(*) FROM genres WHERE name = 'classical'").fetchone()
    assert row is not None
    assert row[0] == 1

    row = con.execute(
        "SELECT count(*) FROM artists WHERE y_end IS NOT NULL AND y0 IS NOT NULL AND y_end < y0"
    ).fetchone()
    assert row is not None
    assert row[0] == 0

    row = con.execute(
        """
        WITH cred AS (
          SELECT list_distinct(artists)[1] AS artist_mbid, yr(date) AS y,
                 coalesce(secondary, []) AS sec
          FROM raw_release_groups
          WHERE len(list_distinct(artists)) = 1
            AND yr(date) BETWEEN 1850 AND 2026
        ),
        pairs AS (
          SELECT c.artist_mbid,
                 min(c.y) FILTER (WHERE list_contains(c.sec, 'Demo')) AS y_demo,
                 min(c.y) FILTER (WHERE len(c.sec) = 0) AS y_studio
          FROM cred c JOIN artists b ON b.mbid = c.artist_mbid
          GROUP BY c.artist_mbid
          HAVING y_demo IS NOT NULL AND y_studio IS NOT NULL
        )
        SELECT count(*), count(*) FILTER (WHERE y_demo < y_studio),
               median(y_studio - y_demo) FILTER (WHERE y_demo < y_studio)
        FROM pairs
        """
    ).fetchone()
    assert row == DEMO_BEFORE_STUDIO

    row = con.execute(
        """
        SELECT count(DISTINCT l.artist_mbid) FROM (
          SELECT list_distinct(artists)[1] AS artist_mbid, yr(date) AS y
          FROM raw_release_groups
          WHERE list_contains(coalesce(secondary, []), 'Live')
            AND len(list_distinct(artists)) = 1
            AND yr(date) IS NOT NULL
            AND yr(date) BETWEEN 1850 AND 2026
        ) l JOIN artists b ON b.mbid = l.artist_mbid
        WHERE b.y_last_album IS NOT NULL AND l.y - b.y_last_album > 20
        """
    ).fetchone()
    assert row is not None
    assert row[0] == LIVE_LONG_AFTER_LAST_STUDIO

    row = con.execute(
        "SELECT count(*) FROM artists b WHERE NOT EXISTS "
        "(SELECT 1 FROM albums a WHERE a.artist_mbid = b.mbid)"
    ).fetchone()
    assert row is not None
    assert row[0] == BANDS_WITHOUT_ALBUM
