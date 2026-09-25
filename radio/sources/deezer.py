"""Client Deezer (API publique, sans authentification) — endpoints réellement utilisés.

Quota documenté : 50 requêtes / 5 s par IP ; on vise 40 / 5 s.
"""

from dataclasses import dataclass
from typing import Any

import requests
import stamina
from pyrate_limiter import Duration, Limiter, Rate

import radio.core.http  # noqa: F401  (enregistre le hook de relance)

API = "https://api.deezer.com"
_TRANSIENT_CODES = frozenset({4, 700})
_NO_DATA = 800


class DeezerError(Exception):
    """Erreur définitive : relancer ne servirait à rien."""


class DeezerUnavailable(Exception):
    """Indisponibilité transitoire (quota, surcharge, réseau)."""


@dataclass(frozen=True)
class DeezerTrack:
    id: int
    title: str
    title_short: str
    duration_s: int
    rank: int
    artist_id: int
    artist_name: str
    has_preview: bool


@dataclass(frozen=True)
class DeezerArtist:
    id: int
    name: str
    nb_fan: int


def _track(d: Any) -> DeezerTrack:
    try:
        return DeezerTrack(
            id=int(d["id"]),
            title=str(d["title"]),
            title_short=str(d.get("title_short") or d["title"]),
            duration_s=int(d["duration"]),
            rank=int(d.get("rank") or 0),
            artist_id=int(d["artist"]["id"]),
            artist_name=str(d["artist"]["name"]),
            has_preview=bool(d.get("preview")),
        )
    except (KeyError, TypeError, ValueError):
        raise DeezerError("malformed track") from None


def _artist(d: Any) -> DeezerArtist:
    try:
        return DeezerArtist(id=int(d["id"]), name=str(d["name"]), nb_fan=int(d["nb_fan"]))
    except (KeyError, TypeError, ValueError):
        raise DeezerError("malformed artist") from None


class DeezerClient:
    def __init__(
        self, session: requests.Session | None = None, limiter: Limiter | None = None
    ) -> None:
        self._session = session or requests.Session()
        self._limiter = limiter or Limiter(Rate(40, Duration.SECOND * 5))

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        body = self._get("/search/track", {"q": query, "limit": limit})
        return [_track(d) for d in body.get("data") or []]

    def artist(self, artist_id: int) -> DeezerArtist | None:
        body = self._get(f"/artist/{artist_id}", {})
        return _artist(body) if "id" in body else None

    def related(self, artist_id: int) -> list[DeezerArtist]:
        body = self._get(f"/artist/{artist_id}/related", {})
        return [_artist(d) for d in body.get("data") or []]

    def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
        body = self._get(f"/artist/{artist_id}/top", {"limit": limit})
        return [_track(d) for d in body.get("data") or []]

    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None:
        """Le titre et une URL d'extrait fraîche. L'URL est signée et expire : ne jamais la
        stocker, la journaliser ni la mettre dans un message."""
        body = self._get(f"/track/{track_id}", {})
        if "id" not in body:
            return None
        preview = body.get("preview")
        return _track(body), (str(preview) if preview else None)

    @stamina.retry(on=DeezerUnavailable, attempts=5, wait_initial=1.0, wait_max=30.0)
    def download_preview(self, url: str) -> bytes:
        try:
            r = self._session.get(url, timeout=30)
        except requests.RequestException as e:
            raise DeezerUnavailable(type(e).__name__) from None
        if r.status_code == 429 or r.status_code >= 500:
            raise DeezerUnavailable(f"preview HTTP {r.status_code}")
        if r.status_code >= 400 or not r.content:
            raise DeezerError(f"preview HTTP {r.status_code}")
        return r.content

    @stamina.retry(on=DeezerUnavailable, attempts=5, wait_initial=1.0, wait_max=30.0)
    def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        self._limiter.try_acquire("deezer")
        try:
            r = self._session.get(API + path, params=params, timeout=15)
        except requests.RequestException as e:
            raise DeezerUnavailable(type(e).__name__) from None
        body: Any
        try:
            body = r.json()
        except ValueError:
            body = None
        if isinstance(body, dict) and body.get("error"):
            err = body["error"]
            code = err.get("code") if isinstance(err, dict) else None
            if code in _TRANSIENT_CODES:
                raise DeezerUnavailable(f"code {code}")
            if code == _NO_DATA:
                return {"data": []}
            raise DeezerError(f"code {code}")
        if r.status_code == 429 or r.status_code >= 500:
            raise DeezerUnavailable(f"HTTP {r.status_code}")
        if r.status_code >= 400:
            raise DeezerError(f"HTTP {r.status_code}")
        if not isinstance(body, dict):
            raise DeezerUnavailable("invalid JSON")
        return body
