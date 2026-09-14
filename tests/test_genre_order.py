import duckdb


def test_cooccurrence_pairs_are_unordered_and_unique(con: duckdb.DuckDBPyConnection) -> None:
    row = con.execute("SELECT count(*) FROM genre_cooccurrence WHERE genre_a >= genre_b").fetchone()
    assert row is not None
    assert row[0] == 0


def test_cooccurrence_counts_the_bands_two_genres_share(con: duckdb.DuckDBPyConnection) -> None:
    # The witnesses are small enough to state the answer independently: this
    # recomputes the count from bands rather than from the table under test.
    rows = con.execute(
        "SELECT co.genre_a, co.genre_b, co.n_bands, ("
        "  SELECT count(*) FROM frieze f JOIN bands b ON b.mbid = f.mbid"
        "  WHERE list_contains(list_transform(b.genres, g -> g.mbid), co.genre_a)"
        "    AND list_contains(list_transform(b.genres, g -> g.mbid), co.genre_b)"
        ") AS recomputed FROM genre_cooccurrence co"
    ).fetchall()
    assert rows
    assert all(n == recomputed for _, _, n, recomputed in rows)


def test_cosine_is_the_shared_count_over_the_geometric_mean(con: duckdb.DuckDBPyConnection) -> None:
    row = con.execute(
        "SELECT count(*) FROM genre_cooccurrence co "
        "WHERE abs(co.cosine - co.n_bands / sqrt("
        "  (SELECT count(*) FROM frieze f JOIN bands b ON b.mbid = f.mbid"
        "     WHERE list_contains(list_transform(b.genres, g -> g.mbid), co.genre_a))::DOUBLE"
        "  * (SELECT count(*) FROM frieze f JOIN bands b ON b.mbid = f.mbid"
        "     WHERE list_contains(list_transform(b.genres, g -> g.mbid), co.genre_b))"
        ")) > 1e-12"
    ).fetchone()
    assert row is not None
    assert row[0] == 0
