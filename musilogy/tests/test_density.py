from conftest import build_synthetic, synthetic_artist, unreliable_genre_records


def test_no_cell_after_the_dump_year(con):
    assert con.execute("SELECT count(*) FROM density WHERE year > 2026").fetchall() == [(0,)]


def test_present_never_exceeds_the_band_count(con):
    assert con.execute("""
        SELECT count(*) FROM density d JOIN genres g USING (genre_mbid)
        WHERE d.present > g.n_artists
    """).fetchall() == [(0,)]


def test_a_band_counts_in_each_of_its_genres(con):
    # Cardiacs carries 13 genres; each of them, not just the first, must
    # count it in 1990 (Cardiacs is present from 1977 to 2020).
    cardiacs = "f7338f2a-136b-4d5e-b099-5504cf997f58"
    covered, total = con.execute(
        """
        SELECT
          (SELECT count(DISTINCT d.genre_mbid) FROM density d
           WHERE d.year = 1990 AND d.genre_mbid IN (
             SELECT g.mbid FROM artists, UNNEST(artists.genres) AS t(g)
             WHERE artists.mbid = ?)),
          (SELECT count(*) FROM artists, UNNEST(artists.genres) AS t(g) WHERE artists.mbid = ?)
        """,
        [cardiacs, cardiacs],
    ).fetchone()
    assert covered == total


def test_density_respects_the_presence_window(con):
    # Genre exclusive to Cardiacs (n_artists = 1 in the fixtures): the observed
    # window is only its own, 1977-2020, with no gap or overflow.
    genre = "489ebed8-1299-4761-ba0b-29d381085f82"
    assert con.execute(
        "SELECT min(year), max(year), count(*) FROM density WHERE genre_mbid = ?",
        [genre],
    ).fetchone() == (1977, 2020, 44)


def test_activity_counts_a_band_once_whatever_its_genres(tmp_path):
    # Two genres, one band: density counts it twice a year, activity once.
    band = synthetic_artist(
        "00000000-0000-4000-8000-0000000000a1",
        "1980",
        "1982",
        genres=[
            {"mbid": "g-a", "name": "a", "votes": 2},
            {"mbid": "g-b", "name": "b", "votes": 1},
        ],
    )
    c = build_synthetic(tmp_path, [band])
    assert c.execute("SELECT year, groups FROM activity ORDER BY year").fetchall() == [
        (1980, 1),
        (1981, 1),
        (1982, 1),
    ]
    assert c.execute("SELECT sum(present) FROM density WHERE year = 1981").fetchone() == (2,)


def test_activity_leaves_out_a_band_whose_genres_are_all_excluded(tmp_path):
    # In 1990 four bands carry a genre; band-excluded carries only the one the
    # multi-artist rule excludes from density, so the year counts three.
    artists, release_groups = unreliable_genre_records()
    c = build_synthetic(tmp_path, artists, release_groups)
    assert c.execute("SELECT groups FROM activity WHERE year = 1990").fetchone() == (3,)
