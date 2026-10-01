import json
from datetime import UTC, datetime, timedelta
from pathlib import Path, PurePosixPath
from typing import Any

import numpy as np
import pytest
import responses

import radio.antenna.sync as sync_mod
from radio.acquire.audio import Probe, Tags
from radio.antenna.sync import antenne_pass
from radio.core.config import AntenneConfig
from radio.sources.azuracast import AzuracastClient, AzuracastError, Media
from radio.sources.deezer import DeezerAlbum
from tests_radio.model_factory import NOW, make_model_db, serve_scores

ROOT = PurePosixPath("/media/plex/Musique")
LATER = datetime(2026, 12, 1, tzinfo=UTC)


class FakeDeezer:
    def album(self, tid: int) -> DeezerAlbum | None:
        return DeezerAlbum(f"Album {tid}", "https://cover")

    def download(self, url: str) -> bytes:
        return b"jpeg"


class FakeStation:
    def __init__(self, media: list[Media] | None = None, refuse: set[str] = frozenset()) -> None:
        self.media = list(media or [])
        self.refuse = refuse
        self.busy: set[str] = set()
        self.deleted: list[str] = []

    def files(self) -> list[Media]:
        return list(self.media)

    def upload(self, path: str, data: bytes) -> Media:
        if path in self.refuse:
            raise AzuracastError("HTTP 413")
        m = Media(1000 + len(self.media), f"song-{path}", path)
        self.media.append(m)
        return m

    def delete(self, paths: list[str]) -> list[str]:
        self.deleted += paths
        self.media = [m for m in self.media if m.path not in paths]
        return []

    def busy_song_ids(self) -> set[str]:
        return self.busy


@pytest.fixture
def no_tools(monkeypatch: pytest.MonkeyPatch) -> list[Tags]:
    tagged: list[Tags] = []

    def prepare(src: Path, dest: Path, codec: str, tags: Tags, rsgain: Path) -> None:
        tagged.append(tags)
        dest.write_bytes(b"mp3")

    monkeypatch.setattr(sync_mod, "probe", lambda p: Probe("flac", 200.0, 900))
    monkeypatch.setattr(sync_mod, "prepare", prepare)
    return tagged


def _ready(conn: Any, tmp: Path, ids: list[int]) -> None:
    for tid in ids:
        f = tmp / f"{tid}.mp3"
        f.write_bytes(b"audio")
        conn.execute(
            "INSERT INTO acquisitions VALUES (?, 'ready', NULL, 1, ?, ?)", (tid, str(f), NOW)
        )
    conn.commit()


def _library_files(conn: Any) -> None:
    conn.execute("UPDATE library_tracks SET file = '/media/plex/Musique/' || plex_key || '.flac'")
    conn.execute("UPDATE library_tracks SET file = '/media/musique/x.flac' WHERE plex_key = 'p0-0'")
    conn.commit()


def test_publish_ready_files_and_references(tmp_path: Path, no_tools: list[Tags]) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    _library_files(conn)
    ready = [200000 + 100 * a for a in range(8)]
    _ready(conn, tmp_path, ready)
    station = FakeStation([Media(1, "old", "ancien.mp3")])
    cfg = AntenneConfig(reference_share=0.2)

    rep = antenne_pass(
        conn, station, FakeDeezer(), cfg, ROOT, Path("/rsgain"), np.random.default_rng(0), LATER
    )

    assert (rep.n_published, rep.n_references, rep.n_removed, rep.errors) == (8, 2, 0, [])
    assert rep.n_total == 10
    assert not any((tmp_path / f"{t}.mp3").exists() for t in ready)  # effacés après dépôt
    origins = dict(conn.execute("SELECT origin, COUNT(*) FROM antenne GROUP BY origin").fetchall())
    assert origins == {"decouverte": 8, "repere": 2}
    refs = [
        r[0] for r in conn.execute("SELECT deezer_track_id FROM antenne WHERE origin = 'repere'")
    ]
    assert 100000 not in refs  # fichier hors de la racine Plex : jamais lu
    assert sorted(t.deezer_id for t in no_tools) == sorted(refs)
    assert all(t.album == f"Album {t.deezer_id}" and t.cover == b"jpeg" for t in no_tools)
    assert all(m.path.startswith("antenne/") for m in station.media[1:])


def test_reconcile_forgets_missing_and_counts_unknown(tmp_path: Path, no_tools: None) -> None:
    conn = make_model_db(tmp_path)
    conn.execute("INSERT INTO antenne VALUES (5, 'decouverte', 1, 's', 'antenne/5.mp3', ?)", (NOW,))
    conn.commit()
    station = FakeStation([Media(2, "u", "antenne/9.mp3")])
    rep = antenne_pass(
        conn,
        station,
        FakeDeezer(),
        AntenneConfig(reference_share=0),
        ROOT,
        Path("/r"),
        np.random.default_rng(0),
        LATER,
    )
    assert (rep.n_forgotten, rep.n_unknown, rep.n_total) == (1, 1, 0)
    assert station.deleted == []  # un inconnu n'est jamais supprimé


def test_excess_removes_worst_old_discoveries_but_never_busy_ones(
    tmp_path: Path, no_tools: None
) -> None:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    old = (LATER - timedelta(days=90)).isoformat()
    ids = [int(r[0]) for r in conn.execute("SELECT deezer_track_id FROM scores ORDER BY score")][:5]
    for i, tid in enumerate(ids):
        conn.execute(
            "INSERT INTO antenne VALUES (?, 'decouverte', ?, ?, ?, ?)",
            (tid, i, f"s{tid}", f"antenne/{tid}.mp3", old),
        )
    conn.commit()
    station = FakeStation([Media(i, f"s{t}", f"antenne/{t}.mp3") for i, t in enumerate(ids)])
    station.busy = {f"s{ids[0]}"}
    cfg = AntenneConfig(target_max=3, reference_share=0, max_removals_per_pass=10)

    rep = antenne_pass(
        conn, station, FakeDeezer(), cfg, ROOT, Path("/r"), np.random.default_rng(0), LATER
    )

    assert station.deleted == [f"antenne/{ids[1]}.mp3", f"antenne/{ids[2]}.mp3"]
    assert (rep.n_removed, rep.n_total) == (2, 3)


def test_upload_refusal_is_reported_and_file_kept(tmp_path: Path, no_tools: None) -> None:
    conn = make_model_db(tmp_path)
    _ready(conn, tmp_path, [200000])
    station = FakeStation(refuse={"antenne/200000.mp3"})
    rep = antenne_pass(
        conn,
        station,
        FakeDeezer(),
        AntenneConfig(reference_share=0),
        ROOT,
        Path("/r"),
        np.random.default_rng(0),
        LATER,
    )
    assert rep.errors == ["dépôt 200000 : HTTP 413"]
    assert (tmp_path / "200000.mp3").exists()


API = "http://127.0.0.1:8080/api/station/1"


@responses.activate
def test_client_shapes() -> None:
    responses.get(API + "/files", json=[{"id": 3, "song_id": "s", "path": "antenne/1.mp3"}])
    responses.post(API + "/files", json={"id": 4, "song_id": "t", "path": "antenne/2.mp3"})
    responses.put(API + "/files/batch", json={"success": True, "errors": ["antenne/1.mp3: x"]})
    responses.get(API + "/queue", json=[{"song": {"id": "s"}}, {"song": {"id": "u"}}])
    c = AzuracastClient("http://127.0.0.1:8080/", "cle")
    assert c.files() == [Media(3, "s", "antenne/1.mp3")]
    assert c.upload("antenne/2.mp3", b"ab") == Media(4, "t", "antenne/2.mp3")
    body = json.loads(responses.calls[1].request.body)
    assert body == {"path": "antenne/2.mp3", "file": "YWI="}
    assert c.delete(["antenne/1.mp3"]) == ["antenne/1.mp3: x"]
    assert json.loads(responses.calls[2].request.body) == {
        "do": "delete",
        "files": ["antenne/1.mp3"],
    }
    assert c.busy_song_ids() == {"s", "u"}
    assert all(call.request.headers["X-API-Key"] == "cle" for call in responses.calls)


@responses.activate
def test_client_refusal_is_an_error() -> None:
    responses.post(API + "/files", status=413)
    with pytest.raises(AzuracastError):
        AzuracastClient("http://127.0.0.1:8080", "k").upload("antenne/1.mp3", b"")
