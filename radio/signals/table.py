"""Table des signaux : une ligne par titre à l'empreinte réussie, quelle que soit son origine.

Tout se calcule ici, à la lecture, de la même façon pour la bibliothèque, les candidats et les
négatifs (spec §5.3). Un artiste pas encore lu a tous ses signaux absents (NaN).
"""

import json
import sqlite3
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from radio.library.artists import library_artists, library_names
from radio.library.match import normalize
from radio.signals.audio import DIM, MODEL_TAG, from_blob
from radio.signals.culture import culture_vector, vocabulary
from radio.signals.popularity import popularity
from radio.signals.proximity import proximity

POPULARITY_COLUMNS = ("rang Deezer", "fans Deezer", "auditeurs Last.fm")
PROXIMITY_COLUMNS = ("match Last.fm", "sources")


@dataclass(frozen=True)
class SignalTable:
    track_ids: npt.NDArray[np.int64]
    artist_ids: npt.NDArray[np.int64]
    origins: list[str]
    audio: npt.NDArray[np.float32]
    popularity: npt.NDArray[np.float64]
    culture: npt.NDArray[np.float64]
    proximity: npt.NDArray[np.float64]
    vocabulary: list[str]

    def missing_rates(self) -> dict[str, float]:
        """Part des titres où chaque mesure est absente."""
        if len(self.track_ids) == 0:
            return {}
        out = {
            name: float(np.isnan(self.popularity[:, j]).mean())
            for j, name in enumerate(POPULARITY_COLUMNS)
        }
        out["culture"] = float(np.isnan(self.culture).all(axis=1).mean())
        out[PROXIMITY_COLUMNS[0]] = float(np.isnan(self.proximity[:, 0]).mean())
        return out


def _tags(raw: str | None) -> list[tuple[str, int]] | None:
    return None if raw is None else [(str(n), int(c)) for n, c in json.loads(raw)]


def load_signals(conn: sqlite3.Connection, vocab_size: int) -> SignalTable:
    lib = library_artists(conn)
    lib_ids = {a.deezer_artist_id for a in lib}
    lib_names = library_names(conn)
    plex_names = {a.deezer_artist_id: {normalize(n) for n in a.plex_names} for a in lib}
    artists = {
        r["deezer_artist_id"]: r
        for r in conn.execute("SELECT * FROM artists WHERE fetched_at IS NOT NULL")
    }
    vocab_ids = [
        r[0]
        for r in conn.execute(
            "SELECT DISTINCT deezer_artist_id FROM tracks WHERE origin != 'negative' ORDER BY 1"
        )
    ]
    vocab = vocabulary(
        (_tags(artists[a]["lastfm_tags"]) or [] for a in vocab_ids if a in artists), vocab_size
    )
    rows = conn.execute(
        """
        SELECT t.deezer_track_id AS tid, t.deezer_artist_id AS aid, t.origin, m.rank,
               m.embedding
        FROM tracks t JOIN track_measures m USING (deezer_track_id)
        WHERE m.status = 'ok' AND m.model = ? ORDER BY t.deezer_track_id
        """,
        (MODEL_TAG,),
    ).fetchall()
    n = len(rows)
    audio = np.zeros((n, DIM), dtype=np.float32)
    pop = np.full((n, len(POPULARITY_COLUMNS)), np.nan)
    cult = np.full((n, len(vocab)), np.nan)
    prox = np.full((n, len(PROXIMITY_COLUMNS)), np.nan)
    cache: dict[int, tuple[npt.NDArray[np.float64], tuple[float, float]]] = {}
    for i, r in enumerate(rows):
        audio[i] = from_blob(r["embedding"])
        a = artists.get(r["aid"])
        pop[i] = popularity(
            r["rank"],
            a["nb_fan"] if a is not None else None,
            a["lastfm_listeners"] if a is not None else None,
        )
        if a is None:
            continue
        if r["aid"] not in cache:
            similar = (
                None
                if a["lastfm_similar"] is None
                else [(str(s), float(m)) for s, m in json.loads(a["lastfm_similar"])]
            )
            related = [(int(x), str(y)) for x, y in json.loads(a["deezer_related"])]
            self_names = {normalize(a["name"])} | plex_names.get(r["aid"], set())
            cache[r["aid"]] = (
                culture_vector(_tags(a["lastfm_tags"]), vocab),
                proximity(r["aid"], self_names, similar, related, lib_ids, lib_names),
            )
        cult[i], prox[i] = cache[r["aid"]]
    return SignalTable(
        track_ids=np.array([r["tid"] for r in rows], dtype=np.int64),
        artist_ids=np.array([r["aid"] for r in rows], dtype=np.int64),
        origins=[r["origin"] for r in rows],
        audio=audio,
        popularity=pop,
        culture=cult,
        proximity=prox,
        vocabulary=vocab,
    )
