import logging
from pathlib import Path

import jwt
import numpy as np
import pytest
from fastapi.testclient import TestClient

from radio.core.db import connect
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable
from radio.votes.access import HEADER
from radio.votes.app import create_app
from radio.votes.select import Ballot, pending_ballots, select_batch
from tests_radio.model_factory import NOW, make_model_db, serve_scores

SIGNED = "https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/x.mp3?hdnea=exp=1~acl=*~hmac=SIGNE"
OK = {HEADER: "bon-jeton"}


class FakeDeezer:
    def __init__(self, fail: Exception | None = None, preview: str | None = SIGNED) -> None:
        self.fail = fail
        self.preview = preview
        self.urls: list[str] = []

    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None:
        if self.fail is not None:
            raise self.fail
        t = DeezerTrack(track_id, "T", "T", 30, 1, 1, "A", self.preview is not None)
        return t, self.preview

    def download_preview(self, url: str) -> bytes:
        self.urls.append(url)
        return b"ID3-mp3"


def _verify(token: str) -> None:
    if token != "bon-jeton":
        raise jwt.InvalidTokenError("refusé")


@pytest.fixture
def db(tmp_path: Path) -> Path:
    conn = make_model_db(tmp_path)
    serve_scores(conn)
    select_batch(conn, np.random.default_rng(0), 10, 10, NOW)
    conn.close()
    return tmp_path / "radio.db"


def _client(db: Path, deezer: FakeDeezer | None = None) -> TestClient:
    return TestClient(create_app(db, deezer or FakeDeezer(), _verify))


def _first(db: Path) -> Ballot:
    conn = connect(db)
    try:
        return pending_ballots(conn)[0]
    finally:
        conn.close()


def test_every_page_requires_access_except_health(db: Path) -> None:
    c = _client(db)
    assert c.get("/sante").status_code == 200
    assert c.get("/").status_code == 403
    assert c.get("/", headers={HEADER: "faux"}).status_code == 403
    assert c.post("/vote", data={"tid": "1", "choix": "oui"}).status_code == 403
    assert c.get("/extrait/1").status_code == 403
    assert c.get("/docs").status_code == 404


def test_page_shows_next_ballot_blind(db: Path) -> None:
    b = _first(db)
    r = _client(db).get("/", headers=OK)
    assert r.status_code == 200
    assert "20 à écouter" in r.text
    assert b.title in r.text and b.artist in r.text
    assert f"/extrait/{b.deezer_track_id}" in r.text
    for hidden in ("exam", "lesson", "leçon", "score", "seuil"):  # à l'aveugle
        assert hidden not in r.text


def test_vote_is_recorded_and_page_moves_on(db: Path) -> None:
    b = _first(db)
    c = _client(db)
    r = c.post(
        "/vote",
        data={"tid": str(b.deezer_track_id), "choix": "non"},
        headers=OK,
        follow_redirects=False,
    )
    assert r.status_code == 303 and r.headers["location"] == "/"
    conn = connect(db)
    row = conn.execute(
        "SELECT kind, vote, source FROM votes WHERE deezer_track_id = ?", (b.deezer_track_id,)
    ).fetchone()
    assert tuple(row) == (b.kind, "non", "page")
    assert len(pending_ballots(conn)) == 19
    conn.close()
    again = c.post("/vote", data={"tid": str(b.deezer_track_id), "choix": "oui"}, headers=OK)
    assert again.status_code == 409
    bad = c.post("/vote", data={"tid": str(b.deezer_track_id), "choix": "bof"}, headers=OK)
    assert bad.status_code == 422


def test_empty_queue_says_so(db: Path) -> None:
    conn = connect(db)
    conn.execute("DELETE FROM ballots")
    conn.commit()
    conn.close()
    r = _client(db).get("/", headers=OK)
    assert "Rien à écouter" in r.text


def test_preview_is_relayed_and_its_url_never_leaks(
    db: Path, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    b = _first(db)
    deezer = FakeDeezer()
    c = _client(db, deezer)
    r = c.get(f"/extrait/{b.deezer_track_id}", headers=OK)
    assert r.status_code == 200 and r.content == b"ID3-mp3"
    assert r.headers["content-type"] == "audio/mpeg"
    assert r.headers["cache-control"] == "no-store"
    assert deezer.urls == [SIGNED]
    page = c.get("/", headers=OK).text
    assert "dzcdn" not in page and "hdnea" not in page
    assert "dzcdn" not in caplog.text and "hdnea" not in caplog.text
    assert c.get("/extrait/400000", headers=OK).status_code == 404  # pas en attente


@pytest.mark.parametrize(
    ("deezer", "status"),
    [
        (FakeDeezer(preview=None), 404),
        (FakeDeezer(fail=DeezerError("code 800")), 404),
        (FakeDeezer(fail=DeezerUnavailable("HTTP 503")), 503),
    ],
)
def test_preview_failures(db: Path, deezer: FakeDeezer, status: int) -> None:
    b = _first(db)
    r = _client(db, deezer).get(f"/extrait/{b.deezer_track_id}", headers=OK)
    assert r.status_code == status


def test_extrait_supports_byte_ranges(db: Path) -> None:
    # Safari iOS sonde l'extrait avec `Range: bytes=0-1` avant de le lire (Apple, Safari Web
    # Content Guide) ; FakeDeezer renvoie b"ID3-mp3", 7 octets.
    b = _first(db)
    c = _client(db)
    tid = b.deezer_track_id

    r = c.get(f"/extrait/{tid}", headers={**OK, "Range": "bytes=0-1"})
    assert r.status_code == 206
    assert r.content == b"ID"
    assert r.headers["content-range"] == "bytes 0-1/7"
    assert r.headers["accept-ranges"] == "bytes"
    assert r.headers["cache-control"] == "no-store"

    r = c.get(f"/extrait/{tid}", headers={**OK, "Range": "bytes=3-"})
    assert r.status_code == 206
    assert r.content == b"-mp3"
    assert r.headers["content-range"] == "bytes 3-6/7"

    r = c.get(f"/extrait/{tid}", headers={**OK, "Range": "bytes=-2"})
    assert r.status_code == 206
    assert r.content == b"p3"
    assert r.headers["content-range"] == "bytes 5-6/7"

    r = c.get(f"/extrait/{tid}", headers={**OK, "Range": "bytes=9-"})
    assert r.status_code == 416
    assert r.headers["content-range"] == "bytes */7"

    r = c.get(f"/extrait/{tid}", headers=OK)
    assert r.status_code == 200
    assert r.content == b"ID3-mp3"
    assert r.headers["accept-ranges"] == "bytes"
