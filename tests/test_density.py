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
