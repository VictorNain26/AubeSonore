import re
from contextlib import contextmanager

import duckdb
import pytest
from conftest import FIX, SQL, build_synthetic, synthetic_artist, unreliable_genre_records

from musilogy.build import INVARIANTS, build, check_invariants
from musilogy.paths import SQL_DIR

# genre_unreliable_recomputed is a helper other invariants read, not itself an
# invariant (it legitimately returns rows): its exclusion from INVARIANTS is a
# written decision, not the oversight this test otherwise guards against.
VIEWS_NOT_CHECKED_AS_INVARIANTS = {"genre_unreliable_recomputed"}


@contextmanager
def restored(con, *undo):
    """Undo the mutation whatever happens. `con` is module-scoped: without a
    finally, a failing assertion would leave it mutated for every test after
    this one, and the failure would spread instead of staying local."""
    try:
        yield
    finally:
        for sql, params in undo:
            con.execute(sql, params)


def test_every_view_defined_in_90_invariants_is_registered_in_invariants():
    # Case this must catch: a view added to 90_invariants.sql without also
    # being added to build.INVARIANTS. check_invariants iterates INVARIANTS,
    # not the SQL file, so an unregistered view is created on every build and
    # never queried — it looks like a check and is not one. The campaign
    # crossed this seam three times by hand before this test existed.
    sql = (SQL_DIR / "90_invariants.sql").read_text(encoding="utf-8")
    defined_views = set(re.findall(r"CREATE OR REPLACE VIEW (\w+)", sql))
    assert defined_views - set(INVARIANTS) == VIEWS_NOT_CHECKED_AS_INVARIANTS


def test_build_skips_90_files():
    # Dedicated connection, never passed to check_invariants: on `con`
    # (module-scoped, shared by every test in this file), a previous run of
    # 90_invariants.sql would already have created duplicate_band, and this
    # test would only depend on its rank within the file.
    c = duckdb.connect(":memory:")
    build(c, SQL, FIX / "artists.jsonl", FIX / "release_groups.jsonl", None)
    with pytest.raises(duckdb.CatalogException):
        c.execute("SELECT * FROM duplicate_band")


def test_fixtures_satisfy_every_invariant(con):
    assert check_invariants(con, SQL) == []


def test_a_broken_invariant_is_reported(con):
    with restored(con, ("DELETE FROM albums WHERE band_mbid = 'inconnu'", [])):
        con.execute("INSERT INTO albums VALUES ('inconnu', 'rg', 'T', 1999, false)")
        violations = dict(check_invariants(con, SQL))
    assert violations.get("album_without_band") == 1


def test_album_without_band_survives_a_null_mbid_in_bands(con):
    # NOT IN used to go silent here: a single NULL mbid in the `bands`
    # subquery makes `x NOT IN (subquery)` never true, whatever x is, so a
    # real violation would go unreported. NOT EXISTS is NULL-safe.
    row = con.execute("SELECT * FROM bands LIMIT 1").fetchone()
    cols = [d[0] for d in con.description]
    values = list(row)
    values[cols.index("mbid")] = None
    placeholders = ", ".join("?" for _ in cols)
    with restored(
        con,
        ("DELETE FROM albums WHERE band_mbid = 'inconnu-null-poison'", []),
        ("DELETE FROM bands WHERE mbid IS NULL", []),
    ):
        con.execute(
            "INSERT INTO albums VALUES ('inconnu-null-poison', 'rg-null-poison', 'T', 1999, false)"
        )
        con.execute(f"INSERT INTO bands VALUES ({placeholders})", values)
        violations = dict(check_invariants(con, SQL))
    assert violations.get("album_without_band") == 1


def test_duplicate_band_is_reported(con):
    row = con.execute("SELECT * FROM bands LIMIT 1").fetchone()
    cols = [d[0] for d in con.description]
    placeholders = ", ".join("?" for _ in cols)
    mbid = row[cols.index("mbid")]
    with restored(
        con,
        (
            "DELETE FROM bands WHERE mbid = ? AND rowid IN "
            "(SELECT rowid FROM bands WHERE mbid = ? LIMIT 1)",
            [mbid, mbid],
        ),
    ):
        con.execute(f"INSERT INTO bands VALUES ({placeholders})", row)
        violations = dict(check_invariants(con, SQL))
    assert violations.get("duplicate_band") == 1


def test_duplicate_band_catches_null_mbid(con):
    row = con.execute("SELECT * FROM bands LIMIT 1").fetchone()
    cols = [d[0] for d in con.description]
    values = list(row)
    values[cols.index("mbid")] = None
    placeholders = ", ".join("?" for _ in cols)
    with restored(con, ("DELETE FROM bands WHERE mbid IS NULL", [])):
        con.execute(f"INSERT INTO bands VALUES ({placeholders})", values)
        violations = dict(check_invariants(con, SQL))
    assert violations.get("duplicate_band") == 1


def test_band_out_of_window_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute("SELECT y0 FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y0 = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y0 = 1700 WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("band_out_of_window") == 1


def test_end_before_begin_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands WHERE y0 IS NOT NULL LIMIT 1").fetchone()[0]
    y0 = con.execute("SELECT y0 FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    original = con.execute("SELECT y_end FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y_end = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y_end = ? WHERE mbid = ?", [y0 - 1, mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("end_before_begin") == 1


def test_end_after_dump_year_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute("SELECT y_end_declared FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y_end_declared = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y_end_declared = 2100 WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("end_after_dump_year") == 1


def test_end_before_min_year_is_reported(con):
    # The end's lower bound, the twin of end_after_dump_year: four artists of
    # the reference dump declare an end in 1537, 1761, 1781 and 1814.
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute(
        "SELECT y_end_declared, y_end FROM bands WHERE mbid = ?", [mbid]
    ).fetchone()
    with restored(
        con,
        (
            "UPDATE bands SET y_end_declared = ?, y_end = ? WHERE mbid = ?",
            [*original, mbid],
        ),
    ):
        con.execute("UPDATE bands SET y_end_declared = 1537, y_end = 1537 WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("end_before_min_year") == 1


def test_contractual_bounds_are_not_read_from_the_session_variables():
    # Built with dump_year = 2030, the production rules accept Thunder Jolt's
    # declared end in 2027 and Inspiral Carpets' 2027 album, and presence and
    # density stretch past 2026. The invariants must not follow the variable:
    # [1850, 2026] is the reference dump's contract, hardcoded in
    # 90_invariants.sql, and moving to another dump is a deliberate edit there
    # — that edit is the point of the check. Reading getvariable('dump_year')
    # back made all four views agree with whatever the production rules did.
    c = duckdb.connect(":memory:")
    build(c, SQL, FIX / "artists.jsonl", FIX / "release_groups.jsonl", None, dump_year=2030)
    assert dict(check_invariants(c, SQL)) == {
        "end_after_dump_year": 1,
        "album_out_of_window": 1,
        "presence_out_of_range": 2,
        "density_out_of_range": 7,
    }


def test_last_album_mismatch_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands WHERE y_last_album IS NOT NULL LIMIT 1").fetchone()[
        0
    ]
    original = con.execute("SELECT y_last_album FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y_last_album = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y_last_album = ? WHERE mbid = ?", [original - 1, mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("last_album_mismatch") == 1


def test_album_out_of_window_is_reported(con):
    rg_mbid = con.execute("SELECT rg_mbid FROM albums LIMIT 1").fetchone()[0]
    original = con.execute("SELECT y FROM albums WHERE rg_mbid = ?", [rg_mbid]).fetchone()[0]
    # 2027: past dump_year (2026) for *any* band, whichever one LIMIT 1
    # returns. 2026 fell within the acceptance window for 133 of the 181
    # fixture bands and only passed by luck of sort order.
    with restored(con, ("UPDATE albums SET y = ? WHERE rg_mbid = ?", [original, rg_mbid])):
        con.execute("UPDATE albums SET y = 2027 WHERE rg_mbid = ?", [rg_mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("album_out_of_window") == 1


def test_album_extra_secondary_type_is_reported(con):
    rg_mbid = con.execute("SELECT rg_mbid FROM albums LIMIT 1").fetchone()[0]
    original = con.execute(
        "SELECT secondary FROM raw_release_groups WHERE mbid = ?", [rg_mbid]
    ).fetchone()[0]
    with restored(
        con,
        ("UPDATE raw_release_groups SET secondary = ? WHERE mbid = ?", [original, rg_mbid]),
    ):
        con.execute("UPDATE raw_release_groups SET secondary = ['Live'] WHERE mbid = ?", [rg_mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("album_extra_secondary_type") == 1


def test_first_album_mismatch_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands WHERE y_first_album IS NOT NULL LIMIT 1").fetchone()[
        0
    ]
    original = con.execute("SELECT y_first_album FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y_first_album = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y_first_album = ? WHERE mbid = ?", [original - 1, mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("first_album_mismatch") == 1


def test_y0_source_mismatch_is_reported_when_source_disagrees_with_the_value(con):
    mbid = con.execute("SELECT mbid FROM bands WHERE y0_source = 'declared' LIMIT 1").fetchone()[0]
    original = con.execute("SELECT y0 FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y0 = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y0 = ? WHERE mbid = ?", [original - 1, mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("y0_source_mismatch") == 1


def test_y0_source_mismatch_is_reported_when_source_is_null_but_y0_is_not(con):
    mbid = con.execute("SELECT mbid FROM bands WHERE y0_source IS NULL LIMIT 1").fetchone()[0]
    with restored(con, ("UPDATE bands SET y0 = NULL, y0_source = NULL WHERE mbid = ?", [mbid])):
        con.execute("UPDATE bands SET y0 = 1999, y0_source = NULL WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("y0_source_mismatch") == 1


def test_y_end_source_mismatch_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands WHERE y_end_source = 'declared' LIMIT 1").fetchone()[
        0
    ]
    original = con.execute("SELECT y_end FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y_end = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y_end = ? WHERE mbid = ?", [original - 1, mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("y_end_source_mismatch") == 1


def test_y_end_source_mismatch_catches_a_last_album_label_naming_another_value(con):
    # The shape of the 265 published rows: y_end holds the declared *begin*
    # while y_end_source says 'last_album'. The invariant used to copy the
    # production expression — greatest(y_last_album, coalesce(y0_declared,
    # ...)) — which returns exactly that wrong value, so it stayed empty while
    # its own stated contract was violated. Asserted as a contract
    # ('last_album' => y_end = y_last_album), it fires.
    mbid = con.execute(
        "SELECT mbid FROM bands WHERE y_end_source = 'last_album' LIMIT 1"
    ).fetchone()[0]
    original = con.execute(
        "SELECT y0_declared, y_first_album, y_last_album, y_end FROM bands WHERE mbid = ?", [mbid]
    ).fetchone()
    with restored(
        con,
        (
            "UPDATE bands SET y0_declared = ?, y_first_album = ?, y_last_album = ?, y_end = ? "
            "WHERE mbid = ?",
            [*original, mbid],
        ),
    ):
        con.execute(
            "UPDATE bands SET y0_declared = 2005, y_first_album = NULL, y_last_album = 1959, "
            "y_end = 2005 WHERE mbid = ?",
            [mbid],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("y_end_source_mismatch") == 1


def test_density_population_mismatch_is_reported(con):
    genre_mbid, year, original_present = con.execute(
        "SELECT genre_mbid, year, present FROM density LIMIT 1"
    ).fetchone()
    with restored(
        con,
        (
            "UPDATE density SET present = ? WHERE genre_mbid = ? AND year = ?",
            [original_present, genre_mbid, year],
        ),
    ):
        con.execute(
            "UPDATE density SET present = ? WHERE genre_mbid = ? AND year = ?",
            [original_present + 1, genre_mbid, year],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("density_population_mismatch") == 1


def test_band_genres_out_of_order_is_reported(con):
    mbid = con.execute(
        "SELECT mbid FROM bands WHERE len(genres) > 1 AND genre_source = 'declared' LIMIT 1"
    ).fetchone()[0]
    original = con.execute("SELECT genres FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    restore = "UPDATE bands SET genres = ?, genres_declared = ? WHERE mbid = ?"
    with restored(con, (restore, [original, original, mbid])):
        # Both lists together: reversing `genres` alone is a genre_source_mismatch.
        con.execute(
            "UPDATE bands SET genres = list_reverse(genres), "
            "genres_declared = list_reverse(genres_declared) WHERE mbid = ?",
            [mbid],
        )
        reversed_genres = con.execute("SELECT genres FROM bands WHERE mbid = ?", [mbid]).fetchone()[
            0
        ]
        violations = dict(check_invariants(con, SQL))
    assume_effective = reversed_genres != original
    assert assume_effective
    assert violations.get("band_genres_out_of_order") == 1


def test_a_source_that_does_not_name_the_list_genres_came_from_is_reported(con):
    # Joy Division declares genres, so `genres` is its declared list; calling
    # that list `albums` is the mislabel genre_source exists to prevent.
    joy_division = "9a58fda3-f4ed-4080-a3a5-f457aac9fcdd"
    with restored(
        con, ("UPDATE bands SET genre_source = 'declared' WHERE mbid = ?", [joy_division])
    ):
        con.execute("UPDATE bands SET genre_source = 'albums' WHERE mbid = ?", [joy_division])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("genre_source_mismatch") == 1


def test_album_genres_that_disagree_with_the_albums_are_reported(con):
    # The Belle Stars' genres come from its albums; one vote more on the first
    # of them is a sum the release-groups do not add up to.
    belle_stars = "62f7a211-0056-45fe-934a-37a388a7356f"
    original = con.execute(
        "SELECT genres_from_albums FROM bands WHERE mbid = ?", [belle_stars]
    ).fetchone()[0]
    restore = "UPDATE bands SET genres_from_albums = ?, genres = ? WHERE mbid = ?"
    with restored(con, (restore, [original, original, belle_stars])):
        con.execute(
            "UPDATE bands SET genres_from_albums = list_transform(genres_from_albums, "
            "(g, i) -> CASE WHEN i = 1 THEN {'mbid': g.mbid, 'name': g.name, 'votes': g.votes + 1} "
            "ELSE g END) WHERE mbid = ?",
            [belle_stars],
        )
        con.execute("UPDATE bands SET genres = genres_from_albums WHERE mbid = ?", [belle_stars])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("genres_from_albums_mismatch") == 1


def test_unknown_genre_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute("SELECT genres FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET genres = ? WHERE mbid = ?", [original, mbid])):
        con.execute(
            "UPDATE bands SET genres = list_append(genres, "
            "{'mbid': 'inconnu', 'name': 'x', 'votes': 1}) WHERE mbid = ?",
            [mbid],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("unknown_genre") == 1


def test_unknown_genre_survives_a_null_genre_mbid_in_the_vocabulary(con):
    # Same NULL trap as album_without_band: a NULL genre_mbid in the
    # `genres` subquery used to make NOT IN never true. Demonstrated in
    # review on this exact invariant.
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute("SELECT genres FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(
        con,
        ("UPDATE bands SET genres = ? WHERE mbid = ?", [original, mbid]),
        ("DELETE FROM genres WHERE genre_mbid IS NULL", []),
    ):
        con.execute(
            "UPDATE bands SET genres = list_append(genres, "
            "{'mbid': 'inconnu-null-poison', 'name': 'x', 'votes': 1}) WHERE mbid = ?",
            [mbid],
        )
        # Named columns, not positional: this row exists to poison genre_mbid
        # with a NULL, and it must not have to be rewritten every time the
        # vocabulary gains a column it says nothing about.
        con.execute(
            "INSERT INTO genres (genre_mbid, name, n_bands) VALUES (NULL, 'null-poison', 0)"
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("unknown_genre") == 1


def test_genre_n_bands_mismatch_is_reported(con):
    genre_mbid = con.execute("SELECT genre_mbid FROM genres LIMIT 1").fetchone()[0]
    original = con.execute(
        "SELECT n_bands FROM genres WHERE genre_mbid = ?", [genre_mbid]
    ).fetchone()[0]
    with restored(
        con, ("UPDATE genres SET n_bands = ? WHERE genre_mbid = ?", [original, genre_mbid])
    ):
        con.execute(
            "UPDATE genres SET n_bands = ? WHERE genre_mbid = ?", [original + 1, genre_mbid]
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("genre_n_bands_mismatch") == 1


def test_presence_out_of_range_is_reported(con):
    mbid = con.execute("SELECT mbid FROM presence LIMIT 1").fetchone()[0]
    original = con.execute("SELECT y_presence_end FROM presence WHERE mbid = ?", [mbid]).fetchone()[
        0
    ]
    with restored(con, ("UPDATE presence SET y_presence_end = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE presence SET y_presence_end = 2100 WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("presence_out_of_range") == 1


def test_presence_end_mismatch_is_reported(con):
    mbid = con.execute("SELECT mbid FROM presence LIMIT 1").fetchone()[0]
    original = con.execute("SELECT y_presence_end FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET y_presence_end = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET y_presence_end = ? WHERE mbid = ?", [original - 1, mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("presence_end_mismatch") == 1


def test_density_out_of_range_is_reported(con):
    row = con.execute("SELECT * FROM density LIMIT 1").fetchone()
    cols = [d[0] for d in con.description]
    genre_mbid = row[cols.index("genre_mbid")]
    with restored(
        con,
        ("DELETE FROM density WHERE genre_mbid = ? AND year = 2100", [genre_mbid]),
    ):
        con.execute(
            f"INSERT INTO density VALUES ({', '.join('?' for _ in cols)})",
            [genre_mbid, 2100, row[cols.index("present")]],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("density_out_of_range") == 1


def test_density_out_of_range_is_reported_below_1850(con):
    row = con.execute("SELECT * FROM density LIMIT 1").fetchone()
    cols = [d[0] for d in con.description]
    genre_mbid = row[cols.index("genre_mbid")]
    with restored(
        con,
        ("DELETE FROM density WHERE genre_mbid = ? AND year = 1700", [genre_mbid]),
    ):
        con.execute(
            f"INSERT INTO density VALUES ({', '.join('?' for _ in cols)})",
            [genre_mbid, 1700, row[cols.index("present")]],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("density_out_of_range") == 1


def test_density_above_band_count_catches_a_genre_absent_from_the_vocabulary(con):
    with restored(con, ("DELETE FROM density WHERE genre_mbid = 'inconnu' AND year = 1900", [])):
        con.execute("INSERT INTO density VALUES ('inconnu', 1900, 1)")
        violations = dict(check_invariants(con, SQL))
    assert violations.get("density_above_band_count") == 1


def test_density_excluded_genre_present_is_reported(tmp_path):
    # Own connection, own records: no witness genre reaches 200 candidate
    # release-groups, so the shared fixtures cannot exercise this rule at all.
    # The view recomputes the rule from raw_release_groups and bands; it must
    # stay empty on a correct build and fire on a smuggled-in row.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    assert check_invariants(c, SQL) == []

    c.execute("INSERT INTO density VALUES ('g-excluded', 1990, 1)")
    violations = dict(check_invariants(c, SQL))
    assert violations.get("density_excluded_genre_present") == 1


def test_density_excluded_genre_present_does_not_read_back_the_published_measurement(tmp_path):
    # Wiping the published rate leaves the raw evidence untouched, so the
    # invariant must still fire: an implementation that filtered on
    # genres.multi_artist_drop_pct would go silent here — exactly the failure
    # that once let 265 real violations through.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    c.execute("INSERT INTO density VALUES ('g-excluded', 1990, 1)")
    c.execute("UPDATE genres SET multi_artist_drop_pct = 0, n_candidate_credits = 0")
    violations = dict(check_invariants(c, SQL))
    assert violations.get("density_excluded_genre_present") == 1


def test_density_above_band_count_is_reported(con):
    genre_mbid, year, original_present = con.execute(
        "SELECT genre_mbid, year, present FROM density LIMIT 1"
    ).fetchone()
    n_bands = con.execute(
        "SELECT n_bands FROM genres WHERE genre_mbid = ?", [genre_mbid]
    ).fetchone()[0]
    with restored(
        con,
        (
            "UPDATE density SET present = ? WHERE genre_mbid = ? AND year = ?",
            [original_present, genre_mbid, year],
        ),
    ):
        con.execute(
            "UPDATE density SET present = ? WHERE genre_mbid = ? AND year = ?",
            [n_bands + 1, genre_mbid, year],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("density_above_band_count") == 1


def test_member_without_band_is_reported(con):
    with restored(con, ("DELETE FROM members WHERE band_mbid = 'inconnu'", [])):
        con.execute("INSERT INTO members VALUES ('inconnu', 'person', 1999, NULL)")
        violations = dict(check_invariants(con, SQL))
    assert violations.get("member_without_band") == 1


def test_member_without_band_survives_a_null_mbid_in_bands(con):
    # Same NULL trap as album_without_band: a single NULL mbid in the `bands`
    # subquery makes `x NOT IN (subquery)` never true, whatever x is, so the
    # invariant would go silent on every real violation. NOT EXISTS is NULL-safe.
    row = con.execute("SELECT * FROM bands LIMIT 1").fetchone()
    cols = [d[0] for d in con.description]
    values = list(row)
    values[cols.index("mbid")] = None
    placeholders = ", ".join("?" for _ in cols)
    with restored(
        con,
        ("DELETE FROM members WHERE band_mbid = 'inconnu-null-poison'", []),
        ("DELETE FROM bands WHERE mbid IS NULL", []),
    ):
        con.execute("INSERT INTO members VALUES ('inconnu-null-poison', 'person', 1999, NULL)")
        con.execute(f"INSERT INTO bands VALUES ({placeholders})", values)
        violations = dict(check_invariants(con, SQL))
    assert violations.get("member_without_band") == 1


def test_member_without_person_is_reported(con):
    band_mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    with restored(con, ("DELETE FROM members WHERE person_mbid IS NULL", [])):
        con.execute("INSERT INTO members VALUES (?, NULL, 1999, NULL)", [band_mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("member_without_person") == 1


def test_duplicate_member_is_reported(con):
    # NULL years on purpose: a duplicate must be caught on the pair alone,
    # and GROUP BY has to treat two NULL edges as the same relation, exactly
    # as the DISTINCT of 80_members.sql collapses them.
    row = con.execute("SELECT * FROM members LIMIT 1").fetchone()
    placeholders = ", ".join("?" for _ in row)
    with restored(con, ("DELETE FROM members WHERE person_mbid = 'duplicate-person'", [])):
        for _ in range(2):
            con.execute(
                f"INSERT INTO members VALUES ({placeholders})",
                [row[0], "duplicate-person", None, None],
            )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("duplicate_member") == 1


def test_corrections_file_too_large_is_reported(con):
    with restored(con, ("DELETE FROM corrections", [])):
        con.execute(
            "INSERT INTO corrections SELECT 'm' || i, 'begin', '2000', 'j', 's' "
            "FROM range(51) AS t(i)"
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("corrections_file_too_large") == 1


def test_corrections_invalid_is_reported(con):
    # Three real silent no-ops: an unknown mbid, a misspelled field (typo),
    # and a field unsupported by apply_corrections.
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    with restored(
        con,
        (
            "DELETE FROM corrections WHERE mbid = 'inconnu' OR field IN ('Begin', 'country')",
            [],
        ),
    ):
        con.execute(
            "INSERT INTO corrections VALUES "
            "('inconnu', 'begin', '2000', 'j', 's'), "
            f"('{mbid}', 'Begin', '2000', 'j', 's'), "
            f"('{mbid}', 'country', 'FR', 'j', 's')"
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("corrections_invalid") == 3


def test_density_missing_cell_is_reported(con):
    # density_population_mismatch iterates over the rows that exist, so a
    # deleted cell is simply never examined. A production change that drops
    # cells — a join that loses rows, a filter applied one file too early —
    # was caught by nothing but the baseline, and only on the reference dump.
    genre_mbid, year, present = con.execute(
        "SELECT genre_mbid, year, present FROM density LIMIT 1"
    ).fetchone()
    with restored(con, ("INSERT INTO density VALUES (?, ?, ?)", [genre_mbid, year, present])):
        con.execute("DELETE FROM density WHERE genre_mbid = ? AND year = ?", [genre_mbid, year])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("density_missing_cell") == 1


def test_density_missing_cell_does_not_demand_the_cells_the_exclusion_withholds(tmp_path):
    # The symmetric trap: an invariant that enumerated expected cells without
    # recomputing the exclusion would demand a row for every excluded genre and
    # fire on a correct build. g-excluded legitimately owns no cell at all.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    assert check_invariants(c, SQL) == []
    assert c.execute("SELECT count(*) FROM density WHERE genre_mbid = 'g-excluded'").fetchone() == (
        0,
    )


def test_density_missing_cell_does_not_read_back_the_published_measurement(tmp_path):
    # Same rationale as density_excluded_genre_present: wiping the published
    # rate leaves the raw evidence untouched. An implementation that read
    # genres.multi_artist_drop_pct would start demanding g-excluded's cells.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    c.execute("UPDATE genres SET multi_artist_drop_pct = 0, n_candidate_credits = 0")
    assert check_invariants(c, SQL) == []


def test_band_unexpected_type_is_reported(con):
    # extract.py keeps {Group, Orchestra, Choir} and nothing states that
    # contract in SQL, while 60_density.sql depends on type = 'Group'. A change
    # to KEPT_TYPES moved both the population and the projection in silence.
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute("SELECT type FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET type = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET type = 'Person' WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("band_unexpected_type") == 1


def test_band_unexpected_type_catches_a_null_type(con):
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    original = con.execute("SELECT type FROM bands WHERE mbid = ?", [mbid]).fetchone()[0]
    with restored(con, ("UPDATE bands SET type = ? WHERE mbid = ?", [original, mbid])):
        con.execute("UPDATE bands SET type = NULL WHERE mbid = ?", [mbid])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("band_unexpected_type") == 1


def test_corrections_duplicate_is_reported(con):
    mbid = con.execute("SELECT mbid FROM bands LIMIT 1").fetchone()[0]
    with restored(con, ("DELETE FROM corrections WHERE justification = 'dup'", [])):
        con.execute(
            "INSERT INTO corrections VALUES (?, 'begin', '2000', 'dup', 's'), "
            "(?, 'begin', '1999', 'dup', 's')",
            [mbid, mbid],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("corrections_duplicate") == 1


def test_corrections_invalid_survives_a_null_mbid_in_raw_artists(con):
    # Same NULL trap as album_without_band and unknown_genre: a NULL mbid
    # in the `raw_artists` subquery used to make NOT IN never true.
    with restored(
        con,
        ("DELETE FROM raw_artists WHERE mbid IS NULL", []),
        ("DELETE FROM corrections WHERE mbid = 'inconnu-null-poison'", []),
    ):
        con.execute(
            "INSERT INTO raw_artists VALUES "
            "(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)"
        )
        con.execute(
            "INSERT INTO corrections VALUES ('inconnu-null-poison', 'begin', '2000', 'j', 's')"
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("corrections_invalid") == 1


def test_frieze_population_mismatch_is_reported(con):
    # Two fixture bands are Group with a y0 and carry only ineligible genres:
    # density gives them no cell, so the frieze owes them no row. Adding one at
    # the end keeps the index dense, which is the point — the population is
    # wrong and nothing else is.
    mbid = con.execute("""
        SELECT b.mbid FROM bands b
        WHERE b.type = 'Group' AND b.y0 IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM frieze f WHERE f.mbid = b.mbid)
        LIMIT 1
    """).fetchone()[0]
    with restored(con, ("DELETE FROM frieze WHERE mbid = ?", [mbid])):
        con.execute(
            "INSERT INTO frieze SELECT (SELECT max(i) + 1 FROM frieze), b.mbid, b.name, "
            "b.y0, b.y_presence_end, coalesce(b.ended, false), false, 0 "
            "FROM bands b WHERE b.mbid = ?",
            [mbid],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("frieze_population_mismatch") == 1


def test_frieze_missing_band_is_reported(con):
    # The case frieze_population_mismatch cannot see: a band dropped from the
    # projection. row_number() renumbers densely over what is left, the three
    # blobs stay mutually consistent, and the delivery quietly ships a narrower
    # population than density. The last row is removed so the index stays dense
    # and this is the only thing that breaks.
    row = con.execute("SELECT * FROM frieze WHERE i = (SELECT max(i) FROM frieze)").fetchone()
    placeholders = ", ".join("?" for _ in row)
    with restored(con, (f"INSERT INTO frieze VALUES ({placeholders})", list(row))):
        con.execute("DELETE FROM frieze WHERE i = ?", [row[0]])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("frieze_missing_band") == 1


def test_frieze_index_broken_is_reported(con):
    # A gap, not a duplicate: the blobs address a band by its row index, so a
    # hole shifts every band after it while every row still looks individually
    # sound.
    last = con.execute("SELECT max(i) FROM frieze").fetchone()[0]
    with restored(con, ("UPDATE frieze SET i = ? WHERE i = ?", [last, last + 1])):
        con.execute("UPDATE frieze SET i = ? WHERE i = ?", [last + 1, last])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("frieze_index_broken") == 1


def test_frieze_year_unencodable_is_reported(con):
    # y1 < y0 is the reachable half: y0 and y1 are SMALLINT, so the 32767 bound
    # cannot be exceeded without the column overflowing first.
    row = con.execute("SELECT i, y0, y1 FROM frieze ORDER BY i LIMIT 1").fetchone()
    i, y0, y1 = row
    with restored(con, ("UPDATE frieze SET y1 = ? WHERE i = ?", [y1, i])):
        con.execute("UPDATE frieze SET y1 = ? WHERE i = ?", [y0 - 1, i])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("frieze_year_unencodable") == 1


FRIEZE_GENRE = [{"mbid": "g-frieze", "name": "frieze", "votes": 1}]
WELL_FORMED_BAND = "00000000-0000-4000-8000-000000000021"
# Two hex characters short of a UUID, the shape that corrupts silently: an odd
# number of hex characters would make bytes.fromhex raise, an even one writes a
# 15-byte record into frieze_ids.bin and slides every offset after it.
TRUNCATED_BAND = "00000000-0000-4000-8000-0000000000"


def test_frieze_mbid_unencodable_is_reported(tmp_path):
    # Built from a dump, not mutated after the fact: unlike every other frieze
    # invariant, this one guards a value the layer receives rather than one it
    # computes, and nothing upstream constrains an mbid — extract.py and
    # 10_bands.sql carry it through as a VARCHAR. So the malformed shape can
    # genuinely arrive, and the test has to show it arriving. A well-formed
    # band travels beside it, so the count is the malformed one and not the
    # population.
    c = build_synthetic(
        tmp_path,
        [
            synthetic_artist(WELL_FORMED_BAND, "1990", None, genres=FRIEZE_GENRE),
            synthetic_artist(TRUNCATED_BAND, "1991", None, genres=FRIEZE_GENRE),
        ],
    )
    assert c.execute("SELECT count(*) FROM frieze").fetchone()[0] == 2, (
        "the malformed mbid must reach frieze, or this test proves nothing"
    )
    violations = dict(check_invariants(c, SQL))
    assert violations.get("frieze_mbid_unencodable") == 1


def test_lineage_mismatch_is_reported_in_both_directions(con):
    # The three views this replaced compared lineage to the expression that
    # produced it and could not fire at all. Each of the three ways the table
    # can be wrong is exercised here: an edge that should not exist, one that
    # should and does not, and a right pair carrying a wrong weight.
    edges = con.execute("SELECT src, dst, shared FROM lineage ORDER BY src, dst").fetchall()
    assert edges, "the fixtures must carry at least one edge for this test to mean anything"
    src, dst, shared = edges[0]

    with restored(con, ("DELETE FROM lineage WHERE src = 0 AND dst = 1", [])):
        con.execute("INSERT INTO lineage VALUES (0, 1, 1)")
        violations = dict(check_invariants(con, SQL))
    assert violations.get("lineage_mismatch") == 1

    with restored(con, ("INSERT INTO lineage VALUES (?, ?, ?)", [src, dst, shared])):
        con.execute("DELETE FROM lineage WHERE src = ? AND dst = ?", [src, dst])
        violations = dict(check_invariants(con, SQL))
    assert violations.get("lineage_mismatch") == 1

    with restored(
        con, ("UPDATE lineage SET shared = ? WHERE src = ? AND dst = ?", [shared, src, dst])
    ):
        con.execute(
            "UPDATE lineage SET shared = ? WHERE src = ? AND dst = ?", [shared + 1, src, dst]
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("lineage_mismatch") == 1


def test_lineage_mismatch_does_not_read_back_the_published_row_index(con):
    # The recomputation joins through frieze.mbid, never frieze.i: reusing the
    # index the blobs publish would make a misassigned `i` agree with itself.
    # Swapping two rows' indices leaves `lineage` naming the old pair.
    a, b = con.execute("SELECT src, dst FROM lineage ORDER BY src, dst LIMIT 1").fetchone()
    swap = [
        ("UPDATE frieze SET i = -1 WHERE i = ?", [a]),
        ("UPDATE frieze SET i = ? WHERE i = ?", [a, b]),
        ("UPDATE frieze SET i = ? WHERE i = -1", [b]),
    ]
    with restored(con, *swap):
        for sql, params in swap:
            con.execute(sql, params)
        violations = dict(check_invariants(con, SQL))
    assert violations.get("lineage_mismatch")
