"""Popularité (spec §5.3) : rang du titre, fans Deezer et auditeurs Last.fm de l'artiste.

Chaque mesure passe par log(1 + x) ; une mesure absente vaut NaN.
"""

import math


def _log(x: int | None) -> float:
    return math.log1p(x) if x is not None else math.nan


def popularity(
    rank: int | None, nb_fan: int | None, listeners: int | None
) -> tuple[float, float, float]:
    return _log(rank), _log(nb_fan), _log(listeners)
