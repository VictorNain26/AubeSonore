import json

from conftest import (
    BAND_CLEAN,
    BAND_EXCLUDED,
    build_synthetic,
    loaded,
    pg_query,
    synthetic_artist,
    unreliable_genre_records,
)

from musilogy import REFERENCE_DUMP
from musilogy.load import load
from musilogy.publish import publish

A = "00000000-0000-4000-8000-0000000000f1"
B = "00000000-0000-4000-8000-0000000000f2"
C = "00000000-0000-4000-8000-0000000000f3"
D = "00000000-0000-4000-8000-0000000000f4"


def genre(name):
    return {"mbid": f"g-{name}", "name": name, "votes": 1}


def group(mbid, begin="1978", end="1985", genres=("post-punk",), relations=None):
    return synthetic_artist(
        mbid, begin, end, genres=[genre(g) for g in genres], relations=relations
    )


def relation(kind, target):
    return {"type": kind, "direction": "forward", "mbid": target, "begin": None, "end": None}


def window(conninfo, genre_mbid="g-post-punk", y_from=1970, y_to=1990, size=10, offset=0):
    return pg_query(
        conninfo,
        "SELECT mbid, listen_count, total FROM "
        f"musilogy.frieze_window('{genre_mbid}', {y_from}, {y_to}, {size}, {offset})",
    )


def test_the_window_puts_the_most_listened_first_and_the_unknown_last(tmp_path, pg):
    # C has no listen on ListenBrainz: it comes after every known artist, not
    # before them as a NULL sorted ascending would.
    loaded(tmp_path, pg, [group(A), group(B), group(C)], popularity={A: 10, B: 500})
    assert window(pg) == [(B, 500, 3), (A, 10, 3), (C, None, 3)]


def test_a_window_page_keeps_the_total_of_the_whole_window(tmp_path, pg):
    loaded(tmp_path, pg, [group(A), group(B), group(C)], popularity={A: 10, B: 500})
    assert window(pg, size=1, offset=1) == [(A, 10, 3)]


def test_the_window_holds_whoever_overlaps_the_period(tmp_path, pg):
    # A ends the year the window starts: present. D starts the year after it
    # ends: absent.
    loaded(
        tmp_path,
        pg,
        [group(A, "1970", "1980"), group(D, "1991", "1995")],
        popularity={},
    )
    assert [r[0] for r in window(pg, y_from=1980, y_to=1990)] == [A]


def test_the_window_reads_one_genre(tmp_path, pg):
    loaded(tmp_path, pg, [group(A), group(B, genres=("jazz",))], popularity={})
    assert [r[0] for r in window(pg)] == [A]
    assert [r[0] for r in window(pg, genre_mbid="g-jazz")] == [B]


def test_the_overview_leaves_out_the_genres_density_excludes(tmp_path, pg):
    tmp_path.mkdir(exist_ok=True)
    artists, release_groups = unreliable_genre_records()
    out = tmp_path / "out"
    publish(build_synthetic(tmp_path, artists, release_groups), out, REFERENCE_DUMP, None)
    load(out, pg)
    genres = {r[0] for r in pg_query(pg, "SELECT * FROM musilogy.frieze_genres()")}
    cells = {r[0] for r in pg_query(pg, "SELECT * FROM musilogy.frieze_density()")}
    assert "g-excluded" not in genres | cells
    assert "g-clean" in genres & cells
    # The excluded genre still exists for the window: excluded from the
    # overview, never from the population.
    excluded = pg_query(
        pg, "SELECT mbid FROM musilogy.frieze_window('g-excluded', 1850, 2026, 10, 0)"
    )
    assert BAND_EXCLUDED in {r[0] for r in excluded}
    assert BAND_CLEAN not in {r[0] for r in excluded}


def test_an_artist_unknown_to_listenbrainz_has_no_count_rather_than_zero(tmp_path, pg):
    loaded(tmp_path, pg, [group(A), group(B)], popularity={A: 42})
    cards = {
        r[0]: r
        for r in pg_query(
            pg,
            "SELECT mbid, listen_count, genres FROM musilogy.artist_card"
            f"('{A}') UNION ALL SELECT mbid, listen_count, genres FROM musilogy.artist_card('{B}')",
        )
    }
    assert cards[A][1] == 42
    assert cards[B][1] is None
    assert [g["name"] for g in json.loads(cards[A][2])] == ["post-punk"]


def test_a_link_reads_forward_from_its_source_and_backward_from_its_target(tmp_path, pg):
    loaded(tmp_path, pg, [group(A, relations=[relation("member of band", B)]), group(B)])
    assert pg_query(
        pg, f"SELECT type, direction, other_mbid FROM musilogy.artist_links('{A}')"
    ) == [("member of band", "forward", B)]
    assert pg_query(
        pg, f"SELECT type, direction, other_mbid FROM musilogy.artist_links('{B}')"
    ) == [("member of band", "backward", A)]


def test_a_teacher_is_an_inspiration_of_the_pupil_and_the_pupil_its_descendant(tmp_path, pg):
    # MusicBrainz carries `teacher` forward on the teacher (A teaches B).
    loaded(tmp_path, pg, [group(A, relations=[relation("teacher", B)]), group(B)])
    assert pg_query(pg, f"SELECT side, other_mbid, source FROM musilogy.artist_lineage('{B}')") == [
        ("inspiration", A, "mb_teacher")
    ]
    assert pg_query(pg, f"SELECT side, other_mbid, source FROM musilogy.artist_lineage('{A}')") == [
        ("descendant", B, "mb_teacher")
    ]
