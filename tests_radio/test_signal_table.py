import json
import math
import sqlite3
from pathlib import Path

import numpy as np
import pytest

from radio.signals.audio import DIM, MODEL_TAG, to_blob
from radio.signals.table import load_signals
from tests_radio.factories import make_library

VEC = np.full(DIM, 1 / np.sqrt(DIM), dtype=np.float32)


def fetched(conn: sqlite3.Connection, aid: int, name: str, **kw: object) -> None:
    conn.execute(
        """
        INSERT INTO artists (deezer_artist_id, name, fetched_at, nb_fan, deezer_related,
            lastfm_found, lastfm_listeners, lastfm_tags, lastfm_similar)
        VALUES (?, ?, 'd', ?, ?, 1, ?, ?, ?)
        ON CONFLICT (deezer_artist_id) DO UPDATE SET name = excluded.name,
            fetched_at = 'd', nb_fan = excluded.nb_fan, deezer_related = excluded.deezer_related,
            lastfm_found = 1, lastfm_listeners = excluded.lastfm_listeners,
            lastfm_tags = excluded.lastfm_tags, lastfm_similar = excluded.lastfm_similar
        """,
        (
            aid,
            name,
            kw["fans"],
            json.dumps(kw["related"]),
            kw["listeners"],
            json.dumps(kw["tags"]),
            json.dumps(kw["similar"]),
        ),
    )


def build(tmp_path: Path) -> sqlite3.Connection:
    conn = make_library(tmp_path)
    fetched(
        conn,
        83,
        "M83",
        fans=100,
        listeners=1000,
        related=[[70, "Wire"]],
        tags=[["electronic", 100], ["french", 60]],
        similar=[["M83", 1.0], ["Knife", 0.8], ["Wire", 0.6]],
    )
    fetched(
        conn,
        1,
        "Knife",
        fans=10,
        listeners=None,
        related=[[83, "M83"]],
        tags=[["electronic", 100], ["swedish", 20]],
        similar=[["M83", 0.7]],
    )
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (9, 'Jul')")
    conn.executemany(
        "INSERT INTO tracks VALUES (?, ?, 'T', ?, ?, 'd')",
        [
            (101, 83, "library", "a"),
            (1, 1, "candidate", "b"),
            (2, 1, "candidate", "c"),
            (9, 9, "negative", "d"),
        ],
    )
    conn.executemany(
        "INSERT INTO track_measures VALUES (?, ?, ?, ?, ?, 'd')",
        [
            (101, "ok", 700, to_blob(VEC), MODEL_TAG),
            (1, "ok", 50, to_blob(VEC), MODEL_TAG),
            (2, "no_preview", 5, None, MODEL_TAG),
            (9, "ok", 0, to_blob(VEC), MODEL_TAG),
        ],
    )
    conn.commit()
    return conn


def test_load_signals(tmp_path: Path) -> None:
    t = load_signals(build(tmp_path), 10)
    assert t.track_ids.tolist() == [1, 9, 101]
    assert t.origins == ["candidate", "negative", "library"]
    assert t.audio.shape == (3, DIM)
    assert t.vocabulary == ["electronic", "french", "swedish"]
    knife, jul, m83 = 0, 1, 2
    assert t.popularity[knife, 0] == pytest.approx(math.log1p(50))
    assert np.isnan(t.popularity[knife, 2])
    assert t.culture[knife].tolist() == [1.0, 0.0, 0.2]
    assert t.proximity[knife].tolist() == [0.7, 2.0]
    assert t.proximity[m83].tolist() == [0.6, 2.0]
    assert t.popularity[jul, 0] == 0.0
    assert np.isnan(t.popularity[jul, 1:]).all()
    assert np.isnan(t.culture[jul]).all() and np.isnan(t.proximity[jul]).all()
    assert t.artist_keys == ["knife", "jul", "m83"]


def test_load_signals_ignores_a_track_measured_with_another_model(tmp_path: Path) -> None:
    conn = build(tmp_path)
    conn.execute("INSERT INTO tracks VALUES (3, 1, 'T', 'candidate', 'e', 'd')")
    conn.execute(
        "INSERT INTO track_measures VALUES (3, 'ok', 500, ?, 'old-model', 'd')", (to_blob(VEC),)
    )
    conn.commit()
    t = load_signals(conn, 10)
    assert t.track_ids.tolist() == [1, 9, 101]


def test_missing_rates(tmp_path: Path) -> None:
    rates = load_signals(build(tmp_path), 10).missing_rates()
    assert rates["rang Deezer"] == 0.0
    assert math.isclose(rates["auditeurs Last.fm"], 2 / 3)
    assert math.isclose(rates["culture"], 1 / 3)
    assert math.isclose(rates["match Last.fm"], 1 / 3)


def test_load_signals_with_a_frozen_vocabulary(tmp_path: Path) -> None:
    t = load_signals(build(tmp_path), 10, vocabulary=["swedish", "rock"])
    assert t.vocabulary == ["swedish", "rock"]
    assert t.culture[0].tolist() == [0.2, 0.0]
    assert np.isnan(t.culture[1]).all()


def test_artist_key_falls_back_to_the_id(tmp_path: Path) -> None:
    conn = build(tmp_path)
    conn.execute("UPDATE artists SET name = '!!!' WHERE deezer_artist_id = 9")
    conn.commit()
    assert load_signals(conn, 10).artist_keys[1] == "#9"


def test_missing_rates_by_origin(tmp_path: Path) -> None:
    rates = load_signals(build(tmp_path), 10).missing_rates_by_origin()
    assert list(rates) == ["candidate", "library", "negative"]
    assert rates["candidate"]["auditeurs Last.fm"] == 1.0
    assert rates["library"]["auditeurs Last.fm"] == 0.0
    assert rates["negative"]["culture"] == 1.0
