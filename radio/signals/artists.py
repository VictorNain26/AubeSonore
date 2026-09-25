"""Données brutes de chaque artiste mesuré (Deezer, Last.fm), lues une fois.

Les signaux se calculent à la lecture (radio/signals/table.py) : la proximité dépend de la
bibliothèque du moment, pas de celle du jour où l'artiste a été lu. Last.fm est interrogé avec
le nom Deezer (autocorrect actif côté client).
"""

import json
import logging
import sqlite3
from dataclasses import dataclass, field

from radio.sources.deezer import DeezerClient, DeezerError
from radio.sources.lastfm import LastfmClient, LastfmError

logger = logging.getLogger(__name__)


@dataclass
class FetchReport:
    n_todo: int
    n_fetched: int = 0
    not_on_deezer: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


def fetch_artists(
    conn: sqlite3.Connection,
    deezer: DeezerClient,
    lastfm: LastfmClient,
    similar_limit: int,
    now: str,
) -> FetchReport:
    todo = conn.execute(
        """
        SELECT deezer_artist_id AS aid, name FROM artists
        WHERE fetched_at IS NULL
          AND deezer_artist_id IN (SELECT deezer_artist_id FROM tracks)
        ORDER BY deezer_artist_id
        """
    ).fetchall()
    rep = FetchReport(n_todo=len(todo))
    for i, r in enumerate(todo, 1):
        if i % 100 == 0:
            logger.info("artists: %d/%d processed", i, len(todo))
        try:
            artist = deezer.artist(r["aid"])
            if artist is None:
                rep.not_on_deezer.append(r["name"])
                continue
            related = deezer.related(artist.id)
            info = lastfm.artist_info(artist.name)
            tags = lastfm.artist_top_tags(artist.name) if info is not None else None
            similar = (
                lastfm.similar_artists(artist.name, limit=similar_limit)
                if info is not None
                else None
            )
        except (DeezerError, LastfmError) as e:
            rep.skipped.append(f"{r['name']} ({type(e).__name__})")
            continue
        with conn:
            conn.execute(
                """
                UPDATE artists SET name = ?, fetched_at = ?, nb_fan = ?, deezer_related = ?,
                    lastfm_found = ?, lastfm_listeners = ?, lastfm_tags = ?, lastfm_similar = ?
                WHERE deezer_artist_id = ?
                """,
                (
                    artist.name,
                    now,
                    artist.nb_fan,
                    json.dumps([[a.id, a.name] for a in related], ensure_ascii=False),
                    int(info is not None),
                    info.listeners if info is not None else None,
                    json.dumps([[t.name, t.count] for t in tags], ensure_ascii=False)
                    if tags is not None
                    else None,
                    json.dumps([[s.name, s.match] for s in similar], ensure_ascii=False)
                    if similar is not None
                    else None,
                    r["aid"],
                ),
            )
        rep.n_fetched += 1
    return rep
