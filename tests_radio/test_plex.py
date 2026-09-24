from dataclasses import dataclass, field
from pathlib import PurePosixPath

import pytest

from radio.sources.plex import LibraryGuardError, PlexSource, PlexTrack, check_section

ROOT = PurePosixPath("/media/plex/Musique")


@dataclass
class FakeTrack:
    ratingKey: int
    title: str
    grandparentTitle: str
    parentTitle: str
    duration: int | None
    viewCount: int | None = None
    originalTitle: str | None = None


@dataclass
class FakeSection:
    title: str = "Musique"
    type: str = "artist"
    locations: list[str] = field(default_factory=lambda: ["/media/plex/Musique"])
    items: list[FakeTrack] = field(default_factory=list)
    container_sizes: list[int] = field(default_factory=list)

    def searchTracks(self, container_size: int) -> list[FakeTrack]:
        self.container_sizes.append(container_size)
        return self.items


class FakeServer:
    def __init__(self, section: FakeSection) -> None:
        self.section_obj = section
        self.library = self

    def section(self, title: str) -> FakeSection:
        assert title == self.section_obj.title
        return self.section_obj


def source(section: FakeSection) -> PlexSource:
    return PlexSource(
        "http://plex", "tok", section.title, ROOT, lambda url, tok: FakeServer(section)
    )


def test_tracks_are_read_with_plays_and_track_artist() -> None:
    sec = FakeSection(
        items=[
            FakeTrack(1, "Mannequin", "Wire", "Pink Flag", 157000, viewCount=4),
            FakeTrack(2, "Song", "Various Artists", "Comp", None, originalTitle="Au Pairs"),
        ]
    )
    assert source(sec).tracks() == [
        PlexTrack("1", "Wire", "Mannequin", "Pink Flag", 157000, 4),
        PlexTrack("2", "Au Pairs", "Song", "Comp", None, 0),
    ]
    assert sec.container_sizes == [5000]


def test_forbidden_section_is_refused() -> None:
    with pytest.raises(LibraryGuardError):
        source(FakeSection(title="Musique Second Wave"))


def test_non_music_section_is_refused() -> None:
    with pytest.raises(LibraryGuardError):
        source(FakeSection(type="movie"))


def test_location_outside_root_is_refused() -> None:
    with pytest.raises(LibraryGuardError):
        source(FakeSection(locations=["/media/plex/Musique", "/srv/autre"]))


@pytest.mark.parametrize(
    "loc", ["/media/plex/Musique/../x", "relative/path", "/media/plex/MusiqueBis"]
)
def test_suspicious_locations_are_refused(loc: str) -> None:
    with pytest.raises(LibraryGuardError):
        check_section("Musique", [loc], ROOT)


@pytest.mark.parametrize("root", ["/", "/media", "media/plex", "/media/plex/../x"])
def test_bad_roots_are_refused(root: str) -> None:
    with pytest.raises(LibraryGuardError):
        check_section("Musique", ["/media/plex/Musique"], PurePosixPath(root))


def test_sub_location_is_accepted() -> None:
    check_section("Musique", ["/media/plex/Musique/Rock"], ROOT)
