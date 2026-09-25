import logging
import sqlite3
from pathlib import Path

import numpy as np
import numpy.typing as npt
import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.sources.deezer import DeezerArtist, DeezerTrack
from radio.sources.lastfm import ArtistInfo, SimilarArtist, Tag
from radio.sources.plex import PlexTrack

runner = CliRunner()
SIGNED = "https://cdnt-preview.dzcdn.net/x.mp3?hdnea=SIGNED-SECRET"
KEY = "k3y-SECRET-lastfm"

ARTISTS = {
    83: DeezerArtist(83, "M83", 5000),
    70: DeezerArtist(70, "Wire", 800),
    1: DeezerArtist(1, "The Knife", 900),
    2: DeezerArtist(2, "The Fall", 300),
    900: DeezerArtist(900, "Jul", 9000),
}
LIB = [
    DeezerTrack(101, "Midnight City", "Midnight City", 243, 900, 83, "M83", True),
    DeezerTrack(104, "Mannequin", "Mannequin", 157, 300, 70, "Wire", True),
]
TOP = {
    1: [
        DeezerTrack(11, "Heartbeats", "Heartbeats", 200, 800, 1, "The Knife", True),
        DeezerTrack(12, "Silent Shout", "Silent Shout", 200, 700, 1, "The Knife", True),
        DeezerTrack(13, "Heartbeats (Remastered)", "Heartbeats", 200, 600, 1, "The Knife", True),
        DeezerTrack(14, "Collab", "Collab", 200, 500, 99, "Other", True),
    ],
    2: [DeezerTrack(21, "Totally Wired", "Totally Wired", 200, 400, 2, "The Fall", True)],
    900: [DeezerTrack(901, "Tchikita", "Tchikita", 200, 950, 900, "Jul", True)],
}
RELATED = {
    83: [ARTISTS[1], ARTISTS[70]],
    70: [ARTISTS[1], ARTISTS[2]],
    1: [ARTISTS[83]],
    2: [ARTISTS[70]],
    900: [],
}
SIMILAR = {
    "M83": [SimilarArtist("Knife", 0.9)],
    "Wire": [SimilarArtist("The Fall", 0.8), SimilarArtist("The Knife", 0.5)],
    "The Knife": [SimilarArtist("M83", 0.7)],
    "The Fall": [SimilarArtist("Wire", 0.6)],
}


class World:
    """Deezer et Last.fm simulés : une seule instance sert les deux clients."""

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        return [t for t in LIB if t.artist_name in query and t.title in query]

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return RELATED.get(artist_id, [])

    def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
        return TOP.get(artist_id, [])

    def artist(self, artist_id: int) -> DeezerArtist | None:
        return ARTISTS.get(artist_id)

    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None:
        every = LIB + [t for ts in TOP.values() for t in ts]
        t = next(x for x in every if x.id == track_id)
        return t, (None if track_id == 21 else SIGNED)

    def download_preview(self, url: str) -> bytes:
        return b"mp3"

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        return SIMILAR.get(artist, [])

    def artist_info(self, artist: str) -> ArtistInfo | None:
        return None if artist == "Jul" else ArtistInfo(artist, 1000)

    def artist_top_tags(self, artist: str) -> list[Tag]:
        return [Tag("electronic", 100)] if artist != "Wire" else [Tag("post-punk", 100)]


class Embedder:
    def embed(self, data: bytes, suffix: str = ".mp3") -> npt.NDArray[np.float32]:
        return np.full(1280, 1 / np.sqrt(1280), dtype=np.float32)


@pytest.fixture
def world(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text("[library]\nduration_tolerance_s = 3\n")
    (cfg / "negatives.toml").write_text(
        '[[artist]]\nname = "Jul"\ndeezer_id = 900\ncategory = "commercial_fr"\n'
    )
    settings = Settings(
        _env_file=None,
        plex_token="tok",
        plex_music_section="Musique",
        lastfm_api_key=KEY,
        RADIO_DATA_DIR=tmp_path / "data",
        RADIO_CONFIG_DIR=cfg,
    )
    w = World()
    plex = [
        PlexTrack("1", "M83", "Midnight City", "Hurry Up", 243000, 10),
        PlexTrack("2", "Wire", "Mannequin", "Pink Flag", 157000, 1),
    ]

    class Plex:
        def tracks(self) -> list[PlexTrack]:
            return plex

    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr(cli, "_plex", lambda s: Plex())
    monkeypatch.setattr(cli, "_deezer", lambda: w)
    monkeypatch.setattr(cli, "_lastfm", lambda s: w)
    monkeypatch.setattr(cli, "_rng", lambda: np.random.default_rng(0))
    monkeypatch.setattr(cli, "_embedder", lambda s: Embedder())
    return tmp_path


def test_end_to_end(world: Path, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    outputs = []
    for command in ("library-sync", "negatives-sync", "discover", "signals"):
        res = runner.invoke(cli.app, [command])
        assert res.exit_code == 0, (command, res.output)
        outputs.append(res.output)
    out = "\n".join(outputs)
    assert "Couverture : 2 / 2 titres rapprochés (100,0 %)" in out
    assert "→ 1 titres ajoutés" in out
    assert "2 graines → 2 voisins, 5 titres vus → 3 ajoutés, 1 doublons, 1 écartés" in out
    assert "Bibliothèque inscrite : 2 titres, 2 artistes (0 retirés)" in out
    assert "Artistes : 5 à lire → 5 lus, 0 introuvables sur Deezer, 0 sautés" in out
    assert "Titres : 6 à mesurer → 5 mesurés, 1 sans extrait" in out
    assert "Signaux prêts : 5 titres (bibliothèque 2, candidats 2, négatifs 1)" in out
    conn = sqlite3.connect(world / "data" / "radio.db")
    candidates_from_library = conn.execute(
        "SELECT COUNT(*) FROM tracks WHERE origin = 'candidate' AND deezer_artist_id IN (83, 70)"
    ).fetchone()[0]
    assert candidates_from_library == 0
    assert conn.execute("SELECT status FROM discover_runs").fetchone()[0] == "done"
    dump = "\n".join(conn.iterdump())
    for secret in ("SIGNED-SECRET", KEY):
        assert secret not in out and secret not in caplog.text and secret not in dump
