"""Page de vote (spec §6.2) : une page pour le téléphone, un geste par titre.

- Chaque requête, sauf /sante, doit porter un jeton Cloudflare Access valide.
- L'extrait est servi par la page elle-même. Le serveur demande à Deezer une URL fraîche
  (signée, elle expire) et relaie l'audio : l'URL ne quitte jamais le serveur et n'est jamais
  journalisée.
- Le vote est enregistré tout de suite en SQLite ; la page passe au titre suivant.
- Fonctions synchrones : FastAPI les exécute dans son pool de fils, une connexion SQLite par
  requête.
"""

import html
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal, Protocol

import jwt
from fastapi import Depends, FastAPI, Form, Header, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response

from radio.core.db import connect
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable
from radio.votes.select import Ballot, pending_ballots, record_vote

logger = logging.getLogger(__name__)

_STYLE = """
:root{color-scheme:light;--fond:#f4f2ec;--texte:#1d1b18;--doux:#696258;--oui:#2e7a4c;
--non:#a13a2b}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--fond:#151412;--texte:#eeeae3;
--doux:#a59e93;--oui:#3f9a63;--non:#c2513f}}
body{margin:0;background:var(--fond);color:var(--texte);font:17px/1.45 system-ui,sans-serif}
main{max-width:30rem;margin:0 auto;padding:1.5rem 1rem;display:flex;flex-direction:column;
gap:.8rem}
h1{font-size:1.6rem;line-height:1.2;margin:0;text-wrap:balance}
.reste,.artiste,.question{margin:0;color:var(--doux)}
.artiste{font-size:1.1rem}
audio{width:100%}
form{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
button{font:inherit;font-weight:600;padding:1.1rem;border:0;border-radius:.6rem;color:#fff}
button:focus-visible{outline:3px solid var(--texte);outline-offset:2px}
.oui{background:var(--oui)}
.non{background:var(--non)}
.passer{grid-column:1/-1;background:transparent;color:var(--doux);border:1px solid var(--doux)}
"""

_CHOICES = (("oui", "Oui"), ("non", "Non"), ("passer", "Passer"))


class PreviewSource(Protocol):
    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None: ...

    def download_preview(self, url: str) -> bytes: ...


def _byte_range(value: str, total: int) -> tuple[int, int] | None:
    """Une seule plage `bytes=A-B`, `bytes=A-` ou `bytes=-N` sur un contenu de `total` octets.
    None si la syntaxe ne correspond pas ou si la plage n'est pas satisfiable (iOS Safari sonde
    l'extrait avec `Range: bytes=0-1` avant de le lire)."""
    prefix = "bytes="
    if not value.startswith(prefix) or "," in value:
        return None
    start_s, sep, end_s = value[len(prefix) :].partition("-")
    if not sep:
        return None
    try:
        if start_s == "":
            if end_s == "":
                return None
            suffix = int(end_s)
            if suffix <= 0:
                return None
            start, end = max(0, total - suffix), total - 1
        else:
            start = int(start_s)
            end = int(end_s) if end_s else total - 1
    except ValueError:
        return None
    if start < 0 or end < start or start >= total:
        return None
    return start, min(end, total - 1)


def _shell(body: str) -> str:
    return (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<title>AubeSonore : à l'écoute</title><style>{_STYLE}</style></head>"
        f"<body><main>{body}</main></body></html>"
    )


def _page(ballots: list[Ballot]) -> str:
    if not ballots:
        return _shell(
            "<h1>Rien à écouter</h1>"
            '<p class="reste">La prochaine sélection arrivera avec le rappel WhatsApp.</p>'
        )
    b = ballots[0]
    buttons = "".join(
        f'<button name="choix" value="{v}" class="{v}">{label}</button>' for v, label in _CHOICES
    )
    return _shell(
        f'<p class="reste">{len(ballots)} à écouter</p>'
        f"<h1>{html.escape(b.title)}</h1>"
        f'<p class="artiste">{html.escape(b.artist)}</p>'
        f'<audio controls autoplay preload="auto" src="/extrait/{b.deezer_track_id}" '
        'onerror="this.nextElementSibling.hidden=false"></audio>'
        '<p class="indispo" hidden>Extrait indisponible : choisir « Passer ».</p>'
        '<p class="question">À sa place sur AubeSonore ?</p>'
        '<form method="post" action="/vote">'
        f'<input type="hidden" name="tid" value="{b.deezer_track_id}">{buttons}</form>'
    )


def create_app(db_path: Path, deezer: PreviewSource, verify: Callable[[str], None]) -> FastAPI:
    def access(cf_access_jwt_assertion: Annotated[str | None, Header()] = None) -> None:
        if cf_access_jwt_assertion is None:
            raise HTTPException(403, "Accès réservé")
        try:
            verify(cf_access_jwt_assertion)
        except jwt.PyJWTError as e:
            logger.warning("access token refused (%s)", type(e).__name__)
            raise HTTPException(403, "Accès réservé") from None

    def waiting() -> list[Ballot]:
        conn = connect(db_path)
        try:
            return pending_ballots(conn)
        finally:
            conn.close()

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    guarded = [Depends(access)]

    @app.get("/sante")
    def sante() -> dict[str, str]:
        return {"etat": "ok"}

    @app.get("/", response_class=HTMLResponse, dependencies=guarded)
    def page() -> str:
        return _page(waiting())

    @app.post("/vote", dependencies=guarded)
    def vote(
        tid: Annotated[int, Form()], choix: Annotated[Literal["oui", "non", "passer"], Form()]
    ) -> Response:
        conn = connect(db_path)
        try:
            recorded = record_vote(conn, tid, choix, datetime.now(UTC).isoformat())
        finally:
            conn.close()
        if not recorded:
            return HTMLResponse(
                _shell('<p>Ce titre n\'attend plus de vote.</p><p><a href="/">Continuer</a></p>'),
                status_code=409,
            )
        return RedirectResponse("/", status_code=303)

    @app.get("/extrait/{tid}", dependencies=guarded)
    def extrait(tid: int, range: Annotated[str | None, Header()] = None) -> Response:
        if not any(b.deezer_track_id == tid for b in waiting()):
            raise HTTPException(404, "Titre inconnu")
        try:
            found = deezer.track(tid)
            if found is None or found[1] is None:
                logger.warning("preview unavailable for %s (%s)", tid, "no preview")
                raise HTTPException(404, "Extrait indisponible")
            audio = deezer.download_preview(found[1])
        except DeezerError as e:
            logger.warning("preview unavailable for %s (%s)", tid, type(e).__name__)
            raise HTTPException(404, "Extrait indisponible") from None
        except DeezerUnavailable as e:
            logger.warning("preview unavailable for %s (%s)", tid, type(e).__name__)
            raise HTTPException(503, "Deezer indisponible, réessayer plus tard") from None

        total = len(audio)
        headers = {"Cache-Control": "no-store", "Accept-Ranges": "bytes"}
        if range is None:
            return Response(audio, media_type="audio/mpeg", headers=headers)
        parsed = _byte_range(range, total)
        if parsed is None:
            return Response(
                status_code=416, headers={**headers, "Content-Range": f"bytes */{total}"}
            )
        start, end = parsed
        headers["Content-Range"] = f"bytes {start}-{end}/{total}"
        return Response(
            audio[start : end + 1], media_type="audio/mpeg", status_code=206, headers=headers
        )

    return app
