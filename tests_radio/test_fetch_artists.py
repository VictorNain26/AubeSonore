import json
import sqlite3
from pathlib import Path

import pytest

from radio.core.db import connect
from radio.signals.artists import fetch_artists
from radio.sources.deezer import DeezerArtist, DeezerError, DeezerUnavailable
from radio.sources.lastfm import ArtistInfo, SimilarArtist, Tag


class FakeDeezer:
    def __init__(
        self,
        artists: dict[int, DeezerArtist | Exception | None],
        related: dict[int, list[DeezerArtist]] | None = None,
    ) -> None:
        self._artists = artists
        self._related = related or {}

    def artist(self, artist_id: int) -> DeezerArtist | None:
        v = self._artists[artist_id]
        if isinstance(v, Exception):
            raise v
        return v

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return self._related.get(artist_id, [])


class FakeLastfm:
    def __init__(self, info: dict[str, ArtistInfo | None]) -> None:
        self._info = info
        self.limits: list[int] = []

    def artist_info(self, artist: str) -> ArtistInfo | None:
        return self._info[artist]

    def artist_top_tags(self, artist: str) -> list[Tag]:
        return [Tag("electronic", 100), Tag("french", 40)]

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        self.limits.append(limit)
        return [SimilarArtist("Air", 0.7)]


def db(tmp_path: Path) -> sqlite3.Connection:
    conn = connect(tmp_path / "radio.db")
    conn.executemany(
        "INSERT INTO artists (deezer_artist_id, name) VALUES (?, ?)",
        [(1, "Knife"), (2, "Jul"), (3, "Gone"), (4, "Broken"), (5, "Orphan")],
    )
    conn.executemany(
        "INSERT INTO tracks VALUES (?, ?, 'T', 'candidate', ?, 'd')",
        [(10, 1, "k1"), (20, 2, "k2"), (30, 3, "k3"), (40, 4, "k4")],
    )
    conn.commit()
    return conn


def test_fetch_artists(tmp_path: Path) -> None:
    conn = db(tmp_path)
    dz = FakeDeezer(
        {
            1: DeezerArtist(1, "The Knife", 900),
            2: DeezerArtist(2, "Jul", 5000),
            3: None,
            4: DeezerError("code 501"),
        },
        related={1: [DeezerArtist(83, "M83", 10)]},
    )
    lf = FakeLastfm({"The Knife": ArtistInfo("The Knife", 1234), "Jul": None})
    rep = fetch_artists(conn, dz, lf, 50, "d2")
    assert (rep.n_todo, rep.n_fetched) == (4, 2)
    assert (rep.not_on_deezer, rep.skipped) == (["Gone"], ["Broken (DeezerError)"])
    knife = conn.execute("SELECT * FROM artists WHERE deezer_artist_id = 1").fetchone()
    assert (knife["name"], knife["nb_fan"], knife["fetched_at"]) == ("The Knife", 900, "d2")
    assert (knife["lastfm_found"], knife["lastfm_listeners"]) == (1, 1234)
    assert json.loads(knife["deezer_related"]) == [[83, "M83"]]
    assert json.loads(knife["lastfm_tags"]) == [["electronic", 100], ["french", 40]]
    assert json.loads(knife["lastfm_similar"]) == [["Air", 0.7]]
    jul = conn.execute("SELECT * FROM artists WHERE deezer_artist_id = 2").fetchone()
    assert (jul["lastfm_found"], jul["lastfm_tags"], jul["lastfm_similar"]) == (0, None, None)
    assert lf.limits == [50]
    orphan = conn.execute("SELECT fetched_at FROM artists WHERE deezer_artist_id = 5").fetchone()
    assert orphan[0] is None
    assert fetch_artists(conn, dz, lf, 50, "d3").n_todo == 2


def test_unavailable_keeps_fetched_artists(tmp_path: Path) -> None:
    conn = db(tmp_path)
    dz = FakeDeezer({1: DeezerArtist(1, "The Knife", 900), 2: DeezerUnavailable("code 4")})
    lf = FakeLastfm({"The Knife": ArtistInfo("The Knife", 1)})
    with pytest.raises(DeezerUnavailable):
        fetch_artists(conn, dz, lf, 50, "d2")
    row = conn.execute("SELECT fetched_at FROM artists WHERE deezer_artist_id = 1").fetchone()
    assert row[0] == "d2"
