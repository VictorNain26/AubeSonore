"""Culture (spec §5.3) : tags Last.fm de l'artiste sur un vocabulaire commun.

Vocabulaire : les `size` tags portés par le plus d'artistes (bibliothèque et candidats) ; à
égalité, l'ordre alphabétique. Poids d'un tag : son compte Last.fm divisé par le plus grand
compte de l'artiste. Un artiste sans tag a un vecteur entièrement absent (NaN).
"""

from collections import Counter
from collections.abc import Iterable

import numpy as np
import numpy.typing as npt


def clean_tag(name: str) -> str:
    return " ".join(name.casefold().split())


def vocabulary(tag_lists: Iterable[list[tuple[str, int]]], size: int) -> list[str]:
    counts: Counter[str] = Counter()
    for tags in tag_lists:
        counts.update({clean_tag(n) for n, _ in tags} - {""})
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [t for t, _ in ranked[:size]]


def culture_vector(tags: list[tuple[str, int]] | None, vocab: list[str]) -> npt.NDArray[np.float64]:
    v = np.full(len(vocab), np.nan)
    if not tags:
        return v
    top = max(c for _, c in tags)
    if top <= 0:
        return v
    index = {t: i for i, t in enumerate(vocab)}
    v[:] = 0.0
    for name, count in tags:
        i = index.get(clean_tag(name))
        if i is not None:
            v[i] = max(v[i], count / top)
    return v
