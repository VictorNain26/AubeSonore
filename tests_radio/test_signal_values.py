import math

import numpy as np
import pytest

from radio.signals.culture import culture_vector, vocabulary
from radio.signals.popularity import popularity
from radio.signals.proximity import proximity


def test_popularity_is_log_and_nan_when_absent() -> None:
    rank, fans, listeners = popularity(0, None, 10)
    assert rank == 0.0 and math.isnan(fans) and listeners == pytest.approx(math.log(11))


def test_vocabulary_counts_artists_not_occurrences() -> None:
    lists = [
        [("Post-Punk", 100), ("UK", 5)],
        [("post-punk", 80), ("electronic", 100)],
        [("Electronic", 50), ("  UK ", 3)],
        [("jazz", 100)],
    ]
    assert vocabulary(lists, 3) == ["electronic", "post-punk", "uk"]


def test_culture_vector() -> None:
    vocab = ["post-punk", "uk", "electronic"]
    v = culture_vector([("Post-Punk", 100), ("uk", 50), ("seen live", 10)], vocab)
    assert v.tolist() == [1.0, 0.5, 0.0]
    assert np.isnan(culture_vector(None, vocab)).all()
    assert np.isnan(culture_vector([], vocab)).all()


LIB_IDS = {83, 70}
LIB_NAMES = frozenset({"m83", "wire"})


def test_proximity_of_a_library_artist_excludes_itself() -> None:
    got = proximity(
        83,
        {"m83"},
        [("M83", 1.0), ("Wire", 0.6), ("Knife", 0.9)],
        [(83, "M83")],
        LIB_IDS,
        LIB_NAMES,
    )
    assert got == (0.6, 1.0)


def test_proximity_counts_both_sources() -> None:
    assert proximity(1, {"knife"}, [("M83", 0.7)], [(70, "Wire")], LIB_IDS, LIB_NAMES) == (0.7, 2.0)


def test_proximity_without_link_or_data() -> None:
    assert proximity(1, {"knife"}, [("Nobody", 0.7)], [], LIB_IDS, LIB_NAMES) == (0.0, 0.0)
    best, n = proximity(1, {"knife"}, None, [(70, "Wire")], LIB_IDS, LIB_NAMES)
    assert math.isnan(best) and n == 1.0
    best, n = proximity(1, {"knife"}, [], [], LIB_IDS, LIB_NAMES)
    assert math.isnan(best) and n == 0.0


def test_proximity_excludes_a_duplicate_deezer_page() -> None:
    # A2 (84, même nom « M83 ») est une seconde page Deezer du même artiste bibliothèque que
    # A1 (83) : ce n'est pas un lien vers un AUTRE artiste de la bibliothèque (F1).
    _, sources = proximity(83, {"m83"}, [], [(84, "M83")], {83, 84}, frozenset({"m83"}))
    assert sources == 0.0


def test_proximity_still_counts_a_genuinely_different_neighbour() -> None:
    # Cas témoin : un voisin de bibliothèque réellement distinct (nom différent) compte toujours.
    _, sources = proximity(83, {"m83"}, [], [(70, "Wire")], {83, 70}, frozenset({"m83", "wire"}))
    assert sources == 1.0
