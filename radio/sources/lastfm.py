"""Client Last.fm — artist.getSimilar, artist.getInfo, artist.getTopTags.

La clé voyage en paramètre de requête : aucun message d'exception ni log ne contient d'URL.
"""

from dataclasses import dataclass
from typing import Any

import requests
import stamina
from pyrate_limiter import Duration, Limiter, Rate

import radio.core.http  # noqa: F401  (enregistre le hook de relance)

API = "https://ws.audioscrobbler.com/2.0/"
_NOT_FOUND = 6
_UNAVAILABLE = frozenset({8, 11, 16, 29, 10, 26})  # 10/26 : clé invalide/suspendue, globale


class LastfmError(Exception):
    """Erreur définitive."""


class LastfmUnavailable(Exception):
    """Indisponibilité transitoire, ou problème de clé qui doit arrêter la passe."""


class _NotFound(Exception):
    pass


@dataclass(frozen=True)
class SimilarArtist:
    name: str
    match: float


@dataclass(frozen=True)
class ArtistInfo:
    name: str
    listeners: int | None


@dataclass(frozen=True)
class Tag:
    name: str
    count: int


def _as_list(x: Any) -> list[Any]:
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


class LastfmClient:
    def __init__(
        self,
        api_key: str,
        session: requests.Session | None = None,
        limiter: Limiter | None = None,
    ) -> None:
        self._key = api_key
        self._session = session or requests.Session()
        self._limiter = limiter or Limiter(Rate(4, Duration.SECOND))

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        try:
            body = self._call("artist.getSimilar", artist=artist, limit=limit)
        except _NotFound:
            return []
        try:
            return [
                SimilarArtist(str(a["name"]), float(a["match"]))
                for a in _as_list(body.get("similarartists", {}).get("artist"))
            ]
        except (KeyError, TypeError, ValueError, AttributeError):
            raise LastfmError("malformed similar artists") from None

    def artist_info(self, artist: str) -> ArtistInfo | None:
        try:
            body = self._call("artist.getInfo", artist=artist)
        except _NotFound:
            return None
        try:
            a = body["artist"]
            raw = (a.get("stats") or {}).get("listeners")
            return ArtistInfo(str(a["name"]), int(raw) if raw not in (None, "") else None)
        except (KeyError, TypeError, ValueError, AttributeError):
            raise LastfmError("malformed artist info") from None

    def artist_top_tags(self, artist: str) -> list[Tag]:
        try:
            body = self._call("artist.getTopTags", artist=artist)
        except _NotFound:
            return []
        try:
            return [
                Tag(str(t["name"]), int(t["count"]))
                for t in _as_list(body.get("toptags", {}).get("tag"))
            ]
        except (KeyError, TypeError, ValueError, AttributeError):
            raise LastfmError("malformed top tags") from None

    @stamina.retry(on=LastfmUnavailable, attempts=5, wait_initial=1.0, wait_max=30.0)
    def _call(self, method: str, **params: Any) -> dict[str, Any]:
        self._limiter.try_acquire("lastfm")
        query = {
            "method": method,
            "api_key": self._key,
            "format": "json",
            "autocorrect": 1,
            **params,
        }
        try:
            r = self._session.get(API, params=query, timeout=15)
        except requests.RequestException as e:
            raise LastfmUnavailable(type(e).__name__) from None
        body: Any
        try:
            body = r.json()
        except ValueError:
            body = None
        if isinstance(body, dict) and "error" in body:
            code = body["error"]
            if code == _NOT_FOUND:
                raise _NotFound
            if code in _UNAVAILABLE:
                raise LastfmUnavailable(f"code {code}")
            raise LastfmError(f"code {code}")
        if r.status_code == 429 or r.status_code >= 500:
            raise LastfmUnavailable(f"HTTP {r.status_code}")
        if r.status_code >= 400:
            raise LastfmError(f"HTTP {r.status_code}")
        if not isinstance(body, dict):
            raise LastfmUnavailable("invalid JSON")
        return body
