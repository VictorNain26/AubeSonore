import pytest
from conftest import (
    BAND_CLEAN,
    BAND_EXCLUDED,
    BAND_EXCLUDED_2,
    build_synthetic,
    synthetic_artist,
    synthetic_release_group,
    unreliable_genre_records,
)


@pytest.fixture(scope="module")
def c(tmp_path_factory):
    artists, release_groups = unreliable_genre_records()
    return build_synthetic(tmp_path_factory.mktemp("reliability"), artists, release_groups)


def measurement(con, genre_mbid):
    return con.execute(
        "SELECT n_candidate_credits, multi_artist_drop_pct FROM genres WHERE genre_mbid = ?",
        [genre_mbid],
    ).fetchone()


def density_rows(con, genre_mbid):
    return con.execute(
        "SELECT count(*) FROM density WHERE genre_mbid = ?", [genre_mbid]
    ).fetchone()[0]


def test_drop_pct_is_the_share_of_candidates_the_multi_artist_rule_removes(c):
    # Three rates on the same shape of data: a measurement that counted
    # release-groups instead of credited (band, genre) rows, or that dropped
    # the multi flag, moves at least one of them.
    assert measurement(c, "g-excluded") == (250, 100.0)
    assert measurement(c, "g-small") == (10, 100.0)
    assert measurement(c, "g-clean") == (250, 0.0)


def test_the_rate_is_measured_on_raw_release_groups_not_on_the_albums_table(c):
    # The crux of the definition. `albums` has already dropped every
    # multi-artist release-group, so band-excluded owns none: a rate computed
    # from `albums` would read 0% (or no row at all) on a genre that in fact
    # loses everything.
    assert c.execute(
        "SELECT count(*) FROM albums WHERE band_mbid = ?", [BAND_EXCLUDED]
    ).fetchone() == (0,)
    assert measurement(c, "g-excluded") == (250, 100.0)


def test_a_genre_with_no_candidate_release_group_has_a_count_but_no_rate(c):
    # Zero candidates is a measured fact; the share of zero is not. Publishing
    # 0.0 here would assert a measurement nobody could make.
    assert measurement(c, "g-orphan") == (0, None)


def test_a_genre_over_the_rate_but_under_the_sample_minimum_keeps_its_density(c):
    # g-small loses 100% of its candidates, like g-excluded, and differs from
    # it only by sample size. Drop the minimum from the rule and this fails.
    assert measurement(c, "g-small") == (10, 100.0)
    assert density_rows(c, "g-small") > 0


def test_a_genre_over_both_bounds_leaves_density_but_stays_in_the_vocabulary(c):
    assert density_rows(c, "g-excluded") == 0
    assert c.execute(
        "SELECT name, n_bands FROM genres WHERE genre_mbid = 'g-excluded'"
    ).fetchone() == ("excluded", 2)
    # Control: the rule removes that genre, not the projection as a whole.
    assert density_rows(c, "g-clean") > 0


def test_the_excluded_genre_stays_on_every_population_table(c):
    # Population and projection are different things: the exclusion belongs to
    # density alone. A rule applied one file too early would empty these.
    assert c.execute(
        "SELECT count(*) FROM bands b, UNNEST(b.genres) AS t(g) WHERE t.g.mbid = 'g-excluded'"
    ).fetchone() == (2,)
    assert c.execute(
        "SELECT count(*) FROM bands WHERE mbid IN (?, ?)", [BAND_EXCLUDED, BAND_EXCLUDED_2]
    ).fetchone() == (2,)


def test_the_sample_minimum_is_a_session_variable(tmp_path):
    # Same records, minimum lowered under g-small's 10 candidates: it must now
    # be excluded too. A minimum hardcoded in the SQL would ignore this.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups, min_candidate_credits=5)
    assert density_rows(c, "g-small") == 0
    assert density_rows(c, "g-clean") > 0


def test_the_rate_limit_is_a_session_variable(tmp_path):
    # Limit raised over g-excluded's 100%: nothing is excluded any more, and
    # the genre comes back into density. A limit hardcoded in the SQL would
    # keep it out.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups, multi_artist_drop_limit=100.1)
    assert density_rows(c, "g-excluded") > 0
    assert c.execute("SELECT * FROM density_exclusions").fetchone() == (0, 0)


def test_density_eligible_states_the_rule_instead_of_leaving_it_to_be_reapplied(c):
    # The three shapes: over both bounds, over the rate but under the sample,
    # and clean. A consumer reading this column needs neither threshold.
    eligible = dict(c.execute("SELECT genre_mbid, density_eligible FROM genres").fetchall())
    assert eligible == {
        "g-excluded": False,
        "g-small": True,
        "g-clean": True,
        "g-orphan": True,
    }


def test_a_genre_with_no_measurable_rate_stays_eligible(c):
    # NULL is not "over the limit": three-valued logic must not silence a genre
    # that has no candidate release-group at all.
    assert measurement(c, "g-orphan") == (0, None)
    assert c.execute(
        "SELECT density_eligible FROM genres WHERE genre_mbid = 'g-orphan'"
    ).fetchone() == (True,)


def test_the_rate_ignores_genres_a_band_only_takes_from_its_albums(tmp_path):
    # A band that declares nothing takes g-album from its three sole-credit
    # albums, yet seven more of its candidates are multi-artist. Measured on
    # `genres` the rate would read 70% over 10 credits; on genres_declared the
    # genre has no candidate at all. Album genres only ever come from
    # single-artist release-groups, so letting them in biases every rate down.
    album_genre = [{"mbid": "g-album", "name": "album", "votes": 1}]
    artists = [synthetic_artist(BAND_CLEAN, "1990", None, name="band-undeclared")]
    release_groups = [
        *(
            synthetic_release_group(f"rg-sole-{i}", BAND_CLEAN, "2000", genres=album_genre)
            for i in range(3)
        ),
        *(
            synthetic_release_group(f"rg-multi-{i}", BAND_CLEAN, "2000", co_artists=["guest"])
            for i in range(7)
        ),
    ]
    c = build_synthetic(tmp_path, artists, release_groups)
    assert c.execute("SELECT genre_source FROM bands WHERE mbid = ?", [BAND_CLEAN]).fetchone() == (
        "albums",
    )
    assert measurement(c, "g-album") == (0, None)
