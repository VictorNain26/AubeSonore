# Plan v3-1 — Nettoyage et fondations — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** repartir d'une base propre (étape 0), puis poser les fondations v3. Elles
comprennent le socle technique, les clients Plex, Deezer et Last.fm, la synchronisation de
la bibliothèque et le rapprochement Deezer strict, avec la commande `radio library-sync`.

**Architecture :** paquet unique `radio/` écrit de zéro sur une branche neuve issue de
`main`. Clients HTTP fins avec relances stamina et limiteur pyrate-limiter. SQLite avec
tables STRICT et migrations par `PRAGMA user_version`. Plex est lu par python-plexapi,
derrière un verrou de section.

**Tech Stack :** Python 3.12, uv, typer, pydantic 2, pydantic-settings, requests, stamina,
pyrate-limiter 4, plexapi, pytest, responses, mypy strict, ruff.

**Spec :** `docs/superpowers/specs/2026-09-24-gout-decouverte-v3-design.md`

## Global Constraints

- Plex en **lecture seule** : aucune écriture dans Plex, aucun accès au système de fichiers pour les morceaux (tout passe par l'API Plex).
- Jamais de lecture, liste ou référence du disque « MUSIC MAËL » (`/media/musique`), ni dans le code, ni dans les tests, ni dans les commandes.
- Jamais la section Plex « Musique second wave ».
- Les chemins Plex acceptés sont uniquement sous `PLEX_MUSIC_ROOT` (défaut `/media/plex/Musique`). La racine est refusée si elle est `/`, `/media` ou relative.
- Aucun secret dans les journaux, messages d'exception, tests ou commits : jeton Plex, clé Last.fm (paramètre de requête), URL Deezer signées. Les messages d'exception ne contiennent **jamais** d'URL ni le `str()` d'une exception requests, seulement le nom du type, un code HTTP ou un code d'erreur d'API.
- Un repli silencieux est pire qu'une panne : tout ce qui est sauté est compté et nommé dans le rapport.
- Pas d'usine à gaz : pas de validation défensive de données qu'on écrit nous-mêmes, pas de compteurs ou de crochets ajoutés « au cas où ».
- Documentation, commentaires et commits en français. Messages de log en anglais.
- Les implémenteurs ne touchent ni `.env`, ni `data/`, ni `models/`, n'appellent aucune API réelle et ne lancent aucune commande `radio` contre les vrais services.
- Ne jamais utiliser `git stash` (pile partagée entre worktrees). Ne jamais toucher `~/radio/pipeline` (production).
- Fin de chaque message de commit :
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY
  ```

---

## Structure des fichiers

```
pyproject.toml, uv.lock          # projet uv (Tâche 1)
config/editorial.toml            # réglages éditoriaux validés (Tâche 1)
radio/__init__.py
radio/core/config.py             # Settings (.env) + Editorial (TOML)
radio/core/db.py                 # connexion SQLite + migrations
radio/core/migrations/001_library.sql
radio/core/http.py               # hook de relance unique (stamina)
radio/sources/deezer.py          # client Deezer (recherche de titres)
radio/sources/lastfm.py          # client Last.fm (similaires, infos, tags)
radio/sources/plex.py            # lecture Plex + verrou de section
radio/library/sync.py            # Plex → table library_tracks
radio/library/match.py           # normalisation + rapprochement Deezer strict
radio/cli.py                     # typer : radio library-sync
tests_radio/...                  # un fichier de test par module
```

---

### Tâche 0 : Nettoyage (contrôleur, pas de sous-agent)

Réalisée par le contrôleur lui-même : elle touche git et des données. Aucune suppression
sans confirmation de Victor.

- [ ] **Étape 1 : étiqueter l'ancienne branche**

```bash
cd /home/victormoi/radio/pipeline-refonte
git tag archive/antenne-v1 refonte/antenne
```

- [ ] **Étape 2 : archiver les données et modèles de l'ancien worktree**

```bash
mkdir -p /home/victormoi/radio/archives
tar -C /home/victormoi/radio/pipeline-refonte -czf /home/victormoi/radio/archives/antenne-v1-data-models-2026-09-24.tar.gz data models
tar -tzf /home/victormoi/radio/archives/antenne-v1-data-models-2026-09-24.tar.gz | wc -l
```
Attendu : un nombre de fichiers > 0, et l'archive lisible.

- [ ] **Étape 3 : branche et worktree neufs depuis `main`**

```bash
cd /home/victormoi/radio/pipeline-refonte
git worktree add -b refonte/gout-v3 /home/victormoi/radio/pipeline-v3 main
```

- [ ] **Étape 4 : rapporter uniquement la spec, les recherches, ce plan et la liste des négatifs**

```bash
cd /home/victormoi/radio/pipeline-v3
git checkout refonte/antenne -- \
  docs/superpowers/specs/2026-09-24-gout-decouverte-v3-design.md \
  docs/superpowers/plans/2026-09-24-plan-v3-1-fondations.md \
  config/negatives.toml
git checkout refonte/antenne -- $(git ls-tree --name-only refonte/antenne docs/superpowers/research/ | grep -E '2026-09-2[34]-')
git status --short
```
Attendu : seulement ces fichiers ajoutés. Aucun `radio/`, `tests_radio/`, `data/*` ni `models/`.

- [ ] **Étape 5 : copier le `.env` sans l'afficher**

```bash
cp /home/victormoi/radio/pipeline-refonte/.env /home/victormoi/radio/pipeline-v3/.env
chmod 600 /home/victormoi/radio/pipeline-v3/.env
cd /home/victormoi/radio/pipeline-v3 && git check-ignore -q .env && echo ignored
```
Attendu : `ignored`.

- [ ] **Étape 6 : commit**

```bash
git add docs config/negatives.toml
git commit -m "chore(v3): base propre — spec, recherches, plan et négatifs de démarrage

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

- [ ] **Étape 7 : demander à Victor la suppression de l'ancien worktree `pipeline-refonte`**

La branche et l'étiquette restent. Seul le dossier de travail est supprimé, par
`git worktree remove`, et uniquement après son « oui ». En attendant, on continue dans
`pipeline-v3`.

---

### Tâche 1 : Projet uv et socle (config, base, relances)

**Files :**
- Create : `pyproject.toml`, `config/editorial.toml`, `radio/__init__.py`, `radio/core/__init__.py`, `radio/core/config.py`, `radio/core/db.py`, `radio/core/migrations/001_library.sql`, `radio/core/http.py`, `tests_radio/__init__.py`, `tests_radio/conftest.py`, `tests_radio/test_core.py`
- Modify : `.gitignore` (ajouter `.superpowers/` et `.venv/`)

**Interfaces :**
- Produces :
  - `Settings` : champs `plex_url: str`, `plex_token: SecretStr | None`, `plex_music_section: str | None`, `plex_music_root: Path`, `lastfm_api_key: SecretStr | None`, `data_dir: Path`, `config_dir: Path`.
  - `load_editorial(path: Path) -> Editorial`, avec `Editorial.library.duration_tolerance_s: int`.
  - `connect(path: Path) -> sqlite3.Connection` : migrations appliquées, `row_factory = sqlite3.Row`, clés étrangères actives.
  - `radio.core.http.log_retry` : enregistré à l'import.

- [ ] **Étape 1 : `pyproject.toml`**

```toml
[project]
name = "aubesonore-radio"
version = "3.0.0"
description = "AubeSonore — goût et découverte"
requires-python = ">=3.12,<3.13"
dependencies = [
    "typer>=0.27",
    "pydantic>=2.13",
    "pydantic-settings>=2.15",
    "requests>=2.34",
    "stamina>=26.1",
    "pyrate-limiter>=4.5,<5",
    "plexapi>=4.18",
]

[project.scripts]
radio = "radio.cli:app"

[dependency-groups]
dev = [
    "pytest>=9.1",
    "responses>=0.25",
    "mypy>=2.3",
    "ruff>=0.16",
    "types-requests",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["radio"]
artifacts = ["radio/core/migrations/*.sql"]

[tool.pytest.ini_options]
testpaths = ["tests_radio"]

[tool.ruff]
line-length = 100
target-version = "py312"
include = ["radio/**/*.py", "tests_radio/**/*.py"]

[tool.ruff.lint]
select = ["E", "F", "W", "I", "B", "UP", "SIM", "RUF"]

[tool.mypy]
python_version = "3.12"
files = ["radio"]
strict = true
plugins = ["pydantic.mypy"]
untyped_calls_exclude = ["plexapi"]
```

Puis `uv sync` (crée `uv.lock` et `.venv`).

- [ ] **Étape 2 : `.gitignore`** : ajouter à la fin

```
.superpowers/
.venv/
```

- [ ] **Étape 3 : écrire les tests qui échouent** — `tests_radio/conftest.py` :

```python
import pytest
import stamina


@pytest.fixture(autouse=True)
def _stamina_testing() -> None:
    # Relances sans attente dans les tests.
    stamina.set_testing(True, attempts=3)
```

`tests_radio/test_core.py` :

```python
import logging
import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import Settings, load_editorial
from radio.core.db import connect
from radio.core.http import log_retry


def test_connect_applies_migrations(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 1
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"library_tracks", "deezer_matches"} <= names
    assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_connect_is_idempotent(tmp_path: Path) -> None:
    connect(tmp_path / "radio.db").close()
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 1


def test_match_row_consistency_is_enforced(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    conn.execute(
        "INSERT INTO library_tracks VALUES ('k1', 'A', 'T', 'Al', 200000, 0, '2026-09-24')"
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO deezer_matches VALUES ('k1', 'matched', NULL, NULL, NULL, '2026-09-24')"
        )


def test_editorial_loads_and_validates(tmp_path: Path) -> None:
    p = tmp_path / "editorial.toml"
    p.write_text("[library]\nduration_tolerance_s = 3\n")
    assert load_editorial(p).library.duration_tolerance_s == 3
    p.write_text("[library]\nduration_tolerance_s = 60\n")
    with pytest.raises(ValidationError):
        load_editorial(p)


def test_settings_reads_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("PLEX_TOKEN", "tok")
    monkeypatch.setenv("PLEX_MUSIC_SECTION", "Musique")
    s = Settings(_env_file=None)
    assert s.plex_token is not None and s.plex_token.get_secret_value() == "tok"
    assert s.plex_music_section == "Musique"
    assert "tok" not in repr(s)


def test_retry_hook_logs_no_arguments(caplog: pytest.LogCaptureFixture) -> None:
    class Details:
        name = "radio.sources.lastfm.LastfmClient._call"
        caused_by = RuntimeError("https://x?api_key=SECRET")
        retry_num = 2
        args = ("SECRET",)
        kwargs = {"api_key": "SECRET"}

    with caplog.at_level(logging.WARNING):
        log_retry(Details())  # type: ignore[arg-type]
    assert "SECRET" not in caplog.text
    assert "RuntimeError" in caplog.text and "attempt 2" in caplog.text
```

- [ ] **Étape 4 : lancer, constater l'échec**

Run : `uv run pytest tests_radio/test_core.py -q`
Attendu : ERREUR, `ModuleNotFoundError: No module named 'radio'`.

- [ ] **Étape 5 : implémenter**

`radio/__init__.py` et `radio/core/__init__.py` : vides. `tests_radio/__init__.py` : vide.

`config/editorial.toml` :

```toml
# Réglages éditoriaux AubeSonore v3 — validés au chargement (radio/core/config.py).

[library]
# Écart maximal de durée (secondes) entre le titre Plex et le titre Deezer rapproché.
duration_tolerance_s = 3
```

`radio/core/config.py` :

```python
"""Configuration : secrets et chemins depuis .env, réglages éditoriaux depuis un TOML validé."""

import tomllib
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    plex_url: str = "http://127.0.0.1:32400"
    plex_token: SecretStr | None = None
    plex_music_section: str | None = None
    # Seule racine dont on accepte les chemins de section renvoyés par Plex.
    plex_music_root: Path = Path("/media/plex/Musique")
    lastfm_api_key: SecretStr | None = None
    data_dir: Path = Field(default=REPO_ROOT / "data", validation_alias="RADIO_DATA_DIR")
    config_dir: Path = Field(default=REPO_ROOT / "config", validation_alias="RADIO_CONFIG_DIR")


class LibraryConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    duration_tolerance_s: int = Field(default=3, ge=0, le=10)


class Editorial(BaseModel):
    model_config = ConfigDict(extra="forbid")
    library: LibraryConfig = LibraryConfig()


def load_editorial(path: Path) -> Editorial:
    with path.open("rb") as f:
        return Editorial.model_validate(tomllib.load(f))
```

`radio/core/migrations/001_library.sql` :

```sql
CREATE TABLE library_tracks (
    plex_key    TEXT PRIMARY KEY,
    artist      TEXT NOT NULL,
    title       TEXT NOT NULL,
    album       TEXT NOT NULL,
    duration_ms INTEGER,
    plays       INTEGER NOT NULL CHECK (plays >= 0),
    synced_at   TEXT NOT NULL
) STRICT;

CREATE TABLE deezer_matches (
    plex_key         TEXT PRIMARY KEY REFERENCES library_tracks (plex_key) ON DELETE CASCADE,
    status           TEXT NOT NULL CHECK (status IN ('matched', 'unmatched')),
    reason           TEXT CHECK (reason IN ('no_duration', 'no_result', 'no_exact_match')),
    deezer_track_id  INTEGER,
    deezer_artist_id INTEGER,
    matched_at       TEXT NOT NULL,
    CHECK ((status = 'matched') = (deezer_track_id IS NOT NULL
                                   AND deezer_artist_id IS NOT NULL
                                   AND reason IS NULL)),
    CHECK ((status = 'unmatched') = (reason IS NOT NULL))
) STRICT;
```

`radio/core/db.py` :

```python
"""SQLite : connexion et migrations numérotées (PRAGMA user_version)."""

import sqlite3
from pathlib import Path

MIGRATIONS = Path(__file__).parent / "migrations"


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    _migrate(conn)
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for script in sorted(MIGRATIONS.glob("*.sql")):
        version = int(script.name.split("_", 1)[0])
        if version <= current:
            continue
        with conn:
            conn.executescript(script.read_text(encoding="utf-8"))
            conn.execute(f"PRAGMA user_version = {version}")
```

`radio/core/http.py` :

```python
"""Hook de relance unique du processus (stamina).

`set_on_retry_hooks` est global : un seul hook générique, qui ne journalise que le nom de la
fonction, le type d'exception et le numéro d'essai. Jamais les arguments ni le message : la
clé Last.fm voyage dans l'URL, et les URL d'extraits Deezer sont signées.
"""

import logging

from stamina.instrumentation import RetryDetails, set_on_retry_hooks

logger = logging.getLogger(__name__)


def log_retry(details: RetryDetails) -> None:
    logger.warning(
        "%s failed (%s), retrying (attempt %d)",
        details.name,
        type(details.caused_by).__name__,
        details.retry_num,
    )


set_on_retry_hooks((log_retry,))
```

- [ ] **Étape 6 : lancer, constater le succès**

Run : `uv run pytest tests_radio/test_core.py -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Attendu : 6 passed, mypy et ruff propres (lancer `uv run ruff format .` si besoin).

- [ ] **Étape 7 : commit**

```bash
git add pyproject.toml uv.lock .gitignore config/editorial.toml radio tests_radio
git commit -m "feat(v3): socle — projet uv, configuration, base SQLite, hook de relance"
```
(avec les deux lignes de fin de message des contraintes globales)

---

### Tâche 2 : Client Deezer (recherche de titres)

**Files :**
- Create : `radio/sources/__init__.py` (vide), `radio/sources/deezer.py`, `tests_radio/test_deezer.py`

**Interfaces :**
- Consumes : `radio.core.http` (import pour enregistrer le hook).
- Produces :
  - `DeezerTrack(id: int, title: str, title_short: str, duration_s: int, rank: int, artist_id: int, artist_name: str, has_preview: bool)`, dataclass figée.
  - Exceptions : `DeezerError` (définitive), `DeezerUnavailable` (transitoire). Ce sont deux classes **sœurs**, pas parent et enfant : un `except DeezerError` n'avale jamais une indisponibilité.
  - `DeezerClient(session: requests.Session | None = None, limiter: Limiter | None = None)` avec `.search_tracks(query: str, limit: int = 10) -> list[DeezerTrack]`.

Règles d'erreur de l'API Deezer : corps JSON `{"error": {"code": ...}}`, même en HTTP 200.

| Cas | Résultat |
|---|---|
| code 4 (quota) ou 700 (service occupé) | `DeezerUnavailable` : relancé, puis propagé |
| code 800 (aucune donnée) | liste vide |
| autre code | `DeezerError` |
| HTTP 429 ou ≥ 500, erreur réseau, JSON illisible | `DeezerUnavailable` |
| autre HTTP ≥ 400 sans corps d'erreur | `DeezerError` |
| élément de résultat mal formé | `DeezerError` |

- [ ] **Étape 1 : tests qui échouent** — `tests_radio/test_deezer.py` :

```python
import pytest
import requests
import responses
from pyrate_limiter import Duration, Limiter, Rate

from radio.sources.deezer import DeezerClient, DeezerError, DeezerTrack, DeezerUnavailable

URL = "https://api.deezer.com/search/track"


def client() -> DeezerClient:
    return DeezerClient(limiter=Limiter(Rate(1000, Duration.SECOND)))


def item(**over: object) -> dict[str, object]:
    base: dict[str, object] = {
        "id": 3135556,
        "title": "Harder, Better, Faster, Stronger",
        "title_short": "Harder, Better, Faster, Stronger",
        "duration": 224,
        "rank": 850000,
        "preview": "https://cdnt-preview.dzcdn.net/signed",
        "artist": {"id": 27, "name": "Daft Punk"},
    }
    base.update(over)
    return base


@responses.activate
def test_search_parses_tracks() -> None:
    responses.get(URL, json={"data": [item()]})
    got = client().search_tracks('artist:"Daft Punk" track:"Harder"')
    assert got == [
        DeezerTrack(
            id=3135556,
            title="Harder, Better, Faster, Stronger",
            title_short="Harder, Better, Faster, Stronger",
            duration_s=224,
            rank=850000,
            artist_id=27,
            artist_name="Daft Punk",
            has_preview=True,
        )
    ]
    assert responses.calls[0].request.params == {
        "q": 'artist:"Daft Punk" track:"Harder"',
        "limit": "10",
    }


@responses.activate
def test_missing_preview_and_title_short() -> None:
    responses.get(URL, json={"data": [item(preview="", title_short=None)]})
    (t,) = client().search_tracks("q")
    assert t.has_preview is False
    assert t.title_short == t.title


@responses.activate
def test_code_800_is_empty() -> None:
    responses.get(URL, json={"error": {"code": 800, "message": "no data"}})
    assert client().search_tracks("q") == []


@responses.activate
def test_quota_is_retried_then_unavailable() -> None:
    responses.get(URL, json={"error": {"code": 4, "message": "Quota limit exceeded"}})
    with pytest.raises(DeezerUnavailable):
        client().search_tracks("q")
    assert len(responses.calls) == 3


@responses.activate
def test_quota_then_success() -> None:
    responses.get(URL, json={"error": {"code": 4}})
    responses.get(URL, json={"data": [item()]})
    assert len(client().search_tracks("q")) == 1


@responses.activate
def test_other_code_is_definitive() -> None:
    responses.get(URL, json={"error": {"code": 501, "message": "x"}})
    with pytest.raises(DeezerError):
        client().search_tracks("q")
    assert len(responses.calls) == 1


@responses.activate
def test_http_500_and_network_are_unavailable() -> None:
    responses.get(URL, status=500)
    with pytest.raises(DeezerUnavailable):
        client().search_tracks("q")
    responses.replace(responses.GET, URL, body=requests.ConnectionError("boom https://x"))
    with pytest.raises(DeezerUnavailable) as exc:
        client().search_tracks("q")
    assert "https" not in str(exc.value)


@responses.activate
def test_http_404_is_definitive() -> None:
    responses.get(URL, status=404, body="not json")
    with pytest.raises(DeezerError):
        client().search_tracks("q")


@responses.activate
def test_malformed_item_is_definitive() -> None:
    responses.get(URL, json={"data": [{"id": 1}]})
    with pytest.raises(DeezerError):
        client().search_tracks("q")


def test_unavailable_is_not_a_deezer_error() -> None:
    assert not issubclass(DeezerUnavailable, DeezerError)
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run : `uv run pytest tests_radio/test_deezer.py -q` — attendu : ERREUR d'import.

- [ ] **Étape 3 : implémenter** — `radio/sources/deezer.py` :

```python
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


class DeezerClient:
    def __init__(
        self, session: requests.Session | None = None, limiter: Limiter | None = None
    ) -> None:
        self._session = session or requests.Session()
        self._limiter = limiter or Limiter(Rate(40, Duration.SECOND * 5))

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        body = self._get("/search/track", {"q": query, "limit": limit})
        return [_track(d) for d in body.get("data") or []]

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
```

- [ ] **Étape 4 : lancer, constater le succès**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Attendu : tout vert.

- [ ] **Étape 5 : commit** — `feat(v3): client Deezer — recherche de titres` (+ lignes de fin).

---

### Tâche 3 : Client Last.fm

**Files :**
- Create : `radio/sources/lastfm.py`, `tests_radio/test_lastfm.py`

**Interfaces :**
- Consumes : `radio.core.http`.
- Produces :
  - Dataclasses figées : `SimilarArtist(name: str, match: float)`, `ArtistInfo(name: str, listeners: int | None)`, `Tag(name: str, count: int)`.
  - Exceptions sœurs : `LastfmError` (définitive), `LastfmUnavailable` (transitoire ou globale).
  - `LastfmClient(api_key: str, session: requests.Session | None = None, limiter: Limiter | None = None)` avec :
    - `.similar_artists(artist: str, limit: int = 100) -> list[SimilarArtist]`
    - `.artist_info(artist: str) -> ArtistInfo | None`
    - `.artist_top_tags(artist: str) -> list[Tag]`

Règles (codes d'erreur Last.fm documentés) :

| Cas | Résultat |
|---|---|
| code 6 (artiste inconnu) | `[]` ou `None` |
| codes 8, 11, 16, 29 | `LastfmUnavailable` (transitoire, relancé) |
| codes 10 (clé invalide), 26 (clé suspendue) | `LastfmUnavailable` (globale : la passe doit s'arrêter) |
| autre code | `LastfmError` |
| sans corps JSON : HTTP 429 ou ≥ 500, réseau | `LastfmUnavailable` |
| sans corps JSON : autre HTTP ≥ 400 | `LastfmError` |

Autres règles :
- Un élément unique renvoyé en objet au lieu d'une liste est normalisé en liste.
- `autocorrect=1` sur toutes les méthodes artiste.
- Limiteur : 4 requêtes par seconde.
- Les messages d'erreur ne contiennent que le code, jamais `body["message"]`.

- [ ] **Étape 1 : tests qui échouent** — `tests_radio/test_lastfm.py` :

```python
import logging

import pytest
import requests
import responses
from pyrate_limiter import Duration, Limiter, Rate

from radio.sources.lastfm import (
    ArtistInfo,
    LastfmClient,
    LastfmError,
    LastfmUnavailable,
    SimilarArtist,
    Tag,
)

URL = "https://ws.audioscrobbler.com/2.0/"
KEY = "k3y-s3cr3t"


def client() -> LastfmClient:
    return LastfmClient(KEY, limiter=Limiter(Rate(1000, Duration.SECOND)))


@responses.activate
def test_similar_artists() -> None:
    responses.get(
        URL,
        json={"similarartists": {"artist": [{"name": "Wire", "match": "0.83", "mbid": ""}]}},
    )
    assert client().similar_artists("A Certain Ratio", limit=50) == [SimilarArtist("Wire", 0.83)]
    p = responses.calls[0].request.params
    assert p["method"] == "artist.getSimilar" and p["artist"] == "A Certain Ratio"
    assert p["limit"] == "50" and p["autocorrect"] == "1" and p["format"] == "json"


@responses.activate
def test_single_similar_object_is_a_list() -> None:
    responses.get(URL, json={"similarartists": {"artist": {"name": "Wire", "match": "1"}}})
    assert client().similar_artists("x") == [SimilarArtist("Wire", 1.0)]


@responses.activate
def test_artist_info() -> None:
    responses.get(URL, json={"artist": {"name": "Wire", "stats": {"listeners": "812345"}}})
    assert client().artist_info("Wire") == ArtistInfo("Wire", 812345)


@responses.activate
def test_artist_info_unknown_is_none() -> None:
    responses.get(URL, json={"error": 6, "message": "The artist you supplied could not be found"})
    assert client().artist_info("zzz") is None


@responses.activate
def test_top_tags() -> None:
    responses.get(
        URL,
        json={"toptags": {"tag": [{"name": "post-punk", "count": 100}, {"name": "uk", "count": "7"}]}},
    )
    assert client().artist_top_tags("Wire") == [Tag("post-punk", 100), Tag("uk", 7)]


@responses.activate
def test_unknown_artist_gives_empty() -> None:
    responses.get(URL, json={"error": 6, "message": "not found"})
    assert client().similar_artists("zzz") == []
    assert client().artist_top_tags("zzz") == []


@pytest.mark.parametrize("code", [8, 11, 16, 29, 10, 26])
@responses.activate
def test_transient_and_global_codes_are_unavailable(code: int) -> None:
    responses.get(URL, json={"error": code, "message": f"api_key={KEY}"})
    with pytest.raises(LastfmUnavailable) as exc:
        client().similar_artists("x")
    assert KEY not in str(exc.value)


@responses.activate
def test_other_code_is_definitive() -> None:
    responses.get(URL, json={"error": 13, "message": "Invalid method signature"})
    with pytest.raises(LastfmError):
        client().similar_artists("x")
    assert len(responses.calls) == 1


@responses.activate
def test_http_errors_without_json() -> None:
    responses.get(URL, status=503, body="down")
    with pytest.raises(LastfmUnavailable):
        client().similar_artists("x")
    responses.replace(responses.GET, URL, status=403, body="forbidden")
    with pytest.raises(LastfmError):
        client().similar_artists("x")


@responses.activate
def test_network_error_leaks_no_key(caplog: pytest.LogCaptureFixture) -> None:
    responses.get(URL, body=requests.ConnectionError(f"{URL}?api_key={KEY}"))
    with caplog.at_level(logging.DEBUG), pytest.raises(LastfmUnavailable) as exc:
        client().similar_artists("x")
    assert KEY not in str(exc.value)
    assert KEY not in caplog.text


def test_unavailable_is_not_a_lastfm_error() -> None:
    assert not issubclass(LastfmUnavailable, LastfmError)
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run : `uv run pytest tests_radio/test_lastfm.py -q` — attendu : ERREUR d'import.

- [ ] **Étape 3 : implémenter** — `radio/sources/lastfm.py` :

```python
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
```

- [ ] **Étape 4 : lancer, constater le succès** — suite complète + mypy + ruff, tout vert.

- [ ] **Étape 5 : commit** — `feat(v3): client Last.fm — similaires, infos, tags` (+ lignes de fin).

---

### Tâche 4 : Source Plex et verrou de section

**Files :**
- Create : `radio/sources/plex.py`, `tests_radio/test_plex.py`

**Interfaces :**
- Produces :
  - `PlexTrack(key: str, artist: str, title: str, album: str, duration_ms: int | None, plays: int)`, dataclass figée.
  - `LibraryGuardError(Exception)`.
  - `check_section(title: str, locations: Iterable[str], root: PurePosixPath) -> None`.
  - `PlexSource(url: str, token: str, section_title: str, root: PurePosixPath, server_factory: Callable[[str, str], Any] = PlexServer)`, avec `.tracks() -> list[PlexTrack]`.

Règles du verrou (fail-fast dans `__init__`, **sans aucun accès au système de fichiers**) :
1. Section « Musique second wave » refusée, sans tenir compte de la casse.
2. La section doit être de type `artist` (musique).
3. `root` doit être absolue, compter au moins 3 composants (`/media/plex` est accepté ; `/` et `/media` sont refusés) et ne contenir aucun `..`.
4. Chaque `location` de la section doit être absolue, sans `..`, et sous `root`.

Artiste d'un titre : `originalTitle` (artiste du morceau) s'il est renseigné, sinon
`grandparentTitle` (artiste de l'album).

- [ ] **Étape 1 : tests qui échouent** — `tests_radio/test_plex.py` :

```python
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
    return PlexSource("http://plex", "tok", section.title, ROOT, lambda url, tok: FakeServer(section))


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
```

- [ ] **Étape 2 : lancer, constater l'échec** — ERREUR d'import.

- [ ] **Étape 3 : implémenter** — `radio/sources/plex.py` :

```python
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
```

- [ ] **Étape 4 : lancer, constater le succès** — suite + mypy + ruff, tout vert.

- [ ] **Étape 5 : commit** — `feat(v3): source Plex en lecture seule, verrou de section` (+ lignes de fin).

---

### Tâche 5 : Synchronisation de la bibliothèque

**Files :**
- Create : `radio/library/__init__.py` (vide), `radio/library/sync.py`, `tests_radio/test_sync.py`

**Interfaces :**
- Consumes : `connect` (Tâche 1), `PlexTrack` (Tâche 4).
- Produces :
  - `EmptyLibraryError(Exception)`.
  - `SyncReport(n_tracks: int, n_added: int, n_changed: int, n_removed: int)`, dataclass figée.
  - `sync_library(conn: sqlite3.Connection, tracks: list[PlexTrack], now: str) -> SyncReport`.

Règles :
- **Plex fait autorité.** Un titre absent de Plex est retiré ; son rapprochement part en cascade.
- **Titre modifié** (artiste, titre ou durée différents) : la ligne est mise à jour et son
  rapprochement Deezer est supprimé, pour être refait.
- Changement d'album ou de nombre d'écoutes seul : mise à jour sans toucher au rapprochement.
- **Liste vide : `EmptyLibraryError`**, et rien n'est écrit. On n'efface jamais la bibliothèque
  parce que Plex n'a rien renvoyé.
- Une seule transaction.

- [ ] **Étape 1 : tests qui échouent** — `tests_radio/test_sync.py` :

```python
from pathlib import Path

import pytest

from radio.core.db import connect
from radio.library.sync import EmptyLibraryError, SyncReport, sync_library
from radio.sources.plex import PlexTrack


def t(key: str, title: str = "T", plays: int = 0, duration: int | None = 200000) -> PlexTrack:
    return PlexTrack(key, "Wire", title, "Pink Flag", duration, plays)


def test_first_sync_adds_everything(tmp_path: Path) -> None:
    conn = connect(tmp_path / "db")
    rep = sync_library(conn, [t("1"), t("2")], "2026-09-24T00:00:00Z")
    assert rep == SyncReport(n_tracks=2, n_added=2, n_changed=0, n_removed=0)
    assert conn.execute("SELECT COUNT(*) FROM library_tracks").fetchone()[0] == 2


def test_changed_track_drops_its_match(tmp_path: Path) -> None:
    conn = connect(tmp_path / "db")
    sync_library(conn, [t("1"), t("2")], "d1")
    conn.execute(
        "INSERT INTO deezer_matches VALUES ('1', 'matched', NULL, 10, 20, 'd1'),"
        " ('2', 'matched', NULL, 11, 20, 'd1')"
    )
    rep = sync_library(conn, [t("1", title="Autre"), t("2", plays=9)], "d2")
    assert rep == SyncReport(n_tracks=2, n_added=0, n_changed=1, n_removed=0)
    keys = {r[0] for r in conn.execute("SELECT plex_key FROM deezer_matches")}
    assert keys == {"2"}
    assert conn.execute("SELECT plays FROM library_tracks WHERE plex_key='2'").fetchone()[0] == 9


def test_removed_track_cascades(tmp_path: Path) -> None:
    conn = connect(tmp_path / "db")
    sync_library(conn, [t("1"), t("2")], "d1")
    conn.execute("INSERT INTO deezer_matches VALUES ('2', 'matched', NULL, 11, 20, 'd1')")
    rep = sync_library(conn, [t("1")], "d2")
    assert rep.n_removed == 1
    assert conn.execute("SELECT COUNT(*) FROM deezer_matches").fetchone()[0] == 0


def test_empty_library_refused_and_nothing_written(tmp_path: Path) -> None:
    conn = connect(tmp_path / "db")
    sync_library(conn, [t("1")], "d1")
    with pytest.raises(EmptyLibraryError):
        sync_library(conn, [], "d2")
    assert conn.execute("SELECT COUNT(*) FROM library_tracks").fetchone()[0] == 1
```

- [ ] **Étape 2 : lancer, constater l'échec** — ERREUR d'import.

- [ ] **Étape 3 : implémenter** — `radio/library/sync.py` :

```python
"""Synchronisation Plex → library_tracks. Plex fait autorité ; la base est un reflet."""

import sqlite3
from dataclasses import dataclass

from radio.sources.plex import PlexTrack


class EmptyLibraryError(Exception):
    """Plex n'a renvoyé aucun titre : on refuse d'effacer la bibliothèque connue."""


@dataclass(frozen=True)
class SyncReport:
    n_tracks: int
    n_added: int
    n_changed: int
    n_removed: int


def sync_library(conn: sqlite3.Connection, tracks: list[PlexTrack], now: str) -> SyncReport:
    if not tracks:
        raise EmptyLibraryError("Plex returned no track")
    known = {
        r["plex_key"]: (r["artist"], r["title"], r["duration_ms"])
        for r in conn.execute("SELECT plex_key, artist, title, duration_ms FROM library_tracks")
    }
    incoming = {t.key: t for t in tracks}
    added = [t for t in tracks if t.key not in known]
    changed = [
        t
        for t in tracks
        if t.key in known and known[t.key] != (t.artist, t.title, t.duration_ms)
    ]
    removed = [k for k in known if k not in incoming]
    with conn:
        conn.executemany(
            "DELETE FROM deezer_matches WHERE plex_key = ?", [(t.key,) for t in changed]
        )
        conn.executemany("DELETE FROM library_tracks WHERE plex_key = ?", [(k,) for k in removed])
        conn.executemany(
            """
            INSERT INTO library_tracks
                (plex_key, artist, title, album, duration_ms, plays, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (plex_key) DO UPDATE SET
                artist = excluded.artist, title = excluded.title, album = excluded.album,
                duration_ms = excluded.duration_ms, plays = excluded.plays,
                synced_at = excluded.synced_at
            """,
            [(t.key, t.artist, t.title, t.album, t.duration_ms, t.plays, now) for t in tracks],
        )
    return SyncReport(len(tracks), len(added), len(changed), len(removed))
```

- [ ] **Étape 4 : lancer, constater le succès** — suite + mypy + ruff, tout vert.

- [ ] **Étape 5 : commit** — `feat(v3): synchronisation de la bibliothèque Plex` (+ lignes de fin).

---

### Tâche 6 : Rapprochement Deezer strict

**Files :**
- Create : `radio/library/match.py`, `tests_radio/test_match.py`

**Interfaces :**
- Consumes :
  - `DeezerClient.search_tracks(query, limit)`, `DeezerTrack`, `DeezerError`, `DeezerUnavailable` (Tâche 2) ;
  - tables `library_tracks` et `deezer_matches` (Tâche 1).
- Produces :
  - `normalize(s: str) -> str` ;
  - `search_query(artist: str, title: str) -> str` ;
  - `pick_match(artist: str, title: str, duration_ms: int, results: list[DeezerTrack], tolerance_s: int) -> DeezerTrack | None` ;
  - `MatchReport(n_todo: int, n_matched: int, unmatched: dict[str, int], errors: list[str])`, dataclass figée ;
  - `match_library(conn: sqlite3.Connection, deezer: DeezerClient, tolerance_s: int, now: str, batch: int = 50) -> MatchReport` ;
  - `coverage(conn: sqlite3.Connection) -> tuple[int, int]`, qui renvoie (titres rapprochés, titres en bibliothèque).

Règles :
- **Normalisation.**
  1. Décomposer (NFKD), retirer les accents, passer en casse neutre (`casefold`) et remplacer `&` par ` and `.
  2. Retirer le contenu entre parenthèses ou crochets, le suffixe « ` - …` » et le segment « feat. / ft. / featuring … ».
  3. Remplacer la ponctuation par des espaces, réduire les espaces et retirer un « the » initial.
  4. Si le résultat est vide, repartir de l'étape 1 et sauter l'étape 2 : le titre était entièrement entre parenthèses.
- **Requête** : `artist:"…" track:"…"`, avec les guillemets doubles retirés des noms. Le titre
  est allégé des parenthèses, crochets et suffixe « - … », mais garde ses accents.
- **Correspondance exacte** : un résultat convient si les trois conditions sont vraies :
  - l'artiste normalisé est égal à l'artiste normalisé du morceau ;
  - le titre court normalisé, ou à défaut le titre complet normalisé, est égal au titre normalisé ;
  - l'écart de durée est au plus `tolerance_s` secondes.

  Parmi plusieurs résultats qui conviennent, l'ordre de choix est : extrait disponible, puis
  plus petit écart de durée, puis meilleur `rank`.
- **À traiter** : les titres de la bibliothèque sans ligne dans `deezer_matches`.
- **Raisons de non-rapprochement**, toutes écrites en base :
  - `no_duration` : Plex ne connaît pas la durée ;
  - `no_result` : la recherche est vide ;
  - `no_exact_match` : des résultats, mais aucun ne convient.
- **`DeezerError` sur un titre** : aucune ligne n'est écrite (le titre sera retenté à la
  passe suivante). Le cas est compté et nommé dans `errors` au format `"Artiste — Titre (DeezerError)"`.
- **`DeezerUnavailable`** : on valide ce qui est déjà fait, puis l'exception remonte.
- Validation en base tous les `batch` titres ; journal de progression tous les 100 titres.

- [ ] **Étape 1 : tests qui échouent** — `tests_radio/test_match.py` :

```python
import sqlite3
from pathlib import Path

import pytest

from radio.core.db import connect
from radio.library.match import (
    MatchReport,
    coverage,
    match_library,
    normalize,
    pick_match,
    search_query,
)
from radio.library.sync import sync_library
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable
from radio.sources.plex import PlexTrack


def dz(id: int, artist: str, title: str, dur: int, rank: int = 0, preview: bool = True) -> DeezerTrack:
    return DeezerTrack(id, title, title, dur, rank, 100 + id, artist, preview)


@pytest.mark.parametrize(
    ("raw", "norm"),
    [
        ("Love Like Blood - 2007 Remaster", "love like blood"),
        ("Mannequin (2006 Remastered Version)", "mannequin"),
        ("Café Del Mar [Energy 52 Mix]", "cafe del mar"),
        ("Sorry for Laughing feat. Someone", "sorry for laughing"),
        ("Simon & Garfunkel", "simon and garfunkel"),
        ("The Feelies", "feelies"),
        ("(Interlude)", "interlude"),
        ("  Hey,   Boy!  ", "hey boy"),
    ],
)
def test_normalize(raw: str, norm: str) -> None:
    assert normalize(raw) == norm


def test_search_query_strips_quotes_and_decorations() -> None:
    assert search_query('Say "Hi"', "Mannequin (Remastered) - Live") == (
        'artist:"Say Hi" track:"Mannequin"'
    )


def test_pick_exact_prefers_preview_then_duration_then_rank() -> None:
    results = [
        dz(1, "Wire", "Mannequin", 157, rank=10, preview=False),
        dz(2, "Wire", "Mannequin", 159, rank=5),
        dz(3, "Wire", "Mannequin", 158, rank=1),
        dz(4, "Wire", "Mannequin", 158, rank=9),
    ]
    got = pick_match("Wire", "Mannequin", 157500, results, tolerance_s=3)
    assert got is not None and got.id == 4


def test_pick_rejects_wrong_artist_title_or_duration() -> None:
    assert pick_match("Wire", "Mannequin", 157000, [dz(1, "Wired", "Mannequin", 157)], 3) is None
    assert pick_match("Wire", "Mannequin", 157000, [dz(1, "Wire", "Manequin", 157)], 3) is None
    assert pick_match("Wire", "Mannequin", 157000, [dz(1, "Wire", "Mannequin", 161)], 3) is None


class FakeDeezer:
    def __init__(self, answers: dict[str, list[DeezerTrack] | Exception]) -> None:
        self.answers = answers
        self.queries: list[str] = []

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        self.queries.append(query)
        a = self.answers[query]
        if isinstance(a, Exception):
            raise a
        return a


def setup(tmp_path: Path) -> sqlite3.Connection:
    conn = connect(tmp_path / "db")
    sync_library(
        conn,
        [
            PlexTrack("1", "Wire", "Mannequin", "Pink Flag", 157000, 3),
            PlexTrack("2", "Wire", "Unknown Song", "Pink Flag", 100000, 0),
            PlexTrack("3", "Wire", "No Dur", "Pink Flag", None, 0),
            PlexTrack("4", "Wire", "Fuzzy", "Pink Flag", 120000, 0),
            PlexTrack("5", "Wire", "Broken", "Pink Flag", 120000, 0),
        ],
        "d0",
    )
    return conn


def test_match_library_records_every_outcome(tmp_path: Path) -> None:
    conn = setup(tmp_path)
    fake = FakeDeezer(
        {
            search_query("Wire", "Mannequin"): [dz(7, "Wire", "Mannequin", 157)],
            search_query("Wire", "Unknown Song"): [],
            search_query("Wire", "Fuzzy"): [dz(8, "Wire", "Fuzzy Remix", 120)],
            search_query("Wire", "Broken"): DeezerError("code 501"),
        }
    )
    rep = match_library(conn, fake, tolerance_s=3, now="d1")  # type: ignore[arg-type]
    assert rep == MatchReport(
        n_todo=5,
        n_matched=1,
        unmatched={"no_duration": 1, "no_result": 1, "no_exact_match": 1},
        errors=["Wire — Broken (DeezerError)"],
    )
    row = conn.execute("SELECT * FROM deezer_matches WHERE plex_key='1'").fetchone()
    assert (row["status"], row["deezer_track_id"], row["deezer_artist_id"]) == ("matched", 7, 107)
    assert conn.execute("SELECT COUNT(*) FROM deezer_matches").fetchone()[0] == 4
    assert coverage(conn) == (1, 5)
    # Titre sans durée : aucune requête Deezer.
    assert search_query("Wire", "No Dur") not in fake.queries


def test_second_pass_only_retries_errors(tmp_path: Path) -> None:
    conn = setup(tmp_path)
    answers: dict[str, list[DeezerTrack] | Exception] = {
        search_query("Wire", "Mannequin"): [dz(7, "Wire", "Mannequin", 157)],
        search_query("Wire", "Unknown Song"): [],
        search_query("Wire", "Fuzzy"): [],
        search_query("Wire", "Broken"): DeezerError("code 501"),
    }
    match_library(conn, FakeDeezer(answers), 3, "d1")  # type: ignore[arg-type]
    fake2 = FakeDeezer({search_query("Wire", "Broken"): [dz(9, "Wire", "Broken", 120)]})
    rep = match_library(conn, fake2, 3, "d2")  # type: ignore[arg-type]
    assert rep.n_todo == 1 and rep.n_matched == 1
    assert fake2.queries == [search_query("Wire", "Broken")]


def test_unavailable_commits_done_work_then_raises(tmp_path: Path) -> None:
    conn = setup(tmp_path)
    fake = FakeDeezer(
        {
            search_query("Wire", "Mannequin"): [dz(7, "Wire", "Mannequin", 157)],
            search_query("Wire", "Unknown Song"): DeezerUnavailable("code 4"),
        }
    )
    with pytest.raises(DeezerUnavailable):
        match_library(conn, fake, 3, "d1", batch=50)  # type: ignore[arg-type]
    assert conn.execute(
        "SELECT status FROM deezer_matches WHERE plex_key='1'"
    ).fetchone()[0] == "matched"
```

L'ordre de traitement est celui de `plex_key` croissant (`ORDER BY plex_key`), ce qui rend les
tests déterministes.

- [ ] **Étape 2 : lancer, constater l'échec** — ERREUR d'import.

- [ ] **Étape 3 : implémenter** — `radio/library/match.py` :

```python
"""Rapprochement strict bibliothèque → Deezer : jamais deviné, toujours compté."""

import logging
import re
import sqlite3
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from radio.sources.deezer import DeezerClient, DeezerError, DeezerTrack

logger = logging.getLogger(__name__)

_BRACKETS = re.compile(r"\([^)]*\)|\[[^\]]*\]")
_DASH_SUFFIX = re.compile(r"\s+-\s.*$")
_FEAT = re.compile(r"\s(?:feat\.?|ft\.?|featuring)\s.*$")
_PUNCT = re.compile(r"[^\w\s]|_")
_SPACES = re.compile(r"\s+")


def _base(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.casefold().replace("&", " and ")


def _finish(s: str) -> str:
    s = _SPACES.sub(" ", _PUNCT.sub(" ", s)).strip()
    return s[4:] if s.startswith("the ") else s


def normalize(s: str) -> str:
    base = _base(s)
    stripped = _FEAT.sub(" ", _DASH_SUFFIX.sub(" ", _BRACKETS.sub(" ", base)))
    return _finish(stripped) or _finish(base)


def search_query(artist: str, title: str) -> str:
    clean_title = _DASH_SUFFIX.sub("", _BRACKETS.sub(" ", title))
    a = _SPACES.sub(" ", artist.replace('"', "")).strip()
    t = _SPACES.sub(" ", clean_title.replace('"', "")).strip()
    return f'artist:"{a}" track:"{t}"'


def pick_match(
    artist: str, title: str, duration_ms: int, results: list[DeezerTrack], tolerance_s: int
) -> DeezerTrack | None:
    na, nt = normalize(artist), normalize(title)
    ok = [
        r
        for r in results
        if normalize(r.artist_name) == na
        and nt in (normalize(r.title_short), normalize(r.title))
        and abs(r.duration_s * 1000 - duration_ms) <= tolerance_s * 1000
    ]
    if not ok:
        return None
    return min(
        ok, key=lambda r: (not r.has_preview, abs(r.duration_s * 1000 - duration_ms), -r.rank)
    )


@dataclass(frozen=True)
class MatchReport:
    n_todo: int
    n_matched: int
    unmatched: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def match_library(
    conn: sqlite3.Connection, deezer: DeezerClient, tolerance_s: int, now: str, batch: int = 50
) -> MatchReport:
    todo = conn.execute(
        """
        SELECT t.plex_key, t.artist, t.title, t.duration_ms
        FROM library_tracks t LEFT JOIN deezer_matches m USING (plex_key)
        WHERE m.plex_key IS NULL ORDER BY t.plex_key
        """
    ).fetchall()
    matched = 0
    unmatched: Counter[str] = Counter()
    errors: list[str] = []
    rows: list[tuple[object, ...]] = []

    def flush() -> None:
        with conn:
            conn.executemany("INSERT INTO deezer_matches VALUES (?, ?, ?, ?, ?, ?)", rows)
        rows.clear()

    try:
        for i, r in enumerate(todo, 1):
            key, artist, title, dur = r["plex_key"], r["artist"], r["title"], r["duration_ms"]
            if dur is None:
                rows.append((key, "unmatched", "no_duration", None, None, now))
                unmatched["no_duration"] += 1
            else:
                try:
                    results = deezer.search_tracks(search_query(artist, title))
                except DeezerError as e:
                    errors.append(f"{artist} — {title} ({type(e).__name__})")
                    continue
                best = pick_match(artist, title, dur, results, tolerance_s)
                if best is not None:
                    rows.append((key, "matched", None, best.id, best.artist_id, now))
                    matched += 1
                else:
                    reason = "no_exact_match" if results else "no_result"
                    rows.append((key, "unmatched", reason, None, None, now))
                    unmatched[reason] += 1
            if len(rows) >= batch:
                flush()
            if i % 100 == 0:
                logger.info("match: %d/%d tracks processed", i, len(todo))
    finally:
        flush()
    return MatchReport(len(todo), matched, dict(unmatched), errors)


def coverage(conn: sqlite3.Connection) -> tuple[int, int]:
    matched = conn.execute(
        "SELECT COUNT(*) FROM deezer_matches WHERE status = 'matched'"
    ).fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM library_tracks").fetchone()[0]
    return int(matched), int(total)
```

Note : le `continue` dans le `except DeezerError` saute aussi la validation par lot de ce
tour. C'est voulu : le lot sera validé au tour suivant ou dans le `finally`.

- [ ] **Étape 4 : lancer, constater le succès** — suite + mypy + ruff, tout vert.

- [ ] **Étape 5 : commit** — `feat(v3): rapprochement Deezer strict de la bibliothèque` (+ lignes de fin).

---

### Tâche 7 : Commande `radio library-sync`

**Files :**
- Create : `radio/cli.py`, `tests_radio/test_cli.py`

**Interfaces :**
- Consumes : tous les modules précédents.
- Produces :
  - l'application typer `app` (point d'entrée `radio`) avec la commande `library-sync` ;
  - les fabriques `_settings()`, `_plex(settings)` et `_deezer()`, remplaçables par monkeypatch dans les tests.

Comportement :
1. Charger `Settings()` et `load_editorial(settings.config_dir / "editorial.toml")`.
2. **Configuration manquante** (`PLEX_TOKEN` ou `PLEX_MUSIC_SECTION` absent) : message en
   français sur stderr, code de sortie **2**. `LibraryGuardError` : message, code **2**.
3. Plex (`PlexSource`) → `sync_library` → `match_library` → affichage.
4. **Indisponibilités** : `EmptyLibraryError`, `DeezerUnavailable` et toute erreur Plex de
   connexion (`requests.RequestException`, `plexapi.exceptions.PlexApiException`) donnent un
   message et le code **1**. Le message ne cite que le type de l'exception, jamais son texte :
   le jeton Plex pourrait y figurer.
5. Base : `settings.data_dir / "radio.db"`. Horodatage : `datetime.now(UTC).isoformat()`.
6. Journalisation : `logging.basicConfig(level=INFO, stream=stderr)` dans la commande.

Sortie attendue (les nombres suivent la convention française, avec espace insécable fine
` ` comme séparateur de milliers et virgule décimale) :

```
Bibliothèque Plex : 3 424 titres (12 ajoutés, 3 modifiés, 0 retirés)
Rapprochement Deezer : 150 à traiter → 120 trouvés, 28 non trouvés (sans durée 1, sans résultat 10, sans correspondance exacte 17), 2 en erreur
  erreur : Wire — Broken (DeezerError)
  erreur : Wire — Other (DeezerError)
Couverture : 2 900 / 3 424 titres rapprochés (84,7 %)
```

Les détails « (sans durée …) » ne listent que les raisons présentes, dans l'ordre sans durée,
sans résultat, sans correspondance exacte. S'il n'y a aucun non-trouvé, la parenthèse est
omise.

- [ ] **Étape 1 : tests qui échouent** — `tests_radio/test_cli.py` :

```python
from pathlib import Path

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.sources.deezer import DeezerTrack, DeezerUnavailable
from radio.sources.plex import PlexTrack

runner = CliRunner()


class FakePlex:
    def __init__(self, tracks: list[PlexTrack]) -> None:
        self._tracks = tracks

    def tracks(self) -> list[PlexTrack]:
        return self._tracks


class FakeDeezer:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        if self.fail:
            raise DeezerUnavailable("code 4")
        if "Mannequin" in query:
            return [DeezerTrack(7, "Mannequin", "Mannequin", 157, 1, 70, "Wire", True)]
        return []


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text("[library]\nduration_tolerance_s = 3\n")
    settings = Settings(
        _env_file=None,
        plex_token="tok",
        plex_music_section="Musique",
        RADIO_DATA_DIR=tmp_path / "data",
        RADIO_CONFIG_DIR=cfg,
    )
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    return tmp_path


def test_library_sync_end_to_end(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    tracks = [
        PlexTrack("1", "Wire", "Mannequin", "Pink Flag", 157000, 2),
        PlexTrack("2", "Wire", "Nope", "Pink Flag", 100000, 0),
    ]
    monkeypatch.setattr(cli, "_plex", lambda s: FakePlex(tracks))
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer())
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 0, res.output
    assert "Bibliothèque Plex : 2 titres (2 ajoutés, 0 modifiés, 0 retirés)" in res.stdout
    assert (
        "Rapprochement Deezer : 2 à traiter → 1 trouvés, 1 non trouvés (sans résultat 1), 0 en erreur"
        in res.stdout
    )
    assert "Couverture : 1 / 2 titres rapprochés (50,0 %)" in res.stdout
    assert (env / "data" / "radio.db").exists()


def test_missing_config_exits_2(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        cli, "_settings", lambda: Settings(_env_file=None, RADIO_CONFIG_DIR=env / "config")
    )
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 2
    assert "PLEX_TOKEN" in res.output


def test_deezer_unavailable_exits_1(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        cli, "_plex", lambda s: FakePlex([PlexTrack("1", "Wire", "Mannequin", "P", 157000, 0)])
    )
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer(fail=True))
    res = runner.invoke(cli.app, ["library-sync"])
    assert res.exit_code == 1
    assert "Deezer indisponible" in res.output


def test_thousands_are_formatted_in_french() -> None:
    assert cli._n(3424) == "3 424"
    assert cli._pct(2900, 3424) == "84,7 %"
```

- [ ] **Étape 2 : lancer, constater l'échec** — ERREUR d'import.

- [ ] **Étape 3 : implémenter** — `radio/cli.py` :

```python
"""Commandes AubeSonore v3."""

import logging
import sys
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import NoReturn

import requests
import typer
from plexapi.exceptions import PlexApiException

from radio.core.config import Settings, load_editorial
from radio.core.db import connect
from radio.library.match import MatchReport, coverage, match_library
from radio.library.sync import EmptyLibraryError, sync_library
from radio.sources.deezer import DeezerClient, DeezerUnavailable
from radio.sources.plex import LibraryGuardError, PlexSource

app = typer.Typer(no_args_is_help=True, add_completion=False)

_REASONS = (
    ("no_duration", "sans durée"),
    ("no_result", "sans résultat"),
    ("no_exact_match", "sans correspondance exacte"),
)


def _settings() -> Settings:
    return Settings()


def _plex(settings: Settings) -> PlexSource:
    if settings.plex_token is None or not settings.plex_music_section:
        _fail("PLEX_TOKEN et PLEX_MUSIC_SECTION doivent être définis dans .env", 2)
    return PlexSource(
        settings.plex_url,
        settings.plex_token.get_secret_value(),
        settings.plex_music_section,
        PurePosixPath(settings.plex_music_root),
    )


def _deezer() -> DeezerClient:
    return DeezerClient()


def _fail(message: str, code: int) -> NoReturn:
    typer.echo(message, err=True)
    raise typer.Exit(code)


def _n(x: int) -> str:
    return f"{x:,}".replace(",", " ")


def _pct(a: int, b: int) -> str:
    return f"{(100 * a / b) if b else 0:.1f} %".replace(".", ",")


def _match_line(rep: MatchReport) -> str:
    n_un = sum(rep.unmatched.values())
    details = ", ".join(
        f"{label} {rep.unmatched[k]}" for k, label in _REASONS if rep.unmatched.get(k)
    )
    un = f"{_n(n_un)} non trouvés" + (f" ({details})" if details else "")
    return (
        f"Rapprochement Deezer : {_n(rep.n_todo)} à traiter → {_n(rep.n_matched)} trouvés, "
        f"{un}, {_n(len(rep.errors))} en erreur"
    )


@app.callback()
def main() -> None:
    """AubeSonore — goût et découverte."""


@app.command("library-sync")
def library_sync() -> None:
    """Lit la bibliothèque Plex et la rapproche de Deezer."""
    logging.basicConfig(
        level=logging.INFO, stream=sys.stderr, format="%(asctime)s %(levelname)s %(message)s"
    )
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    now = datetime.now(UTC).isoformat()
    try:
        plex = _plex(settings)
        tracks = plex.tracks()
    except LibraryGuardError as e:
        _fail(f"Bibliothèque refusée : {e}", 2)
    except (requests.RequestException, PlexApiException) as e:
        _fail(f"Plex injoignable ({type(e).__name__})", 1)
    conn = connect(settings.data_dir / "radio.db")
    try:
        sync = sync_library(conn, tracks, now)
        typer.echo(
            f"Bibliothèque Plex : {_n(sync.n_tracks)} titres ({_n(sync.n_added)} ajoutés, "
            f"{_n(sync.n_changed)} modifiés, {_n(sync.n_removed)} retirés)"
        )
        rep = match_library(conn, _deezer(), editorial.library.duration_tolerance_s, now)
        done, total = coverage(conn)
    except EmptyLibraryError:
        _fail("Plex n'a renvoyé aucun titre : rien n'a été modifié", 1)
    except DeezerUnavailable as e:
        _fail(f"Deezer indisponible ({e}) : le travail fait est gardé, relancer plus tard", 1)
    finally:
        conn.close()
    typer.echo(_match_line(rep))
    for err in rep.errors:
        typer.echo(f"  erreur : {err}")
    typer.echo(f"Couverture : {_n(done)} / {_n(total)} titres rapprochés ({_pct(done, total)})")
```

Notes pour l'implémenteur :
- `_fail` lève toujours (`NoReturn`) : mypy sait donc que `tracks`, `rep`, `done` et `total`
  sont liés après les blocs `try`, et que `plex_token` n'est plus `None` dans `_plex`.
- Si mypy strict refuse plexapi faute de marqueur `py.typed`, ajouter dans `pyproject.toml`
  un `[[tool.mypy.overrides]]` `module = ["plexapi.*"]`, `ignore_missing_imports = true`.
  Ne rien ajouter d'autre.
- `DeezerUnavailable(e)` porte un message sûr (code ou HTTP), sans URL : il peut être affiché.
- Si le test de configuration manquante échoue parce que le `.env` réel est lu, vérifier que
  `_settings` est bien remplacé : les tests ne lisent jamais le vrai `.env`.

- [ ] **Étape 4 : lancer, constater le succès** — suite + mypy + ruff, tout vert.

- [ ] **Étape 5 : commit** — `feat(v3): commande radio library-sync` (+ lignes de fin).

---

### Tâche 8 : Essai réel (contrôleur)

Hors sous-agent : appels réels.

- [ ] **Étape 1 :** `cd /home/victormoi/radio/pipeline-v3 && nice -n 10 uv run radio library-sync > data/library-sync-1.log 2>&1`, lancée en arrière-plan.
- [ ] **Étape 2 :** lire le rapport.
  - Couverture attendue : du même ordre que le rapprochement précédent (83 % sur 3 424 titres tirés). Sous 75 %, examiner un échantillon de `no_exact_match` pour voir si la normalisation est en cause, et le dire à Victor avant de toucher aux règles.
  - Vérifier qu'aucun secret n'apparaît dans le journal : `grep -c -i "token\|api_key" data/library-sync-1.log` doit renvoyer 0.
- [ ] **Étape 3 :** relance immédiate : `0 à traiter` attendu, sauf titres en erreur.
- [ ] **Étape 4 :** compte rendu à Victor en français : nombre de titres, couverture, raisons de non-rapprochement.
