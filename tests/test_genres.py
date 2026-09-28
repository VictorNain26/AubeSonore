OH3 = "125948ec-7f91-4d1a-8b83-accbf50fae3d"


def test_genres_are_sorted_by_votes_then_name(con):
    names = con.execute(
        "SELECT list_transform(genres, g -> g.name) FROM artists WHERE mbid = ?", [OH3]
    ).fetchone()[0]
    assert names[0] == "synth-pop"
    assert names[1:5] == ["crunkcore", "electronic", "electropop", "pop"]


def test_genres_table_counts_bands(con):
    assert (
        con.execute("""
        SELECT g.n_artists = (SELECT count(*) FROM artists b
                            WHERE list_contains(
                                list_transform(b.genres, x -> x.mbid), g.genre_mbid))
        FROM genres g
    """).fetchall()
        == [(True,)] * con.execute("SELECT count(*) FROM genres").fetchone()[0]
    )


def test_every_band_genre_exists_in_the_genres_table(con):
    # NOT EXISTS, not NOT IN: a single NULL genre_mbid in the subquery makes
    # `x NOT IN (subquery)` never true, so this test would pass whatever the
    # SQL does. A double built on the idiom the production SQL deliberately
    # dropped (e97d955, 983e57c) cannot reveal that the safe one broke.
    assert con.execute("""
        SELECT count(*) FROM (SELECT unnest(genres) AS g FROM artists) t
        WHERE NOT EXISTS (SELECT 1 FROM genres g WHERE g.genre_mbid = t.g.mbid)
    """).fetchall() == [(0,)]
