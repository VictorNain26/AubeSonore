import sqlite3
from pathlib import Path

import pytest

from radio.core.db import connect
from radio.library.match import (
    MatchReport,
    coverage,
    match_library,
    normalize,
    pick_match,
    search_query,
)
from radio.library.sync import sync_library
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable
from radio.sources.plex import PlexTrack


def dz(
    id: int, artist: str, title: str, dur: int, rank: int = 0, preview: bool = True
) -> DeezerTrack:
    return DeezerTrack(id, title, title, dur, rank, 100 + id, artist, preview)


@pytest.mark.parametrize(
    ("raw", "norm"),
    [
        ("Love Like Blood - 2007 Remaster", "love like blood"),
        ("Mannequin (2006 Remastered Version)", "mannequin"),
        ("Café Del Mar [Energy 52 Mix]", "cafe del mar"),
        ("Sorry for Laughing feat. Someone", "sorry for laughing"),
        ("Simon & Garfunkel", "simon and garfunkel"),
        ("The Feelies", "feelies"),
        ("(Interlude)", "interlude"),
        ("  Hey,   Boy!  ", "hey boy"),
    ],
)
def test_normalize(raw: str, norm: str) -> None:
    assert normalize(raw) == norm


def test_search_query_strips_quotes_and_decorations() -> None:
    assert search_query('Say "Hi"', "Mannequin (Remastered) - Live") == (
        'artist:"Say Hi" track:"Mannequin"'
    )


def test_pick_exact_prefers_preview_then_duration_then_rank() -> None:
    results = [
        dz(1, "Wire", "Mannequin", 157, rank=10, preview=False),
        dz(2, "Wire", "Mannequin", 159, rank=5),
        dz(3, "Wire", "Mannequin", 158, rank=1),
        dz(4, "Wire", "Mannequin", 158, rank=9),
    ]
    got = pick_match("Wire", "Mannequin", 157500, results, tolerance_s=3)
    assert got is not None and got.id == 4


def test_pick_rejects_wrong_artist_title_or_duration() -> None:
    assert pick_match("Wire", "Mannequin", 157000, [dz(1, "Wired", "Mannequin", 157)], 3) is None
    assert pick_match("Wire", "Mannequin", 157000, [dz(1, "Wire", "Manequin", 157)], 3) is None
    assert pick_match("Wire", "Mannequin", 157000, [dz(1, "Wire", "Mannequin", 161)], 3) is None


class FakeDeezer:
    def __init__(self, answers: dict[str, list[DeezerTrack] | Exception]) -> None:
        self.answers = answers
        self.queries: list[str] = []

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        self.queries.append(query)
        a = self.answers[query]
        if isinstance(a, Exception):
            raise a
        return a


def setup(tmp_path: Path) -> sqlite3.Connection:
    conn = connect(tmp_path / "db")
    sync_library(
        conn,
        [
            PlexTrack("1", "Wire", "Mannequin", "Pink Flag", 157000, 3),
            PlexTrack("2", "Wire", "Unknown Song", "Pink Flag", 100000, 0),
            PlexTrack("3", "Wire", "No Dur", "Pink Flag", None, 0),
            PlexTrack("4", "Wire", "Fuzzy", "Pink Flag", 120000, 0),
            PlexTrack("5", "Wire", "Broken", "Pink Flag", 120000, 0),
        ],
        "d0",
    )
    return conn


def test_match_library_records_every_outcome(tmp_path: Path) -> None:
    conn = setup(tmp_path)
    fake = FakeDeezer(
        {
            search_query("Wire", "Mannequin"): [dz(7, "Wire", "Mannequin", 157)],
            search_query("Wire", "Unknown Song"): [],
            search_query("Wire", "Fuzzy"): [dz(8, "Wire", "Fuzzy Remix", 120)],
            search_query("Wire", "Broken"): DeezerError("code 501"),
        }
    )
    rep = match_library(conn, fake, tolerance_s=3, now="d1")  # type: ignore[arg-type]
    assert rep == MatchReport(
        n_todo=5,
        n_matched=1,
        unmatched={"no_duration": 1, "no_result": 1, "no_exact_match": 1},
        errors=["Wire — Broken (DeezerError)"],
    )
    row = conn.execute("SELECT * FROM deezer_matches WHERE plex_key='1'").fetchone()
    assert (row["status"], row["deezer_track_id"], row["deezer_artist_id"]) == ("matched", 7, 107)
    assert conn.execute("SELECT COUNT(*) FROM deezer_matches").fetchone()[0] == 4
    assert coverage(conn) == (1, 5)
    # Titre sans durée : aucune requête Deezer.
    assert search_query("Wire", "No Dur") not in fake.queries


def test_second_pass_only_retries_errors(tmp_path: Path) -> None:
    conn = setup(tmp_path)
    answers: dict[str, list[DeezerTrack] | Exception] = {
        search_query("Wire", "Mannequin"): [dz(7, "Wire", "Mannequin", 157)],
        search_query("Wire", "Unknown Song"): [],
        search_query("Wire", "Fuzzy"): [],
        search_query("Wire", "Broken"): DeezerError("code 501"),
    }
    match_library(conn, FakeDeezer(answers), 3, "d1")  # type: ignore[arg-type]
    fake2 = FakeDeezer({search_query("Wire", "Broken"): [dz(9, "Wire", "Broken", 120)]})
    rep = match_library(conn, fake2, 3, "d2")  # type: ignore[arg-type]
    assert rep.n_todo == 1 and rep.n_matched == 1
    assert fake2.queries == [search_query("Wire", "Broken")]


def test_unavailable_commits_done_work_then_raises(tmp_path: Path) -> None:
    conn = setup(tmp_path)
    fake = FakeDeezer(
        {
            search_query("Wire", "Mannequin"): [dz(7, "Wire", "Mannequin", 157)],
            search_query("Wire", "Unknown Song"): DeezerUnavailable("code 4"),
        }
    )
    with pytest.raises(DeezerUnavailable):
        match_library(conn, fake, 3, "d1", batch=50)  # type: ignore[arg-type]
    assert (
        conn.execute("SELECT status FROM deezer_matches WHERE plex_key='1'").fetchone()[0]
        == "matched"
    )
