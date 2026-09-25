"""Voisins d'une graine : Deezer related ∩ Last.fm getSimilar, moins la bibliothèque (spec §5.2).

Les deux sources se croisent sur le nom normalisé (Last.fm ne donne que des noms). Un voisin
n'est jamais un artiste de la bibliothèque : exclusion par id Deezer et par nom.
"""

from radio.library.artists import LibraryArtist
from radio.library.match import normalize
from radio.sources.deezer import DeezerArtist, DeezerClient
from radio.sources.lastfm import LastfmClient


def neighbours(
    seed: LibraryArtist,
    deezer: DeezerClient,
    lastfm: LastfmClient,
    similar_limit: int,
    exclude_ids: set[int],
    exclude_names: frozenset[str],
) -> list[DeezerArtist]:
    similar = {normalize(s.name) for s in lastfm.similar_artists(seed.name, limit=similar_limit)}
    similar.discard("")
    out = []
    for a in deezer.related(seed.deezer_artist_id):
        n = normalize(a.name)
        if n in similar and a.id not in exclude_ids and n not in exclude_names:
            out.append(a)
    return out
