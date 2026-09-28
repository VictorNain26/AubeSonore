from conftest import (
    BAND_CLEAN,
    build_synthetic,
    synthetic_artist,
    synthetic_release_group,
    unreliable_genre_records,
)

BJORK = "87c5dedd-371d-4a53-9f7f-80522fb7f3cb"
BOWIE = "5441c29d-3602-4898-b1a1-b77fa23b8e50"
BACH = "24f1766e-9635-4d58-a4d4-9413f9f98a4c"
SUMNER = "6fa2e161-200e-475a-8492-3755594581f9"
JOY_DIVISION = "9a58fda3-f4ed-4080-a3a5-f457aac9fcdd"
NEW_ORDER = "f1106b17-dcbb-45f6-b938-199ccfab50cc"


def edges(con, mbid):
    return con.execute(
        "SELECT y_birth, y0_declared, y0, y0_source, y_end, y_end_source FROM artists "
        "WHERE mbid = ?",
        [mbid],
    ).fetchone()


def test_a_birth_is_published_as_such_and_never_starts_the_activity(con):
    # Björk, born 1965, first album 1977: read as a formation, the birth would
    # win over the album and date her activity from the cradle.
    assert edges(con, BJORK) == (1965, None, 1977, "first_album", 2022, "last_album")


def test_a_death_ends_the_activity_whatever_was_released_after_it(con):
    # David Bowie died in 2016; albums credited to him run to 2025.
    assert edges(con, BOWIE) == (1947, None, 1967, "first_album", 2016, "declared")


def test_an_artist_dead_before_min_year_takes_no_date_from_recordings(con):
    # Bach died in 1750, his first album is dated 1961: every album postdates
    # the end, so neither edge may be inferred from them.
    assert con.execute(
        "SELECT y_first_album, y_last_album FROM artists WHERE mbid = ?", [BACH]
    ).fetchone() == (1961, 2026)
    assert edges(con, BACH) == (1685, None, None, None, None, None)


def test_a_membership_is_read_once_from_the_band_side(con):
    # The dump carries the relation on Bernard Sumner's record too, pointing
    # at the band: read from both sides it would publish him as a band whose
    # members are Joy Division and New Order.
    bands = {
        band
        for (band,) in con.execute(
            "SELECT band_mbid FROM members WHERE person_mbid = ?", [SUMNER]
        ).fetchall()
    }
    assert {JOY_DIVISION, NEW_ORDER} <= bands
    assert con.execute("SELECT count(*) FROM members WHERE band_mbid = ?", [SUMNER]).fetchone() == (
        0,
    )


def test_a_group_ended_before_min_year_takes_no_date_from_albums_either(tmp_path):
    # The guard is not specific to persons: a group whose declared end falls
    # below the floor gets no edge from albums released after it.
    c = build_synthetic(
        tmp_path,
        [synthetic_artist(BAND_CLEAN, None, "1840")],
        [synthetic_release_group("rg-1", BAND_CLEAN, "1990")],
    )
    assert c.execute("SELECT y0, y_end FROM artists WHERE mbid = ?", [BAND_CLEAN]).fetchone() == (
        None,
        None,
    )
    assert c.execute(
        "SELECT album_with_end_below_min_year FROM neutralised_inferences"
    ).fetchone() == (1,)


def test_persons_stay_out_of_the_genre_reliability_measurement(tmp_path):
    # A person carrying g-person loses all 250 of its candidates to the
    # multi-artist rule; measured, that would exclude the genre from a density
    # that never counts persons.
    genre = [{"mbid": "g-person", "name": "person", "votes": 1}]
    c = build_synthetic(
        tmp_path,
        [synthetic_artist(BAND_CLEAN, "1950", None, genres=genre, kind="Person")],
        [
            synthetic_release_group(f"rg-{i}", BAND_CLEAN, "2000", co_artists=["guest"])
            for i in range(250)
        ],
    )
    assert c.execute(
        "SELECT n_candidate_credits, multi_artist_drop_pct, density_eligible FROM genres "
        "WHERE genre_mbid = 'g-person'"
    ).fetchone() == (0, None, True)


def test_the_exclusion_counter_leaves_out_the_persons_density_never_counted(tmp_path):
    # g-excluded is excluded through its two bands; a person carrying it loses
    # nothing to the rule, since density never counted persons.
    artists, release_groups = unreliable_genre_records()
    composer = synthetic_artist(
        "00000000-0000-4000-8000-000000000009",
        "1900",
        None,
        genres=[{"mbid": "g-excluded", "name": "excluded", "votes": 1}],
        kind="Person",
    )
    c = build_synthetic(tmp_path, [*artists, composer], release_groups)
    assert c.execute("SELECT * FROM density_exclusions").fetchone() == (1, 2)
