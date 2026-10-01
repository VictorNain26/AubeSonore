"""Client AzuraCast 0.23.8 — endpoints réellement utilisés (docs/vision.md §7.2).

Formes vérifiées dans la spécification OpenAPI de l'instance et le code au commit 62a30e5
(docs/recherches/2026-09-30-acquisition-publication-observabilite.md §3). Jamais de
`PUT /file/{id}` : il réécrit et supprime les balises du fichier.
"""

import base64
from dataclasses import dataclass
from typing import Any

import requests
import stamina

import radio.core.http  # noqa: F401  (enregistre le hook de relance)


class AzuracastError(Exception):
    """Refus définitif (4xx) ou réponse inattendue."""


class AzuracastUnavailable(Exception):
    """Indisponibilité transitoire (réseau, 5xx)."""


@dataclass(frozen=True)
class Media:
    id: int
    song_id: str
    path: str


class AzuracastClient:
    def __init__(
        self, url: str, api_key: str, station: int = 1, session: requests.Session | None = None
    ) -> None:
        self._api = f"{url.rstrip('/')}/api"
        self._station = station
        self._headers = {"X-API-Key": api_key}
        self._session = session or requests.Session()

    def files(self) -> list[Media]:
        return [
            Media(int(m["id"]), str(m["song_id"]), str(m["path"]))
            for m in self._call("GET", self._at("/files"))
        ]

    def upload(self, path: str, data: bytes) -> Media:
        m = self._call(
            "POST", self._at("/files"), json={"path": path, "file": base64.b64encode(data).decode()}
        )
        return Media(int(m["id"]), str(m["song_id"]), str(m["path"]))

    def delete(self, paths: list[str]) -> list[str]:
        """Supprime des fichiers ; renvoie les erreurs signalées par AzuraCast."""
        r = self._call("PUT", self._at("/files/batch"), json={"do": "delete", "files": paths})
        return [str(e) for e in r.get("errors") or []]

    def busy_song_ids(self) -> set[str]:
        """Titre en cours, et titres en file d'attente ou déjà préparés par Liquidsoap : jamais
        supprimés. `now_playing` est nul quand la station est hors ligne."""
        busy = {str(q["song"]["id"]) for q in self._call("GET", self._at("/queue"))}
        playing = self._call("GET", f"/nowplaying/{self._station}")["now_playing"]
        if playing is not None:
            busy.add(str(playing["song"]["id"]))
        return busy

    def _at(self, path: str) -> str:
        return f"/station/{self._station}{path}"

    @stamina.retry(on=AzuracastUnavailable, attempts=5, wait_initial=1.0, wait_max=30.0)
    def _call(self, method: str, path: str, **kw: Any) -> Any:
        try:
            r = self._session.request(
                method, self._api + path, headers=self._headers, timeout=120, **kw
            )
        except requests.RequestException as e:
            raise AzuracastUnavailable(type(e).__name__) from None
        if r.status_code >= 500:
            raise AzuracastUnavailable(f"HTTP {r.status_code}")
        if r.status_code >= 400:
            raise AzuracastError(f"HTTP {r.status_code}")
        return r.json()
