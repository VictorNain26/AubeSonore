"""Client Hype Machine — API v2 en lecture, sans clé (docs/vision.md §3).

Cette API n'a pas de documentation publique et `api.hypem.com/robots.txt` refuse les robots :
usage choisi en connaissance de cause (2026-10-01), à très faible volume (quelques requêtes par
passe), avec un User-Agent qui nous identifie. Toute réponse hors du format attendu est une
erreur, jamais une liste vide : une source qui change ou ferme se voit dans le rapport.
"""

from dataclasses import dataclass
from typing import Any

import requests
import stamina

import radio.core.http  # noqa: F401  (enregistre le hook de relance)

API = "https://api.hypem.com/v2"
USER_AGENT = "AubeSonore/3 (+https://radio.aubesonore.fr)"


class HypemError(Exception):
    """Réponse inexploitable : la source est sautée et nommée dans le rapport."""


class HypemUnavailable(Exception):
    """Indisponibilité transitoire."""


@dataclass(frozen=True)
class HypemTrack:
    artist: str
    title: str
    duration_s: int
    sitename: str


def _track(d: Any) -> HypemTrack:
    try:
        return HypemTrack(
            artist=str(d["artist"]),
            title=str(d["title"]),
            duration_s=int(d["time"]),
            sitename=str(d["sitename"]),
        )
    except (KeyError, TypeError, ValueError):
        raise HypemError("malformed track") from None


class HypemClient:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or requests.Session()

    def popular(self, mode: str, page: int) -> list[HypemTrack]:
        """Le classement des blogs : `mode` vaut « now » ou « lastweek »."""
        return [_track(d) for d in self._get("/popular", {"mode": mode, "page": page})]

    @stamina.retry(on=HypemUnavailable, attempts=3, wait_initial=2.0, wait_max=30.0)
    def _get(self, path: str, params: dict[str, Any]) -> list[Any]:
        try:
            r = self._session.get(
                API + path, params=params, headers={"User-Agent": USER_AGENT}, timeout=15
            )
        except requests.RequestException as e:
            raise HypemUnavailable(type(e).__name__) from None
        if r.status_code == 429 or r.status_code >= 500:
            raise HypemUnavailable(f"HTTP {r.status_code}")
        if r.status_code >= 400:
            raise HypemError(f"HTTP {r.status_code}")
        try:
            body = r.json()
        except ValueError:
            raise HypemError("invalid JSON") from None
        if not isinstance(body, list):
            raise HypemError("not a list")
        return body
