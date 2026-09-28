def end_of(con, mbid):
    return con.execute("SELECT y_presence_end FROM presence WHERE mbid = ?", [mbid]).fetchone()[0]


def test_declared_end_wins_over_a_later_album(con):
    # Cardiacs: declared end 2020, album retained in 2025.
    assert end_of(con, "f7338f2a-136b-4d5e-b099-5504cf997f58") == 2020


def test_active_band_is_not_stopped_at_its_last_album(con):
    # U2: no declared end, last album 2025.
    assert end_of(con, "a3cb23fc-acd3-4ce0-8f36-1e5aa6a18432") == 2025


def test_band_without_album_is_present_only_at_formation(con):
    # ROD: formed in 1996, no album retained.
    assert end_of(con, "3cb86073-22d7-43d5-8f22-422b1e54988e") == 1996


def test_albums_before_formation_do_not_move_the_floor(con):
    # Polska Radio One: formed 2015, albums 2013 and 2014.
    assert end_of(con, "703c4c92-43f7-4268-9f85-0ca6f0cd1a22") == 2015


def test_an_album_predating_the_declared_begin_is_not_an_end(con):
    # Polska Radio One again, the witness of the 265-row defect: its last
    # album (2014) predates its declared begin (2015), so it says nothing
    # about an end. y_end used to be published as 2015 — the declared begin —
    # labelled y_end_source = 'last_album'. Presence still ends in 2015, by
    # coalesce(y_end, y0), which is the whole point: the false label is gone
    # and the projection is unchanged.
    assert con.execute(
        "SELECT y0, y_last_album, y_end, y_end_source FROM artists WHERE mbid = ?",
        ["703c4c92-43f7-4268-9f85-0ca6f0cd1a22"],
    ).fetchone() == (2015, 2014, None, None)


def test_no_band_is_present_after_its_declared_end(con):
    assert con.execute("""
        SELECT count(*) FROM presence p JOIN artists b USING (mbid)
        WHERE b.y_end_declared IS NOT NULL AND p.y_presence_end > b.y_end_declared
    """).fetchall() == [(0,)]


def test_presence_end_is_published_on_artists(con):
    assert con.execute("""
        SELECT count(*) FROM artists b JOIN presence p USING (mbid)
        WHERE b.y_presence_end IS DISTINCT FROM p.y_presence_end
    """).fetchall() == [(0,)]
