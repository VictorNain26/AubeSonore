import pytest

from musilogy import REFERENCE_DUMP as DUMP
from musilogy import artist
from musilogy.cli import artist as artist_command
from musilogy.publish import publish

BACH = "24f1766e-9635-4d58-a4d4-9413f9f98a4c"
JOY_DIVISION = "9a58fda3-f4ed-4080-a3a5-f457aac9fcdd"
NINETY_NINE_DREAMS = "7b7f9365-45fc-43b0-a8c3-83f7451ddbd5"


@pytest.fixture(scope="module")
def published(con, tmp_path_factory):
    out = tmp_path_factory.mktemp("published")
    publish(con, out, DUMP, None)
    return out


def test_each_side_reads_the_term_of_its_source(published):
    # Bach is a pupil on one side of mb_teacher and a teacher on the other; a
    # term read from the wrong side calls Krebs Bach's teacher.
    con = artist.open_published(published)
    assert [(r.term, r.name) for r in artist.inspirations(con, BACH)] == [
        ("pupil of", "Johann Christoph Bach")
    ]
    by_name = {r.name: r.term for r in artist.descendants(con, BACH)}
    assert by_name["Johann Ludwig Krebs"] == "teacher of"
    assert by_name["Bachorchester Würzburg"] == "gave its name to"


def test_contemporaries_read_from_parquet_match_the_build(con, published):
    # The macro is defined over `artists` and must give the same answer on
    # the published Parquet as on the tables it was built with.
    # $.99 Dreams is the witness with more than one: the page of one is a cut.
    built = con.execute("SELECT mbid FROM contemporaries(?)", [NINETY_NINE_DREAMS]).fetchall()
    total, page = artist.contemporaries(artist.open_published(published), NINETY_NINE_DREAMS, 1)
    assert total == len(built) == 2
    assert [c.mbid for c in page] == [built[0][0]]


def test_an_artist_without_known_inspiration_says_so(published, capsys):
    artist_command(JOY_DIVISION, 5, published)
    out = capsys.readouterr().out
    inspirations = out.split("Inspirations\n", 1)[1].split("\n\n", 1)[0]
    assert inspirations == "  no known source"


def test_an_unknown_mbid_stops_the_command(published):
    with pytest.raises(SystemExit, match="unknown artist"):
        artist_command("00000000-0000-4000-8000-000000000000", 5, published)
