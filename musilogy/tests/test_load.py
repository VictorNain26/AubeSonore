import json

import pytest
from conftest import loaded, pg_query, published, synthetic_artist

from musilogy.fetch import ChecksumError
from musilogy.load import LoadError, load

ME = "00000000-0000-4000-8000-0000000000c0"
A = "00000000-0000-4000-8000-0000000000c1"
B = "00000000-0000-4000-8000-0000000000c2"
C = "00000000-0000-4000-8000-0000000000c3"
LEEDS = ("area-leeds", "Leeds")
LONDON = ("area-london-uk", "London")
LONDON_ONTARIO = ("area-london-on", "London")


def genre(name):
    return {"mbid": f"g-{name}", "name": name, "votes": 1}


def group(mbid, begin="1978", end="1985", genres=("post-punk",), **place):
    return synthetic_artist(mbid, begin, end, genres=[genre(g) for g in genres], **place)


def contemporaries(conninfo, mbid=ME, page_size=100, page_offset=0):
    return [
        r[:4]
        for r in pg_query(
            conninfo,
            "SELECT mbid, scene, shared_genres, jaccard FROM "
            f"musilogy.contemporaries('{mbid}', {page_size}, {page_offset})",
        )
    ]


def test_years_that_do_not_overlap_are_no_contemporaries(tmp_path, pg):
    # B starts the year after ME ends: touching would be overlapping.
    loaded(
        tmp_path,
        pg,
        [
            group(ME, begin_area=LEEDS),
            group(A, "1984", "1990", begin_area=LEEDS),
            group(B, "1986", "1990", begin_area=LEEDS),
        ],
    )
    assert contemporaries(pg) == [(A, "begin_area", ["post-punk"], 1.0)]


def test_a_begin_area_matches_by_identity_not_by_name(tmp_path, pg):
    loaded(
        tmp_path,
        pg,
        [
            group(ME, begin_area=LONDON, country="GB"),
            group(A, begin_area=LONDON, country="GB"),
            group(B, begin_area=LONDON_ONTARIO, country="GB"),
        ],
    )
    assert [r[0] for r in contemporaries(pg)] == [A]


def test_without_a_begin_area_the_country_is_the_scene(tmp_path, pg):
    # A has a begin area of its own and still shares ME's country: the scene
    # is read from the artist asked about.
    loaded(
        tmp_path,
        pg,
        [group(ME, country="GB"), group(A, country="GB", begin_area=LEEDS), group(B, country="FR")],
    )
    assert contemporaries(pg) == [(A, "country", ["post-punk"], 1.0)]


def test_no_shared_genre_no_contemporary(tmp_path, pg):
    loaded(
        tmp_path, pg, [group(ME, begin_area=LEEDS), group(A, genres=("jazz",), begin_area=LEEDS)]
    )
    assert contemporaries(pg) == []


def test_the_list_is_ordered_by_jaccard_then_mbid(tmp_path, pg):
    # C and B tie at 1/3 and come out by mbid; A shares more, comes first.
    loaded(
        tmp_path,
        pg,
        [
            group(ME, genres=("post-punk", "new wave"), begin_area=LEEDS),
            group(C, genres=("post-punk", "rock"), begin_area=LEEDS),
            group(B, genres=("new wave", "rock"), begin_area=LEEDS),
            group(A, genres=("post-punk", "new wave", "rock"), begin_area=LEEDS),
        ],
    )
    assert [(r[0], round(r[3], 4)) for r in contemporaries(pg)] == [
        (A, 0.6667),
        (B, 0.3333),
        (C, 0.3333),
    ]


def test_shared_genres_follow_the_order_of_the_contemporary(tmp_path, pg):
    loaded(
        tmp_path,
        pg,
        [
            group(ME, genres=("post-punk", "new wave"), begin_area=LEEDS),
            group(A, genres=("new wave", "rock", "post-punk"), begin_area=LEEDS),
        ],
    )
    assert contemporaries(pg)[0][2] == ["new wave", "post-punk"]


def test_a_page_carries_the_total_of_the_whole_list(tmp_path, pg):
    loaded(
        tmp_path,
        pg,
        [group(ME, begin_area=LEEDS), *(group(m, begin_area=LEEDS) for m in (A, B, C))],
    )
    page = pg_query(pg, f"SELECT mbid, total FROM musilogy.contemporaries('{ME}', 2, 1)")
    assert page == [(B, 3), (C, 3)]


def test_an_artist_without_a_year_has_no_contemporary_rather_than_a_guess(tmp_path, pg):
    loaded(
        tmp_path,
        pg,
        [group(ME, begin=None, end=None, begin_area=LEEDS), group(A, begin_area=LEEDS)],
    )
    assert contemporaries(pg) == []


def test_a_new_load_replaces_the_previous_one(tmp_path, pg):
    loaded(tmp_path / "first", pg, [group(ME), group(A)])
    loaded(tmp_path / "second", pg, [group(B)])
    assert pg_query(pg, "SELECT mbid FROM musilogy.artists") == [(B,)]


def test_a_load_that_falls_short_leaves_the_previous_one_in_place(tmp_path, pg):
    # The swap is the point: a staging schema that does not hold the whole
    # delivery must never replace what the site reads.
    loaded(tmp_path / "first", pg, [group(ME)])
    out = published(tmp_path / "second", [group(A), group(B)])
    manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    manifest["counts"]["artists"] += 1
    (out / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(LoadError):
        load(out, pg)
    assert pg_query(pg, "SELECT mbid FROM musilogy.artists") == [(ME,)]


def test_a_delivery_that_disagrees_with_its_manifest_is_refused(tmp_path):
    # Checked before any connection: no database is needed to refuse it.
    out = published(tmp_path, [group(ME)])
    with (out / "links.parquet").open("ab") as fh:
        fh.write(b"touched")
    with pytest.raises(ChecksumError):
        load(out, "host=unreachable.invalid")
