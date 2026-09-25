from radio.discover.neighbours import neighbours
from radio.library.artists import LibraryArtist
from radio.sources.deezer import DeezerArtist
from radio.sources.lastfm import SimilarArtist

SEED = LibraryArtist(83, "M83", ("M83",), 13)


class FakeLastfm:
    def __init__(self, similar: list[SimilarArtist]) -> None:
        self.similar = similar
        self.calls: list[tuple[str, int]] = []

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        self.calls.append((artist, limit))
        return self.similar


class FakeDeezer:
    def __init__(self, related: list[DeezerArtist]) -> None:
        self._related = related

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return self._related


def test_intersection_minus_library() -> None:
    lf = FakeLastfm(
        [
            SimilarArtist("The Knife", 0.9),
            SimilarArtist("Wire", 0.5),
            SimilarArtist("Air", 0.4),
            SimilarArtist("Justice", 0.3),
        ]
    )
    dz = FakeDeezer(
        [
            DeezerArtist(1, "Knife", 10),
            DeezerArtist(70, "Wire", 5),
            DeezerArtist(3, "Air", 7),
            DeezerArtist(4, "Only Deezer", 1),
            DeezerArtist(5, "Justice", 2),
        ]
    )
    got = neighbours(SEED, dz, lf, 50, exclude_ids={70}, exclude_names=frozenset({"air"}))
    assert [a.id for a in got] == [1, 5]
    assert lf.calls == [("M83", 50)]


def test_no_lastfm_similar_means_no_neighbour() -> None:
    dz = FakeDeezer([DeezerArtist(1, "Knife", 10)])
    assert neighbours(SEED, dz, FakeLastfm([]), 50, set(), frozenset()) == []
