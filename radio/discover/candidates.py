"""Titres d'un voisin (ou d'un négatif) : filtre et insertion dédoublonnée (spec §5.2)."""

import sqlite3

from radio.library.dedupe import dedupe_key
from radio.sources.deezer import DeezerTrack


def keep_tracks(top: list[DeezerTrack], artist_id: int) -> list[DeezerTrack]:
    """Seuls les titres dont l'artiste est l'artiste principal et qui ont un extrait."""
    return [t for t in top if t.artist_id == artist_id and t.has_preview]


def add_tracks(
    conn: sqlite3.Connection,
    artist_id: int,
    artist_name: str,
    tracks: list[DeezerTrack],
    origin: str,
    now: str,
) -> list[int]:
    """Insère l'artiste et ses titres ; renvoie les ids ajoutés. Un doublon (même id, ou même clé
    de dédoublonnage pour cette origine) est écarté : on garde la première référence, la plus
    populaire puisque Deezer trie son top par rang."""
    conn.execute(
        "INSERT INTO artists (deezer_artist_id, name) VALUES (?, ?) ON CONFLICT DO NOTHING",
        (artist_id, artist_name),
    )
    added = []
    for t in tracks:
        cur = conn.execute(
            """
            INSERT INTO tracks (deezer_track_id, deezer_artist_id, title, origin, dedupe_key,
                                added_at)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
            """,
            (t.id, artist_id, t.title, origin, dedupe_key(artist_name, t.title), now),
        )
        if cur.rowcount:
            added.append(t.id)
    return added
