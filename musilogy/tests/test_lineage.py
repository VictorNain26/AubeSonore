import pytest
from conftest import SQL, build_synthetic, synthetic_artist
from test_invariants import restored

from musilogy.build import check_invariants

PUPIL = "00000000-0000-4000-8000-0000000000b1"
MASTER = "00000000-0000-4000-8000-0000000000b2"


def relation(kind, direction, target, begin=None):
    return {"type": kind, "direction": direction, "mbid": target, "begin": begin, "end": None}


def lineage(con):
    return con.execute(
        "SELECT artist_mbid, model_mbid, source FROM lineage ORDER BY ALL"
    ).fetchall()


def two_persons(tmp_path, master_relations, pupil_relations=()):
    return build_synthetic(
        tmp_path,
        [
            synthetic_artist(MASTER, "1900", None, relations=master_relations, kind="Person"),
            synthetic_artist(PUPIL, "1930", None, relations=list(pupil_relations), kind="Person"),
        ],
    )


def test_a_teacher_is_the_model_of_the_pupil(tmp_path):
    # MusicBrainz carries `teacher` forward on the teacher. A rule that read
    # every type as "source takes after target" makes the master the pupil.
    c = two_persons(tmp_path, [relation("teacher", "forward", PUPIL)])
    assert lineage(c) == [(PUPIL, MASTER, "mb_teacher")]


def test_a_tribute_takes_its_target_as_model(tmp_path):
    c = two_persons(tmp_path, [], [relation("tribute", "forward", MASTER)])
    assert lineage(c) == [(PUPIL, MASTER, "mb_tribute")]


def test_a_pair_taught_over_two_spans_is_one_lineage_row(tmp_path):
    # links keeps both spans; lineage has no years, so they are one assertion.
    c = two_persons(
        tmp_path,
        [
            relation("teacher", "forward", PUPIL, "1950"),
            relation("teacher", "forward", PUPIL, "1960"),
        ],
    )
    assert lineage(c) == [(PUPIL, MASTER, "mb_teacher")]


def test_a_membership_is_no_lineage(tmp_path):
    c = two_persons(tmp_path, [], [relation("member of band", "forward", MASTER)])
    assert lineage(c) == []


BACH = "24f1766e-9635-4d58-a4d4-9413f9f98a4c"
BEATLES = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d"
FLEETWOOD_MAC = "bd13909f-1c29-4c27-a874-d4aaf27c5b1a"


def test_the_witnesses_carry_each_source_in_its_direction(con):
    # Transcribed from the witnesses as literals: Bach learnt from Johann
    # Christoph Bach, Beatallica plays The Beatles, The New Fleetwood Mac took
    # its name from Fleetwood Mac.
    assert con.execute(
        "SELECT a.name, l.source, m.name FROM lineage l "
        "JOIN artists a ON a.mbid = l.artist_mbid JOIN artists m ON m.mbid = l.model_mbid "
        "WHERE l.artist_mbid IN ('24f1766e-9635-4d58-a4d4-9413f9f98a4c', "
        "'8602561b-caa1-4ef7-9501-a4159b3a41c3', 'a20a7e3a-e343-4592-bc06-684b67a31241') "
        "ORDER BY 1"
    ).fetchall() == [
        ("Beatallica", "mb_tribute", "The Beatles"),
        ("Johann Sebastian Bach", "mb_teacher", "Johann Christoph Bach"),
        ("The New Fleetwood Mac", "mb_named_after", "Fleetwood Mac"),
    ]


@pytest.mark.parametrize(
    ("where", "param"),
    [
        # A teacher relation is carried by the model, a tribute by the artist:
        # each direction of the restatement in the invariant has its own case.
        ("artist_mbid = ?", BACH),
        ("model_mbid = ? AND source = 'mb_tribute'", BEATLES),
    ],
)
def test_lineage_misoriented_catches_a_reversed_row(con, where, param):
    row = con.execute(
        f"SELECT artist_mbid, model_mbid, source FROM lineage WHERE {where}", [param]
    ).fetchone()
    artist, model, source = row
    with restored(
        con,
        (
            "DELETE FROM lineage WHERE artist_mbid = ? AND model_mbid = ? AND source = ?",
            [model, artist, source],
        ),
        ("INSERT INTO lineage VALUES (?, ?, ?)", [artist, model, source]),
    ):
        con.execute(
            "UPDATE lineage SET artist_mbid = ?, model_mbid = ? "
            "WHERE artist_mbid = ? AND model_mbid = ? AND source = ?",
            [model, artist, artist, model, source],
        )
        violations = dict(check_invariants(con, SQL))
    assert violations.get("lineage_misoriented") == 1
