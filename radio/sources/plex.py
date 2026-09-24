"""Lecture seule de la bibliothèque musicale Plex (python-plexapi), derrière un verrou.

Le verrou ne touche jamais au système de fichiers : il ne compare que des chemins textuels.
"""

import logging
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

from plexapi.server import PlexServer

logger = logging.getLogger(__name__)

_FORBIDDEN_SECTIONS = frozenset({"musique second wave"})
_TRACK_BATCH = 5000


class LibraryGuardError(Exception):
    """La section ou la racine configurée n'est pas sûre : on refuse de lire."""


@dataclass(frozen=True)
class PlexTrack:
    key: str
    artist: str
    title: str
    album: str
    duration_ms: int | None
    plays: int


def _safe(p: PurePosixPath) -> bool:
    return p.is_absolute() and ".." not in p.parts


def check_section(title: str, locations: Iterable[str], root: PurePosixPath) -> None:
    if title.casefold() in _FORBIDDEN_SECTIONS:
        raise LibraryGuardError(f"section interdite : {title}")
    if not _safe(root) or len(root.parts) < 3:
        raise LibraryGuardError(f"racine refusée : {root}")
    for loc in locations:
        p = PurePosixPath(loc)
        if not _safe(p) or not p.is_relative_to(root):
            raise LibraryGuardError(f"emplacement hors racine : {loc}")


class PlexSource:
    def __init__(
        self,
        url: str,
        token: str,
        section_title: str,
        root: PurePosixPath,
        server_factory: Callable[[str, str], Any] = PlexServer,
    ) -> None:
        section = server_factory(url, token).library.section(section_title)
        if section.type != "artist":
            raise LibraryGuardError(f"section non musicale : {section_title}")
        check_section(section.title, section.locations, root)
        self._section = section

    def tracks(self) -> list[PlexTrack]:
        out = [
            PlexTrack(
                key=str(t.ratingKey),
                artist=str(t.originalTitle or t.grandparentTitle),
                title=str(t.title),
                album=str(t.parentTitle or ""),
                duration_ms=int(t.duration) if t.duration else None,
                plays=int(t.viewCount or 0),
            )
            for t in self._section.searchTracks(container_size=_TRACK_BATCH)
        ]
        logger.info("plex: %d tracks read", len(out))
        return out
