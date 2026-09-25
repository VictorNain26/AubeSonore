"""Proximité (spec §5.3) : lien d'un artiste avec la bibliothèque, en « artiste retiré ».

- plus grand `match` Last.fm avec un artiste de la bibliothèque autre que lui-même ; absent (NaN)
  si Last.fm ne donne aucun similaire, 0 si aucun similaire n'est de la bibliothèque ;
- nombre de sources (Deezer related, Last.fm similar) qui le relient à la bibliothèque : 0, 1, 2.

L'artiste lui-même ne compte jamais, même s'il est dans la bibliothèque : sinon l'absence de ce
lien trahirait les artistes de la bibliothèque.
"""

import math

from radio.library.match import normalize


def proximity(
    self_id: int,
    self_names: set[str],
    similar: list[tuple[str, float]] | None,
    related: list[tuple[int, str]] | None,
    library_ids: set[int],
    library_names: frozenset[str],
) -> tuple[float, float]:
    names = library_names - self_names
    ids = library_ids - {self_id}
    matches = [m for n, m in similar or [] if normalize(n) in names]
    best = (max(matches) if matches else 0.0) if similar else math.nan
    deezer_link = any(i in ids for i, _ in related or [])
    return best, float(int(deezer_link) + int(bool(matches)))
