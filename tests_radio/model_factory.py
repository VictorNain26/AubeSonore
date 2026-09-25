"""Base de démonstration du modèle : le goût est la direction LIKED de l'empreinte.

Bibliothèque et candidats « aimés » (artistes 2000+) pointent vers LIKED (6 écarts-types, pour
des tests stables) ; candidats « rejetés »
(3000+) et négatifs (4000+) vers DISLIKED. Les autres signaux sont identiques pour tous.
"""

import json
import sqlite3
from pathlib import Path

import numpy as np

from radio.core.db import connect
from radio.discover.candidates import add_tracks
from radio.library.artists import register_library
from radio.signals.audio import DIM, MODEL_TAG, to_blob
from radio.sources.deezer import DeezerTrack

NOW = "2026-09-25T00:00:00+00:00"
LIKED = np.eye(DIM, dtype=np.float32)[0]
DISLIKED = np.eye(DIM, dtype=np.float32)[1]


def make_model_db(
    directory: Path, n_artists: int = 12, per_artist: int = 4, seed: int = 0
) -> sqlite3.Connection:
    rng = np.random.default_rng(seed)
    conn = connect(directory / "radio.db")
    lib, matches = [], []
    for a in range(n_artists):
        for k in range(per_artist):
            key = f"p{a}-{k}"
            plays = int(rng.integers(0, 20))
            lib.append((key, f"Lib {a}", f"Chanson {k}", "Album", 200000, plays, NOW))
            matches.append((key, "matched", None, 100000 + 10 * a + k, 1000 + a, NOW))
    conn.executemany("INSERT INTO library_tracks VALUES (?, ?, ?, ?, ?, ?, ?)", lib)
    conn.executemany("INSERT INTO deezer_matches VALUES (?, ?, ?, ?, ?, ?)", matches)
    conn.commit()
    register_library(conn, NOW)
    for base, origin in ((2000, "candidate"), (3000, "candidate"), (4000, "negative")):
        for a in range(n_artists):
            aid = base + a
            tracks = [
                DeezerTrack(
                    aid * 100 + k, f"Titre {k}", f"Titre {k}", 200, 1000, aid, f"Art {aid}", True
                )
                for k in range(per_artist)
            ]
            add_tracks(conn, aid, f"Art {aid}", tracks, origin, NOW)
    for tid, aid, origin in conn.execute(
        "SELECT deezer_track_id, deezer_artist_id, origin FROM tracks"
    ).fetchall():
        liked = origin == "library" or 2000 <= aid < 3000
        v = 6 * (LIKED if liked else DISLIKED) + rng.normal(size=DIM)
        blob = to_blob((v / np.linalg.norm(v)).astype(np.float32))
        rank = int(rng.integers(0, 1000))
        conn.execute(
            "INSERT INTO track_measures VALUES (?, 'ok', ?, ?, ?, ?)",
            (tid, rank, blob, MODEL_TAG, NOW),
        )
    conn.execute(
        """
        UPDATE artists SET fetched_at = ?, nb_fan = 100, deezer_related = '[]', lastfm_found = 1,
            lastfm_listeners = 1000, lastfm_tags = ?, lastfm_similar = '[]'
        """,
        (NOW, json.dumps([["rock", 100]])),
    )
    conn.commit()
    return conn


def add_vote(
    conn: sqlite3.Connection,
    track_id: int,
    kind: str,
    vote: str,
    at: str = "2026-09-24T12:00:00+00:00",
) -> None:
    conn.execute("INSERT INTO votes VALUES (?, ?, ?, ?, 'test')", (track_id, kind, vote, at))
    conn.commit()
