from conftest import build_synthetic, synthetic_artist

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


def contemporaries(con, mbid=ME):
    return con.execute(
        "SELECT mbid, scene, shared_genres, jaccard FROM contemporaries(?)", [mbid]
    ).fetchall()


def test_years_that_do_not_overlap_are_no_contemporaries(tmp_path):
    # B starts the year after ME ends: touching would be overlapping.
    c = build_synthetic(
        tmp_path,
        [
            group(ME, begin_area=LEEDS),
            group(A, "1984", "1990", begin_area=LEEDS),
            group(B, "1986", "1990", begin_area=LEEDS),
        ],
    )
    assert contemporaries(c) == [(A, "begin_area", ["post-punk"], 1.0)]


def test_a_begin_area_matches_by_identity_not_by_name(tmp_path):
    c = build_synthetic(
        tmp_path,
        [
            group(ME, begin_area=LONDON, country="GB"),
            group(A, begin_area=LONDON, country="GB"),
            group(B, begin_area=LONDON_ONTARIO, country="GB"),
        ],
    )
    assert [r[0] for r in contemporaries(c)] == [A]


def test_without_a_begin_area_the_country_is_the_scene(tmp_path):
    # A has a begin area of its own and still shares ME's country: the scene
    # is read from the artist asked about.
    c = build_synthetic(
        tmp_path,
        [
            group(ME, country="GB"),
            group(A, country="GB", begin_area=LEEDS),
            group(B, country="FR"),
        ],
    )
    assert contemporaries(c) == [(A, "country", ["post-punk"], 1.0)]


def test_no_shared_genre_no_contemporary(tmp_path):
    c = build_synthetic(
        tmp_path, [group(ME, begin_area=LEEDS), group(A, genres=("jazz",), begin_area=LEEDS)]
    )
    assert contemporaries(c) == []


def test_the_list_is_ordered_by_jaccard_then_mbid(tmp_path):
    # C and B tie at 1/3 and come out by mbid; A shares more, comes first.
    c = build_synthetic(
        tmp_path,
        [
            group(ME, genres=("post-punk", "new wave"), begin_area=LEEDS),
            group(C, genres=("post-punk", "rock"), begin_area=LEEDS),
            group(B, genres=("new wave", "rock"), begin_area=LEEDS),
            group(A, genres=("post-punk", "new wave", "rock"), begin_area=LEEDS),
        ],
    )
    assert [(r[0], round(r[3], 4)) for r in contemporaries(c)] == [
        (A, 0.6667),
        (B, 0.3333),
        (C, 0.3333),
    ]


def test_an_artist_without_a_year_has_no_contemporary_rather_than_a_guess(tmp_path):
    c = build_synthetic(
        tmp_path, [group(ME, begin=None, end=None, begin_area=LEEDS), group(A, begin_area=LEEDS)]
    )
    assert contemporaries(c) == []
