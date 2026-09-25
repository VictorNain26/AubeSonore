# Plan v3-2 — Découverte et signaux — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** découvrir des titres candidats à partir de graines tirées de la bibliothèque, importer les
négatifs de démarrage, et mesurer les quatre signaux (son, popularité, culture, proximité) de la
même façon pour la bibliothèque, les candidats et les négatifs. Commandes `radio discover`,
`radio negatives-sync` et `radio signals`.

**Architecture :** l'identité d'un artiste est son id Deezer ; celle d'un titre, son id Deezer.
Une table `tracks` réunit tous les titres mesurés, avec leur origine (`library`, `candidate`,
`negative`). Les données brutes (Deezer, Last.fm, empreinte EffNet) sont stockées une fois ; les
signaux se calculent **à la lecture** (`load_signals`), parce que la proximité dépend de la
bibliothèque du moment. L'empreinte est calculée sur l'extrait Deezer de 30 s, pour tous les titres.

**Tech Stack :** v3-1 (Python 3.12, uv, typer, pydantic 2, requests, stamina, pyrate-limiter,
sqlite3 STRICT) + numpy + essentia-tensorflow `2.1b6.dev1389` (Discogs-EffNet bs64).

**Spec :** `docs/superpowers/specs/2026-09-24-gout-decouverte-v3-design.md` (§4, §5.1 à §5.3, §8, §9).
Recherche EffNet : `docs/superpowers/research/2026-09-23-essentia-effnet.md`.

## Global Constraints

- Plex en **lecture seule**. Jamais de lecture, liste ou référence du disque « MUSIC MAËL » (`/media/musique`). Jamais la section Plex « Musique second wave ».
- Aucun secret dans les journaux, messages d'exception, tests ou commits : jeton Plex, clé Last.fm (paramètre de requête), **URL d'extraits Deezer signées** (jamais stockées en base, jamais journalisées, jamais dans un message d'exception). Les messages d'exception ne contiennent jamais d'URL ni le `str()` d'une exception requests : seulement le nom du type, un code HTTP ou un code d'erreur d'API.
- Un repli silencieux est pire qu'une panne : tout ce qui est sauté est compté et nommé dans le rapport.
- Un signal manquant est une valeur absente explicite (`NaN`), pas une erreur ; sa fréquence figure au rapport (spec §5.3).
- Signaux mesurés **de la même façon** pour la bibliothèque, les candidats et les négatifs (spec §5.3). La proximité se calcule en « artiste retiré » : l'artiste lui-même ne compte jamais.
- Un voisin n'est jamais un artiste de la bibliothèque (exclusion par id Deezer ET par nom normalisé de tous les artistes Plex, rapprochés ou non).
- Rapprochement Deezer : la syntaxe avancée `artist:"…"` est cassée côté Deezer (constaté le 2026-09-25) ; ne jamais s'en servir.
- Deezer : quota visé 40 requêtes / 5 s (limiteur du client). Une seule instance `DeezerClient` par commande.
- Pas d'usine à gaz : pas de validation défensive des données qu'on écrit nous-mêmes, pas de compteurs « au cas où ».
- Migrations : un script de migration ne contient **ni BEGIN ni COMMIT** (`_migrate` l'enveloppe).
- Documentation, commentaires et commits en français. Messages de log en anglais. Rapports CLI en français, milliers séparés par U+202F (`_n`), décimales à virgule.
- ruff : pas de tiret demi-cadratin littéral dans le source (RUF001/003) : écrire `–`.
- Les implémenteurs ne touchent ni `.env`, ni `data/`, ni `models/` (lecture du modèle seule permise), n'appellent aucune API réelle et ne lancent aucune commande `radio` contre les vrais services.
- Ne jamais utiliser `git stash`. Ne jamais toucher `~/radio/pipeline` (production).
- Vérifications avant chaque commit : `uv run pytest -q`, `uv run mypy`, `uv run ruff check .`, `uv run ruff format --check .`.
- Fin de chaque message de commit :
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY
  ```

## Faits vérifiés au moment du plan (2026-09-25)

- Deezer `GET /artist/{id}` : `id`, `name`, `nb_fan`. Id inconnu : `{"error": {"code": 800}}`.
- Deezer `GET /artist/{id}/related` : `data` = artistes (`id`, `name`, `nb_fan`), **20 au plus**, `limit` sans effet.
- Deezer `GET /artist/{id}/top?limit=10` : `data` = titres (`id`, `title`, `title_short`, `duration`, `rank`, `preview`, `artist{id,name}`, `contributors`).
- Deezer `GET /track/{id}` : mêmes champs + `preview` (URL signée `cdnt-preview.dzcdn.net`). Id inconnu : code 800.
- Extrait Deezer : MP3 de 30 s (≈ 480 Ko). Chaîne EffNet mesurée sur 3 extraits réels : 29 patches, ≈ 2,8 s CPU par extrait sur un fil, aucun avertissement Essentia avec un `MonoLoader` réutilisé.
- `essentia-tensorflow==2.1b6.dev1389` est la seule roue cp312 manylinux x86_64 ; elle tire numpy 2.x.
- Modèle officiel `discogs-effnet-bs64-1.pb` : 18 366 619 octets, sha256 `3ed9af50d5367c0b9c795b294b00e7599e4943244f4cbd376869f3bfc87721b1`.
- Bibliothèque réelle : 15 890 titres Plex, 1 687 noms d'artistes Plex, 766 artistes Deezer rapprochés, 11 839 titres Deezer distincts.

---

## Structure des fichiers

```
config/editorial.toml                  # + [discover], [signals] (Task 1)
radio/core/migrations/002_discovery.sql  # artistes, titres, mesures, passes, candidats, négatifs (Task 1)
radio/library/weights.py               # play_weight (Task 1)
radio/sources/deezer.py                # + artist, related, top, track, download_preview (Task 2)
radio/library/dedupe.py                # clé de dédoublonnage des titres (Task 3)
radio/library/artists.py               # artistes de la bibliothèque, inscription des titres (Task 3)
radio/discover/seeds.py                # tirage des graines, passes (Task 4)
radio/discover/neighbours.py           # voisins Deezer ∩ Last.fm (Task 5)
radio/discover/candidates.py           # filtre et insertion des titres (Task 5)
radio/discover/run.py                  # passe de découverte (Task 6)
radio/discover/negatives.py            # négatifs de démarrage (Task 7)
radio/signals/artists.py               # lecture des données brutes d'artistes (Task 8)
radio/signals/audio.py                 # EffnetEmbedder (Task 9)
radio/signals/measure.py               # rang + empreinte de chaque titre (Task 9)
radio/signals/popularity.py, culture.py, proximity.py, table.py   # signaux à la lecture (Task 10)
radio/cli.py                           # discover (T6), negatives-sync (T7), signals (T11)
tests_radio/factories.py               # mini-bibliothèque partagée (Task 3)
```

---

### Task 1: Socle v3-2 — schéma, réglages, poids d'écoute

**Files:**
- Create: `radio/core/migrations/002_discovery.sql`
- Create: `radio/library/weights.py`
- Modify: `radio/core/config.py` (ajout `DiscoverConfig`, `SignalsConfig`, champs d'`Editorial`)
- Modify: `radio/core/db.py` (commentaire de la règle « ni BEGIN ni COMMIT »)
- Modify: `config/editorial.toml`
- Modify: `pyproject.toml` (dépendance `numpy>=2.0`), `uv.lock` (via `uv lock`)
- Modify: `tests_radio/test_core.py:15,24` (`user_version` attendu : 2)
- Test: `tests_radio/test_schema_v3_2.py`, `tests_radio/test_weights.py`

**Interfaces:**
- Consumes: `connect(path)` et `_migrate` (v3-1), `Editorial`, `load_editorial`, `REPO_ROOT`.
- Produces:
  - tables `artists`, `tracks`, `track_measures`, `discover_runs`, `run_seeds`, `candidates`, `negative_artists` (schéma ci-dessous, colonnes dans cet ordre) ;
  - `DiscoverConfig(seeds_per_run=15, seed_cooldown_days=30, tracks_per_neighbour=10, lastfm_similar_limit=100)`, `SignalsConfig(culture_vocabulary=200)`, `Editorial.discover`, `Editorial.signals` ;
  - `radio.library.weights.play_weight(plays: int) -> float`, `WEIGHT_CAP = 4.0`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_schema_v3_2.py` :

```python
import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import REPO_ROOT, load_editorial
from radio.core.db import connect


def db(tmp_path: Path) -> sqlite3.Connection:
    conn = connect(tmp_path / "radio.db")
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (1, 'Wire')")
    return conn


def add_track(conn: sqlite3.Connection, tid: int, origin: str = "candidate") -> None:
    conn.execute(
        "INSERT INTO tracks VALUES (?, 1, 'Mannequin', ?, 'wire|mannequin', 'd')", (tid, origin)
    )


def test_migration_002_creates_tables(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 2
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {
        "artists",
        "tracks",
        "track_measures",
        "discover_runs",
        "run_seeds",
        "candidates",
        "negative_artists",
    } <= names


def test_dedupe_key_unique_except_library(tmp_path: Path) -> None:
    conn = db(tmp_path)
    add_track(conn, 10)
    with pytest.raises(sqlite3.IntegrityError):
        add_track(conn, 11)
    add_track(conn, 12, origin="negative")
    add_track(conn, 13, origin="library")
    add_track(conn, 14, origin="library")


def test_measure_rows_are_consistent(tmp_path: Path) -> None:
    conn = db(tmp_path)
    add_track(conn, 10)
    bad: list[tuple[object, ...]] = [
        (10, "ok", 5, None),
        (10, "ok", 5, b"\0" * 16),
        (10, "no_preview", 5, b"\0" * 5120),
        (10, "gone", 5, None),
        (10, "no_preview", None, None),
    ]
    for row in bad:
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO track_measures VALUES (?, ?, ?, ?, 'm', 'd')", row)
    conn.execute(
        "INSERT INTO track_measures VALUES (10, 'ok', 5, ?, 'm', 'd')", (b"\0" * 5120,)
    )


def test_artist_rows_are_consistent(tmp_path: Path) -> None:
    conn = db(tmp_path)
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("UPDATE artists SET fetched_at = 'd' WHERE deezer_artist_id = 1")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "UPDATE artists SET fetched_at = 'd', nb_fan = 3, deezer_related = '[]',"
            " lastfm_found = 1 WHERE deezer_artist_id = 1"
        )
    conn.execute(
        "UPDATE artists SET fetched_at = 'd', nb_fan = 3, deezer_related = '[]',"
        " lastfm_found = 0 WHERE deezer_artist_id = 1"
    )


def test_one_running_run_at_most(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    conn.execute("INSERT INTO discover_runs (started_at, status) VALUES ('d', 'running')")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO discover_runs (started_at, status) VALUES ('d', 'running')")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO discover_runs (started_at, status) VALUES ('d', 'done')")


def test_editorial_v3_2_sections(tmp_path: Path) -> None:
    ed = load_editorial(REPO_ROOT / "config" / "editorial.toml")
    d = ed.discover
    assert (d.seeds_per_run, d.seed_cooldown_days) == (15, 30)
    assert (d.tracks_per_neighbour, d.lastfm_similar_limit) == (10, 100)
    assert ed.signals.culture_vocabulary == 200
    p = tmp_path / "e.toml"
    p.write_text("[discover]\nseeds_per_run = 0\n")
    with pytest.raises(ValidationError):
        load_editorial(p)
```

`tests_radio/test_weights.py` :

```python
import math

import pytest

from radio.library.weights import WEIGHT_CAP, play_weight


def test_play_weight() -> None:
    assert play_weight(0) == 1.0
    assert play_weight(1) == pytest.approx(1 + math.log(2))
    assert play_weight(19) == pytest.approx(1 + math.log(20))
    assert play_weight(10_000) == WEIGHT_CAP == 4.0
    with pytest.raises(ValueError):
        play_weight(-1)
```

Dans `tests_radio/test_core.py`, lignes 15 et 24 : remplacer `== 1` par `== 2` (deux migrations
livrées). La ligne 48 (`test_failed_migration_leaves_nothing_behind`, migrations de test) reste à 1.

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_schema_v3_2.py tests_radio/test_weights.py tests_radio/test_core.py -q`
Expected: FAIL (`no such table: artists`, `ModuleNotFoundError: radio.library.weights`, `user_version` 1 ≠ 2).

- [ ] **Step 3: Implémenter**

`radio/core/migrations/002_discovery.sql` :

```sql
-- Artistes Deezer mesurés : bibliothèque, voisins, négatifs. Données brutes lues une fois ;
-- les signaux se calculent à la lecture (radio/signals/table.py).
CREATE TABLE artists (
    deezer_artist_id INTEGER PRIMARY KEY,
    name             TEXT NOT NULL,
    fetched_at       TEXT,
    nb_fan           INTEGER CHECK (nb_fan >= 0),
    deezer_related   TEXT,
    lastfm_found     INTEGER CHECK (lastfm_found IN (0, 1)),
    lastfm_listeners INTEGER CHECK (lastfm_listeners >= 0),
    lastfm_tags      TEXT,
    lastfm_similar   TEXT,
    CHECK ((fetched_at IS NULL) = (nb_fan IS NULL)),
    CHECK ((fetched_at IS NULL) = (deezer_related IS NULL)),
    CHECK ((fetched_at IS NULL) = (lastfm_found IS NULL)),
    CHECK ((lastfm_found = 1) = (lastfm_tags IS NOT NULL AND lastfm_similar IS NOT NULL)),
    CHECK (lastfm_found = 1 OR lastfm_listeners IS NULL)
) STRICT;

-- Tous les titres mesurés, quelle que soit leur origine. La bibliothèque peut contenir deux
-- versions d'un même titre ; candidats et négatifs sont dédoublonnés dès l'entrée (spec §5.2).
CREATE TABLE tracks (
    deezer_track_id  INTEGER PRIMARY KEY,
    deezer_artist_id INTEGER NOT NULL REFERENCES artists (deezer_artist_id),
    title            TEXT NOT NULL,
    origin           TEXT NOT NULL CHECK (origin IN ('library', 'candidate', 'negative')),
    dedupe_key       TEXT NOT NULL,
    added_at         TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX tracks_dedupe ON tracks (origin, dedupe_key) WHERE origin != 'library';

-- Rang Deezer et empreinte EffNet (1 280 float32 = 5 120 octets) de l'extrait de 30 s.
CREATE TABLE track_measures (
    deezer_track_id INTEGER PRIMARY KEY REFERENCES tracks (deezer_track_id) ON DELETE CASCADE,
    status          TEXT NOT NULL
                    CHECK (status IN ('ok', 'no_preview', 'audio_failed', 'gone')),
    rank            INTEGER CHECK (rank >= 0),
    embedding       BLOB,
    model           TEXT NOT NULL,
    measured_at     TEXT NOT NULL,
    CHECK ((status = 'gone') = (rank IS NULL)),
    CHECK ((status = 'ok') = (embedding IS NOT NULL)),
    CHECK (embedding IS NULL OR length(embedding) = 5120)
) STRICT;

CREATE TABLE discover_runs (
    run_id      INTEGER PRIMARY KEY,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    status      TEXT NOT NULL CHECK (status IN ('running', 'done')),
    CHECK ((status = 'done') = (finished_at IS NOT NULL))
) STRICT;

-- Au plus une passe en cours : une passe interrompue reprend avec les mêmes graines.
CREATE UNIQUE INDEX discover_one_running ON discover_runs (status) WHERE status = 'running';

CREATE TABLE run_seeds (
    run_id           INTEGER NOT NULL REFERENCES discover_runs (run_id),
    deezer_artist_id INTEGER NOT NULL,
    PRIMARY KEY (run_id, deezer_artist_id)
) STRICT;

CREATE TABLE candidates (
    deezer_track_id     INTEGER PRIMARY KEY
                        REFERENCES tracks (deezer_track_id) ON DELETE CASCADE,
    run_id              INTEGER NOT NULL REFERENCES discover_runs (run_id),
    seed_artist_id      INTEGER NOT NULL,
    neighbour_artist_id INTEGER NOT NULL
) STRICT;

CREATE TABLE negative_artists (
    deezer_artist_id INTEGER PRIMARY KEY REFERENCES artists (deezer_artist_id),
    category         TEXT NOT NULL
                     CHECK (category IN ('commercial_fr', 'commercial_intl', 'metal', 'hard_techno'))
) STRICT;
```

`radio/library/weights.py` :

```python
"""Poids tirés des écoutes Plex (spec §5.1) : 1 + log(1 + écoutes), plafonné à 4.

Tout artiste ou titre garde un poids d'au moins 1 : les coins peu écoutés comptent aussi.
"""

import math

WEIGHT_CAP = 4.0


def play_weight(plays: int) -> float:
    if plays < 0:
        raise ValueError("plays must be >= 0")
    return min(1.0 + math.log1p(plays), WEIGHT_CAP)
```

Dans `radio/core/config.py`, ajouter après `LibraryConfig` :

```python
class DiscoverConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    seeds_per_run: int = Field(default=15, ge=1, le=200)
    seed_cooldown_days: int = Field(default=30, ge=0, le=365)
    tracks_per_neighbour: int = Field(default=10, ge=1, le=100)
    lastfm_similar_limit: int = Field(default=100, ge=1, le=250)


class SignalsConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    culture_vocabulary: int = Field(default=200, ge=10, le=2000)
```

et compléter `Editorial` :

```python
class Editorial(BaseModel):
    model_config = ConfigDict(extra="forbid")
    library: LibraryConfig = LibraryConfig()
    discover: DiscoverConfig = DiscoverConfig()
    signals: SignalsConfig = SignalsConfig()
```

`config/editorial.toml` (fichier complet) :

```toml
# Réglages éditoriaux AubeSonore v3 — validés au chargement (radio/core/config.py).

[library]
# Écart maximal de durée (secondes) entre le titre Plex et le titre Deezer rapproché.
duration_tolerance_s = 3

[discover]
# Artistes de la bibliothèque tirés comme graines à chaque passe de découverte.
seeds_per_run = 15
# Une graine n'est pas retirée avant ce délai (jours) après une passe réussie.
seed_cooldown_days = 30
# Titres lus par voisin (Deezer artist/{id}/top), et par artiste négatif.
tracks_per_neighbour = 10
# Similaires demandés à Last.fm pour chaque artiste.
lastfm_similar_limit = 100

[signals]
# Taille du vocabulaire de tags Last.fm (signal culture).
culture_vocabulary = 200
```

Dans `radio/core/db.py`, au-dessus de la ligne `sql = script.read_text(...)` dans `_migrate`, ajouter :

```python
        # Un script de migration ne contient ni BEGIN ni COMMIT : il est enveloppé ci-dessous.
```

Dans `pyproject.toml`, ajouter `"numpy>=2.0",` à `dependencies`, puis `uv lock`.

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/core/migrations/002_discovery.sql radio/library/weights.py radio/core/config.py \
  radio/core/db.py config/editorial.toml pyproject.toml uv.lock tests_radio/test_core.py \
  tests_radio/test_schema_v3_2.py tests_radio/test_weights.py
git commit -m "feat(v3): schéma découverte et signaux, réglages [discover]/[signals], poids d'écoute"
```

---

### Task 2: Client Deezer — artistes, voisins, tops, titre et extrait

**Files:**
- Modify: `radio/sources/deezer.py`
- Test: `tests_radio/test_deezer.py` (ajouts)

**Interfaces:**
- Consumes: `DeezerClient._get`, `_track`, `DeezerError`, `DeezerUnavailable` (v3-1).
- Produces :
  - `DeezerArtist(id: int, name: str, nb_fan: int)` (dataclass figée) ;
  - `DeezerClient.artist(artist_id: int) -> DeezerArtist | None` (None : inconnu de Deezer) ;
  - `DeezerClient.related(artist_id: int) -> list[DeezerArtist]` ;
  - `DeezerClient.top(artist_id: int, limit: int = 10) -> list[DeezerTrack]` ;
  - `DeezerClient.track(track_id: int) -> tuple[DeezerTrack, str | None] | None` (URL d'extrait fraîche, ou None ; None global : titre disparu) ;
  - `DeezerClient.download_preview(url: str) -> bytes` (relances sur `DeezerUnavailable`, `DeezerError` si 4xx ou corps vide).

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter `import logging` en tête de `tests_radio/test_deezer.py`, ajouter `DeezerArtist` à l'import
de `radio.sources.deezer`, puis ajouter à la fin :

```python
API = "https://api.deezer.com"
PREVIEW = "https://cdnt-preview.dzcdn.net/api/1/1/x.mp3?hdnea=SIGNED-SECRET"


@responses.activate
def test_artist() -> None:
    responses.get(API + "/artist/27", json={"id": 27, "name": "Daft Punk", "nb_fan": 5210804})
    assert client().artist(27) == DeezerArtist(27, "Daft Punk", 5210804)


@responses.activate
def test_unknown_artist_is_none() -> None:
    responses.get(API + "/artist/27", json={"error": {"type": "DataException", "code": 800}})
    assert client().artist(27) is None


@responses.activate
def test_related() -> None:
    responses.get(
        API + "/artist/27/related",
        json={"data": [{"id": 1, "name": "Justice", "nb_fan": 10}], "total": 1},
    )
    assert client().related(27) == [DeezerArtist(1, "Justice", 10)]


@responses.activate
def test_top_passes_limit() -> None:
    responses.get(API + "/artist/27/top", json={"data": [item()], "total": 100})
    assert [t.id for t in client().top(27, limit=10)] == [3135556]
    assert responses.calls[0].request.params == {"limit": "10"}


@responses.activate
def test_track_returns_fresh_preview_url() -> None:
    responses.get(API + "/track/3135556", json=item())
    got = client().track(3135556)
    assert got is not None
    track, url = got
    assert (track.id, track.rank) == (3135556, 850000)
    assert url == "https://cdnt-preview.dzcdn.net/signed"


@responses.activate
def test_track_without_preview() -> None:
    responses.get(API + "/track/1", json=item(id=1, preview=""))
    got = client().track(1)
    assert got is not None and got[1] is None


@responses.activate
def test_gone_track_is_none() -> None:
    responses.get(API + "/track/1", json={"error": {"type": "DataException", "code": 800}})
    assert client().track(1) is None


@responses.activate
def test_download_preview() -> None:
    responses.get(PREVIEW, body=b"ID3data")
    assert client().download_preview(PREVIEW) == b"ID3data"


@responses.activate
def test_preview_server_error_is_retried() -> None:
    responses.get(PREVIEW, status=503)
    with pytest.raises(DeezerUnavailable):
        client().download_preview(PREVIEW)
    assert len(responses.calls) == 3


@responses.activate
def test_preview_errors_never_carry_the_signed_url(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    responses.get(PREVIEW, status=404)
    with pytest.raises(DeezerError) as definitive:
        client().download_preview(PREVIEW)
    responses.replace(responses.GET, PREVIEW, body=requests.ConnectionError(PREVIEW))
    with pytest.raises(DeezerUnavailable) as transient:
        client().download_preview(PREVIEW)
    for text in (str(definitive.value), str(transient.value), caplog.text):
        assert "SIGNED-SECRET" not in text
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_deezer.py -q`
Expected: FAIL (`ImportError: cannot import name 'DeezerArtist'`).

- [ ] **Step 3: Implémenter**

Dans `radio/sources/deezer.py`, après la classe `DeezerTrack` :

```python
@dataclass(frozen=True)
class DeezerArtist:
    id: int
    name: str
    nb_fan: int


def _artist(d: Any) -> DeezerArtist:
    try:
        return DeezerArtist(id=int(d["id"]), name=str(d["name"]), nb_fan=int(d["nb_fan"]))
    except (KeyError, TypeError, ValueError):
        raise DeezerError("malformed artist") from None
```

Dans `DeezerClient`, après `search_tracks` :

```python
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
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/sources/deezer.py tests_radio/test_deezer.py
git commit -m "feat(v3): client Deezer — artiste, voisins, top, titre et extrait"
```

---

### Task 3: Artistes de la bibliothèque, dédoublonnage, inscription des titres

**Files:**
- Create: `radio/library/dedupe.py`
- Create: `radio/library/artists.py`
- Create: `tests_radio/factories.py`
- Test: `tests_radio/test_dedupe.py`, `tests_radio/test_artists.py`

**Interfaces:**
- Consumes: `normalize(s: str) -> str` (`radio.library.match`), tables `library_tracks`, `deezer_matches` (v3-1), `artists`, `tracks` (Task 1), `sync_library` (v3-1).
- Produces :
  - `dedupe_key(artist: str, title: str) -> str` ;
  - `LibraryArtist(deezer_artist_id: int, name: str, plex_names: tuple[str, ...], plays: int)` ;
  - `library_artists(conn) -> list[LibraryArtist]` (tri par id) ;
  - `library_names(conn) -> frozenset[str]` (noms normalisés de tous les artistes Plex et des artistes Deezer rapprochés) ;
  - `RegisterReport(n_tracks: int, n_artists: int, n_removed: int)` ;
  - `register_library(conn, now: str) -> RegisterReport` ;
  - `tests_radio.factories.make_library(directory: Path) -> sqlite3.Connection` (base `directory/radio.db` : M83 = artiste Deezer 83, titres 101 à 103 ; Wire = 70, titre 104 ; « Obscure Band » jamais rapproché).

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/factories.py` :

```python
"""Mini-bibliothèque partagée par les tests v3-2."""

import sqlite3
from pathlib import Path

from radio.core.db import connect
from radio.library.sync import sync_library
from radio.sources.plex import PlexTrack


def make_library(directory: Path) -> sqlite3.Connection:
    """M83 (Deezer 83 : titres 101, 102, 103), Wire (70 : 104), Obscure Band jamais rapproché."""
    conn = connect(directory / "radio.db")
    sync_library(
        conn,
        [
            PlexTrack("1", "M83", "Midnight City", "Hurry Up", 243000, 10),
            PlexTrack("2", "M83 feat. Susanne Sundfør", "For the Kids", "Junk", 280000, 3),
            PlexTrack("3", "M83", "Wait", "Hurry Up", 343000, 0),
            PlexTrack("4", "Wire", "Mannequin", "Pink Flag", 157000, 1),
            PlexTrack("5", "Obscure Band", "Demo", "Tape", 100000, 7),
        ],
        "d1",
    )
    conn.executemany(
        "INSERT INTO deezer_matches VALUES (?, ?, ?, ?, ?, 'd1')",
        [
            ("1", "matched", None, 101, 83),
            ("2", "matched", None, 102, 83),
            ("3", "matched", None, 103, 83),
            ("4", "matched", None, 104, 70),
            ("5", "unmatched", "no_result", None, None),
        ],
    )
    conn.commit()
    return conn
```

`tests_radio/test_dedupe.py` :

```python
import pytest

from radio.library.dedupe import dedupe_key


@pytest.mark.parametrize(
    "title",
    [
        "Song",
        "Song (Remastered 2011)",
        "Song - Remastered 2011",
        "Song [Radio Edit]",
        "Song - Radio Edit",
        "Song - 2011 Version",
        "Song (Live)",
    ],
)
def test_versions_collapse(title: str) -> None:
    assert dedupe_key("The Band", title) == dedupe_key("Band", "Song")


def test_other_suffixes_stay_distinct() -> None:
    assert dedupe_key("Band", "Song - Live at Leeds") != dedupe_key("Band", "Song")
    assert dedupe_key("Band", "Editions") == "band|editions"


def test_title_made_only_of_brackets_keeps_its_words() -> None:
    assert dedupe_key("A", "(Interlude)") != dedupe_key("A", "(Outro)")
```

`tests_radio/test_artists.py` :

```python
from pathlib import Path

from radio.library.artists import (
    LibraryArtist,
    RegisterReport,
    library_artists,
    library_names,
    register_library,
)
from tests_radio.factories import make_library


def test_library_artists(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    assert library_artists(conn) == [
        LibraryArtist(70, "Wire", ("Wire",), 1),
        LibraryArtist(83, "M83", ("M83", "M83 feat. Susanne Sundfør"), 13),
    ]


def test_library_names_include_unmatched_artists(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    assert library_names(conn) == frozenset({"m83", "wire", "obscure band"})


def test_register_library(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    assert register_library(conn, "d2") == RegisterReport(n_tracks=4, n_artists=2, n_removed=0)
    rows = conn.execute(
        "SELECT deezer_track_id, deezer_artist_id, origin FROM tracks ORDER BY 1"
    ).fetchall()
    assert [tuple(r) for r in rows] == [
        (101, 83, "library"),
        (102, 83, "library"),
        (103, 83, "library"),
        (104, 70, "library"),
    ]
    assert register_library(conn, "d3") == RegisterReport(n_tracks=4, n_artists=2, n_removed=0)


def test_register_claims_candidates_and_drops_lost_matches(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (70, 'Wire')")
    conn.execute("INSERT INTO tracks VALUES (104, 70, 'Mannequin', 'candidate', 'wire|m', 'd0')")
    register_library(conn, "d2")
    origin = conn.execute("SELECT origin FROM tracks WHERE deezer_track_id = 104").fetchone()[0]
    assert origin == "library"
    conn.execute("DELETE FROM deezer_matches WHERE plex_key = '4'")
    conn.commit()
    assert register_library(conn, "d3").n_removed == 1
    assert conn.execute("SELECT COUNT(*) FROM tracks WHERE deezer_track_id = 104").fetchone()[0] == 0
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_dedupe.py tests_radio/test_artists.py -q`
Expected: FAIL (`ModuleNotFoundError: radio.library.dedupe`).

- [ ] **Step 3: Implémenter**

`radio/library/dedupe.py` :

```python
"""Clé de dédoublonnage des titres découverts (spec §5.2), plus large que le rapprochement strict.

Deux versions d'un même titre (« Song », « Song (Remastered 2011) », « Song - Radio Edit ») ne
donnent qu'un candidat : on retire toutes les parenthèses et crochets, un suffixe « - … » qui parle
de remaster, d'édition ou de version, puis ces mots eux-mêmes.
"""

import re

from radio.library.match import normalize

_GROUPS = re.compile(r"\([^()]*\)|\[[^\[\]]*\]")
_DASH_TAIL = re.compile(
    r"\s[-–—]\s.*\b(?:remaster\w*|edit|version)\b.*$", re.IGNORECASE
)
_WORDS = re.compile(r"\b(?:remaster\w*|edit|version)\b", re.IGNORECASE)


def dedupe_key(artist: str, title: str) -> str:
    t = _WORDS.sub(" ", _DASH_TAIL.sub("", _GROUPS.sub(" ", title)))
    # Un titre fait seulement de crochets (« (Interlude) ») garde ses mots.
    nt = normalize(t) or normalize(title)
    return f"{normalize(artist)}|{nt}"
```

`radio/library/artists.py` :

```python
"""Artistes de la bibliothèque (identité : id Deezer) et inscription des titres rapprochés.

Un artiste de la bibliothèque est un artiste Deezer dont au moins un titre Plex est rapproché.
Ses écoutes comptent tous les titres Plex qui portent l'un de ses noms (« M83 » et
« M83 feat. X »), rapprochés ou non.
"""

import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass

from radio.library.dedupe import dedupe_key
from radio.library.match import normalize


@dataclass(frozen=True)
class LibraryArtist:
    deezer_artist_id: int
    name: str
    plex_names: tuple[str, ...]
    plays: int


@dataclass(frozen=True)
class RegisterReport:
    n_tracks: int
    n_artists: int
    n_removed: int


def library_artists(conn: sqlite3.Connection) -> list[LibraryArtist]:
    names: defaultdict[int, Counter[str]] = defaultdict(Counter)
    for r in conn.execute(
        """
        SELECT m.deezer_artist_id AS aid, t.artist AS name
        FROM deezer_matches m JOIN library_tracks t USING (plex_key)
        WHERE m.status = 'matched'
        """
    ):
        names[r["aid"]][r["name"]] += 1
    plays = {
        r["artist"]: r["p"]
        for r in conn.execute("SELECT artist, SUM(plays) AS p FROM library_tracks GROUP BY artist")
    }
    out = []
    for aid, c in sorted(names.items()):
        # Le nom le plus fréquent, puis l'ordre alphabétique : déterministe.
        name = min(c, key=lambda n: (-c[n], n))
        out.append(LibraryArtist(aid, name, tuple(sorted(c)), sum(plays[n] for n in c)))
    return out


def library_names(conn: sqlite3.Connection) -> frozenset[str]:
    names = {normalize(r[0]) for r in conn.execute("SELECT DISTINCT artist FROM library_tracks")}
    names |= {
        normalize(r[0])
        for r in conn.execute(
            """
            SELECT name FROM artists WHERE deezer_artist_id IN
                (SELECT deezer_artist_id FROM deezer_matches WHERE status = 'matched')
            """
        )
    }
    names.discard("")
    return frozenset(names)


def register_library(conn: sqlite3.Connection, now: str) -> RegisterReport:
    artists = library_artists(conn)
    first: dict[int, tuple[int, str]] = {}
    for r in conn.execute(
        """
        SELECT m.deezer_track_id AS tid, m.deezer_artist_id AS aid, t.title AS title,
               t.artist AS artist
        FROM deezer_matches m JOIN library_tracks t USING (plex_key)
        WHERE m.status = 'matched' ORDER BY t.plex_key
        """
    ):
        first.setdefault(r["tid"], (r["aid"], dedupe_key(r["artist"], r["title"])))
    titles = {
        r["tid"]: r["title"]
        for r in conn.execute(
            """
            SELECT m.deezer_track_id AS tid, MIN(t.title) AS title
            FROM deezer_matches m JOIN library_tracks t USING (plex_key)
            WHERE m.status = 'matched' GROUP BY m.deezer_track_id
            """
        )
    }
    with conn:
        conn.executemany(
            "INSERT INTO artists (deezer_artist_id, name) VALUES (?, ?) ON CONFLICT DO NOTHING",
            [(a.deezer_artist_id, a.name) for a in artists],
        )
        removed = conn.execute(
            """
            DELETE FROM tracks WHERE origin = 'library' AND deezer_track_id NOT IN
                (SELECT deezer_track_id FROM deezer_matches WHERE status = 'matched')
            """
        ).rowcount
        # Un titre déjà connu comme candidat ou négatif devient un titre de la bibliothèque.
        conn.executemany(
            """
            INSERT INTO tracks (deezer_track_id, deezer_artist_id, title, origin, dedupe_key,
                                added_at)
            VALUES (?, ?, ?, 'library', ?, ?)
            ON CONFLICT (deezer_track_id) DO UPDATE SET origin = 'library'
            """,
            [(tid, aid, titles[tid], key, now) for tid, (aid, key) in sorted(first.items())],
        )
    return RegisterReport(len(first), len(artists), removed)
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/library/dedupe.py radio/library/artists.py tests_radio/factories.py \
  tests_radio/test_dedupe.py tests_radio/test_artists.py
git commit -m "feat(v3): artistes de la bibliothèque, clé de dédoublonnage, inscription des titres"
```

---

### Task 4: Graines et passes de découverte

**Files:**
- Create: `radio/discover/__init__.py` (vide)
- Create: `radio/discover/seeds.py`
- Test: `tests_radio/test_seeds.py`

**Interfaces:**
- Consumes: `LibraryArtist` (Task 3), `play_weight` (Task 1), `DiscoverConfig` (Task 1), tables `discover_runs`, `run_seeds`.
- Produces :
  - `recently_used(conn, now: datetime, days: int) -> set[int]` (ids Deezer des graines des passes **terminées** depuis `days` jours) ;
  - `draw_seeds(artists: list[LibraryArtist], exclude: set[int], k: int, rng: np.random.Generator) -> list[LibraryArtist]` ;
  - `Run(run_id: int, seeds: list[LibraryArtist], resumed: bool, n_dropped: int)` ;
  - `start_run(conn, artists, cfg: DiscoverConfig, now: datetime, rng) -> Run` (reprend la passe en cours s'il y en a une) ;
  - `finish_run(conn, run_id: int, now: datetime) -> None`.
  - Les dates sont écrites en `now.isoformat()` (UTC) : la comparaison de chaînes est chronologique.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_seeds.py` :

```python
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np

from radio.core.config import DiscoverConfig
from radio.core.db import connect
from radio.discover.seeds import draw_seeds, finish_run, recently_used, start_run
from radio.library.artists import LibraryArtist

A = [LibraryArtist(i, f"A{i}", (f"A{i}",), plays) for i, plays in [(1, 0), (2, 100), (3, 5)]]
NOW = datetime(2026, 9, 25, tzinfo=UTC)
CFG = DiscoverConfig(seeds_per_run=2, seed_cooldown_days=30)


def ids(artists: list[LibraryArtist]) -> set[int]:
    return {a.deezer_artist_id for a in artists}


def test_draw_without_replacement() -> None:
    got = draw_seeds(A, set(), 3, np.random.default_rng(0))
    assert sorted(a.deezer_artist_id for a in got) == [1, 2, 3]


def test_draw_respects_exclusion_and_pool_size() -> None:
    assert ids(draw_seeds(A, {2}, 5, np.random.default_rng(0))) == {1, 3}
    assert draw_seeds(A, {1, 2, 3}, 5, np.random.default_rng(0)) == []


def test_listened_artists_are_favoured_but_everyone_keeps_a_chance() -> None:
    rng = np.random.default_rng(42)
    counts = Counter(draw_seeds(A[:2], set(), 1, rng)[0].deezer_artist_id for _ in range(4000))
    # Poids 1 (aucune écoute) contre 4 (plafond) : 20 % contre 80 %.
    assert 0.15 < counts[1] / 4000 < 0.25


def test_run_lifecycle(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    run = start_run(conn, A, CFG, NOW, np.random.default_rng(0))
    assert not run.resumed and len(run.seeds) == 2 and run.n_dropped == 0
    again = start_run(conn, A, CFG, NOW, np.random.default_rng(99))
    assert again.resumed and again.run_id == run.run_id and again.seeds == run.seeds
    finish_run(conn, run.run_id, NOW)
    nxt = start_run(conn, A, CFG, NOW + timedelta(days=1), np.random.default_rng(0))
    assert not nxt.resumed and ids(nxt.seeds).isdisjoint(ids(run.seeds))


def test_cooldown_counts_only_finished_runs(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    run = start_run(conn, A, CFG, NOW, np.random.default_rng(0))
    assert recently_used(conn, NOW, 30) == set()
    finish_run(conn, run.run_id, NOW)
    assert recently_used(conn, NOW + timedelta(days=29), 30) == ids(run.seeds)
    assert recently_used(conn, NOW + timedelta(days=31), 30) == set()


def test_resumed_run_drops_seeds_gone_from_library(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    run = start_run(conn, A, CFG, NOW, np.random.default_rng(0))
    gone = run.seeds[0].deezer_artist_id
    rest = [a for a in A if a.deezer_artist_id != gone]
    again = start_run(conn, rest, CFG, NOW, np.random.default_rng(0))
    assert again.resumed and again.n_dropped == 1 and gone not in ids(again.seeds)
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_seeds.py -q`
Expected: FAIL (`ModuleNotFoundError: radio.discover`).

- [ ] **Step 3: Implémenter**

`radio/discover/__init__.py` : fichier vide.

`radio/discover/seeds.py` :

```python
"""Graines : tirage pondéré sans remise parmi les artistes de la bibliothèque (spec §5.2).

Poids d'un artiste : 1 + log(1 + ses écoutes), plafonné à 4 ; chacun garde une chance. Un artiste
tiré lors d'une passe terminée n'est plus tiré pendant `seed_cooldown_days`. Une passe n'est
terminée (graines « utilisées ») que si elle a réussi en entier ; interrompue, elle reprend avec
les mêmes graines.
"""

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np

from radio.core.config import DiscoverConfig
from radio.library.artists import LibraryArtist
from radio.library.weights import play_weight


@dataclass(frozen=True)
class Run:
    run_id: int
    seeds: list[LibraryArtist]
    resumed: bool
    n_dropped: int


def recently_used(conn: sqlite3.Connection, now: datetime, days: int) -> set[int]:
    since = (now - timedelta(days=days)).isoformat()
    return {
        r[0]
        for r in conn.execute(
            """
            SELECT s.deezer_artist_id FROM run_seeds s JOIN discover_runs r USING (run_id)
            WHERE r.status = 'done' AND r.finished_at >= ?
            """,
            (since,),
        )
    }


def draw_seeds(
    artists: list[LibraryArtist], exclude: set[int], k: int, rng: np.random.Generator
) -> list[LibraryArtist]:
    pool = [a for a in artists if a.deezer_artist_id not in exclude]
    if not pool:
        return []
    w = np.array([play_weight(a.plays) for a in pool])
    picked = rng.choice(len(pool), size=min(k, len(pool)), replace=False, p=w / w.sum())
    return [pool[int(i)] for i in picked]


def start_run(
    conn: sqlite3.Connection,
    artists: list[LibraryArtist],
    cfg: DiscoverConfig,
    now: datetime,
    rng: np.random.Generator,
) -> Run:
    running = conn.execute("SELECT run_id FROM discover_runs WHERE status = 'running'").fetchone()
    if running is not None:
        by_id = {a.deezer_artist_id: a for a in artists}
        seed_ids = [
            r[0]
            for r in conn.execute(
                "SELECT deezer_artist_id FROM run_seeds WHERE run_id = ? ORDER BY rowid",
                (running[0],),
            )
        ]
        seeds = [by_id[i] for i in seed_ids if i in by_id]
        return Run(running[0], seeds, resumed=True, n_dropped=len(seed_ids) - len(seeds))
    seeds = draw_seeds(
        artists, recently_used(conn, now, cfg.seed_cooldown_days), cfg.seeds_per_run, rng
    )
    with conn:
        cur = conn.execute(
            "INSERT INTO discover_runs (started_at, status) VALUES (?, 'running')",
            (now.isoformat(),),
        )
        run_id = cur.lastrowid
        assert run_id is not None
        conn.executemany(
            "INSERT INTO run_seeds VALUES (?, ?)", [(run_id, s.deezer_artist_id) for s in seeds]
        )
    return Run(run_id, seeds, resumed=False, n_dropped=0)


def finish_run(conn: sqlite3.Connection, run_id: int, now: datetime) -> None:
    with conn:
        conn.execute(
            "UPDATE discover_runs SET status = 'done', finished_at = ? WHERE run_id = ?",
            (now.isoformat(), run_id),
        )
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/discover/__init__.py radio/discover/seeds.py tests_radio/test_seeds.py
git commit -m "feat(v3): graines tirées par écoutes, passes reprenables"
```

---

### Task 5: Voisins et titres candidats

**Files:**
- Create: `radio/discover/neighbours.py`
- Create: `radio/discover/candidates.py`
- Test: `tests_radio/test_neighbours.py`, `tests_radio/test_candidates.py`

**Interfaces:**
- Consumes: `DeezerClient.related`, `DeezerArtist` (Task 2), `LastfmClient.similar_artists` (v3-1), `LibraryArtist` (Task 3), `normalize`, `dedupe_key` (Task 3), `DeezerTrack` (v3-1).
- Produces :
  - `neighbours(seed: LibraryArtist, deezer, lastfm, similar_limit: int, exclude_ids: set[int], exclude_names: frozenset[str]) -> list[DeezerArtist]` (ordre de Deezer) ;
  - `keep_tracks(top: list[DeezerTrack], artist_id: int) -> list[DeezerTrack]` ;
  - `add_tracks(conn, artist_id: int, artist_name: str, tracks: list[DeezerTrack], origin: str, now: str) -> list[int]` (ids réellement ajoutés ; l'appelant ouvre la transaction).

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_neighbours.py` :

```python
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
```

`tests_radio/test_candidates.py` :

```python
from pathlib import Path

from radio.core.db import connect
from radio.discover.candidates import add_tracks, keep_tracks
from radio.sources.deezer import DeezerTrack


def dt(tid: int, title: str = "Song", artist_id: int = 1, preview: bool = True) -> DeezerTrack:
    return DeezerTrack(tid, title, title, 200, 1000, artist_id, "Knife", preview)


def test_keep_tracks_by_main_artist_with_preview() -> None:
    kept = keep_tracks([dt(1), dt(2, artist_id=9), dt(3, preview=False)], 1)
    assert [t.id for t in kept] == [1]


def test_add_tracks_dedupes(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    with conn:
        added = add_tracks(
            conn,
            1,
            "Knife",
            [dt(1, "Heartbeats"), dt(2, "Heartbeats (Remastered)"), dt(3, "Silent Shout")],
            "candidate",
            "d",
        )
    assert added == [1, 3]
    with conn:
        assert add_tracks(conn, 1, "Knife", [dt(1, "Heartbeats")], "candidate", "d") == []
        assert add_tracks(conn, 1, "Knife", [dt(4, "Heartbeats")], "negative", "d") == [4]
    name = conn.execute("SELECT name FROM artists WHERE deezer_artist_id = 1").fetchone()[0]
    assert name == "Knife"
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_neighbours.py tests_radio/test_candidates.py -q`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implémenter**

`radio/discover/neighbours.py` :

```python
"""Voisins d'une graine : Deezer related ∩ Last.fm getSimilar, moins la bibliothèque (spec §5.2).

Les deux sources se croisent sur le nom normalisé (Last.fm ne donne que des noms). Un voisin
n'est jamais un artiste de la bibliothèque : exclusion par id Deezer et par nom.
"""

from radio.library.artists import LibraryArtist
from radio.library.match import normalize
from radio.sources.deezer import DeezerArtist, DeezerClient
from radio.sources.lastfm import LastfmClient


def neighbours(
    seed: LibraryArtist,
    deezer: DeezerClient,
    lastfm: LastfmClient,
    similar_limit: int,
    exclude_ids: set[int],
    exclude_names: frozenset[str],
) -> list[DeezerArtist]:
    similar = {normalize(s.name) for s in lastfm.similar_artists(seed.name, limit=similar_limit)}
    similar.discard("")
    out = []
    for a in deezer.related(seed.deezer_artist_id):
        n = normalize(a.name)
        if n in similar and a.id not in exclude_ids and n not in exclude_names:
            out.append(a)
    return out
```

`radio/discover/candidates.py` :

```python
"""Titres d'un voisin (ou d'un négatif) : filtre et insertion dédoublonnée (spec §5.2)."""

import sqlite3

from radio.library.dedupe import dedupe_key
from radio.sources.deezer import DeezerTrack


def keep_tracks(top: list[DeezerTrack], artist_id: int) -> list[DeezerTrack]:
    """Seuls les titres dont l'artiste est l'artiste principal et qui ont un extrait."""
    return [t for t in top if t.artist_id == artist_id and t.has_preview]


def add_tracks(
    conn: sqlite3.Connection,
    artist_id: int,
    artist_name: str,
    tracks: list[DeezerTrack],
    origin: str,
    now: str,
) -> list[int]:
    """Insère l'artiste et ses titres ; renvoie les ids ajoutés. Un doublon (même id, ou même clé
    de dédoublonnage pour cette origine) est écarté : on garde la première référence, la plus
    populaire puisque Deezer trie son top par rang."""
    conn.execute(
        "INSERT INTO artists (deezer_artist_id, name) VALUES (?, ?) ON CONFLICT DO NOTHING",
        (artist_id, artist_name),
    )
    added = []
    for t in tracks:
        cur = conn.execute(
            """
            INSERT INTO tracks (deezer_track_id, deezer_artist_id, title, origin, dedupe_key,
                                added_at)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
            """,
            (t.id, artist_id, t.title, origin, dedupe_key(artist_name, t.title), now),
        )
        if cur.rowcount:
            added.append(t.id)
    return added
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/discover/neighbours.py radio/discover/candidates.py \
  tests_radio/test_neighbours.py tests_radio/test_candidates.py
git commit -m "feat(v3): voisins Deezer ∩ Last.fm et titres candidats dédoublonnés"
```

---

### Task 6: Passe de découverte et commande `radio discover`

**Files:**
- Create: `radio/discover/run.py`
- Modify: `radio/cli.py`
- Test: `tests_radio/test_discover.py`, `tests_radio/test_cli.py` (ajouts)

**Interfaces:**
- Consumes: `library_artists`, `library_names` (Task 3), `start_run`, `finish_run` (Task 4), `neighbours`, `keep_tracks`, `add_tracks` (Task 5), `DiscoverConfig` (Task 1), `DeezerError`/`DeezerUnavailable`, `LastfmError`/`LastfmUnavailable`, `make_library` (Task 3).
- Produces :
  - `NoLibraryArtistsError` ;
  - `DiscoverReport(run_id, resumed, n_seeds, n_dropped, n_neighbours, n_seen, n_added, n_duplicates, n_filtered, skipped: list[str])` ;
  - `discover_pass(conn, deezer, lastfm, cfg: DiscoverConfig, now: datetime, rng) -> DiscoverReport` ;
  - dans `radio/cli.py` : `_logging()`, `_lastfm(settings) -> LastfmClient` (sortie 2 sans clé), `_rng() -> np.random.Generator`, `_unavailable(e: Exception) -> str`, `_discover_lines(rep) -> list[str]`, commande `discover`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_discover.py` :

```python
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pytest

from radio.core.config import DiscoverConfig
from radio.core.db import connect
from radio.discover.run import NoLibraryArtistsError, discover_pass
from radio.discover.seeds import recently_used
from radio.sources.deezer import DeezerArtist, DeezerError, DeezerTrack
from radio.sources.lastfm import LastfmUnavailable, SimilarArtist
from tests_radio.factories import make_library

NOW = datetime(2026, 9, 25, tzinfo=UTC)
CFG = DiscoverConfig()


def dt(tid: int, aid: int, title: str, preview: bool = True) -> DeezerTrack:
    return DeezerTrack(tid, title, title, 200, 1000, aid, "x", preview)


class FakeDeezer:
    def __init__(self) -> None:
        self._related = {
            83: [DeezerArtist(1, "Knife", 10), DeezerArtist(70, "Wire", 5)],
            70: [DeezerArtist(1, "Knife", 10), DeezerArtist(2, "The Fall", 3)],
        }
        self.top_: dict[int, list[DeezerTrack] | Exception] = {
            1: [
                dt(11, 1, "Heartbeats"),
                dt(13, 1, "Heartbeats (Remastered)"),
                dt(14, 99, "Collab"),
                dt(15, 1, "No Preview", preview=False),
            ],
            2: [dt(21, 2, "Totally Wired")],
        }
        self.top_calls: list[int] = []

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return self._related.get(artist_id, [])

    def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
        self.top_calls.append(artist_id)
        v = self.top_[artist_id]
        if isinstance(v, Exception):
            raise v
        return v


class FakeLastfm:
    def __init__(self) -> None:
        self.similar: dict[str, list[SimilarArtist] | Exception] = {
            "M83": [SimilarArtist("The Knife", 0.9), SimilarArtist("Wire", 0.5)],
            "Wire": [SimilarArtist("Knife", 0.5), SimilarArtist("Fall", 0.8)],
        }

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        v = self.similar[artist]
        if isinstance(v, Exception):
            raise v
        return v


def status(conn: sqlite3.Connection) -> str:
    return str(conn.execute("SELECT status FROM discover_runs").fetchone()[0])


def test_discover_pass(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    dz, lf = FakeDeezer(), FakeLastfm()
    rep = discover_pass(conn, dz, lf, CFG, NOW, np.random.default_rng(0))
    assert (rep.run_id, rep.resumed, rep.n_seeds, rep.n_dropped) == (1, False, 2, 0)
    assert (rep.n_neighbours, rep.n_seen, rep.n_added) == (2, 5, 2)
    assert (rep.n_duplicates, rep.n_filtered, rep.skipped) == (1, 2, [])
    assert sorted(dz.top_calls) == [1, 2]
    rows = conn.execute(
        "SELECT deezer_track_id, run_id, neighbour_artist_id FROM candidates ORDER BY 1"
    ).fetchall()
    assert [(r[0], r[1], r[2]) for r in rows] == [(11, 1, 1), (21, 1, 2)]
    assert status(conn) == "done"
    assert recently_used(conn, NOW, 30) == {70, 83}


def test_definitive_error_skips_and_names(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    dz = FakeDeezer()
    dz.top_[2] = DeezerError("code 501")
    rep = discover_pass(conn, dz, FakeLastfm(), CFG, NOW, np.random.default_rng(0))
    assert rep.skipped == ["The Fall (DeezerError)"]
    assert status(conn) == "done"


def test_unavailable_keeps_work_and_resumes_same_run(tmp_path: Path) -> None:
    conn = make_library(tmp_path)
    dz, lf = FakeDeezer(), FakeLastfm()
    lf.similar["Wire"] = LastfmUnavailable("code 29")
    with pytest.raises(LastfmUnavailable):
        discover_pass(conn, dz, lf, CFG, NOW, np.random.default_rng(0))
    assert status(conn) == "running"
    assert recently_used(conn, NOW, 30) == set()
    lf = FakeLastfm()
    rep = discover_pass(conn, dz, lf, CFG, NOW, np.random.default_rng(1))
    assert rep.resumed and rep.run_id == 1
    assert status(conn) == "done"


def test_no_library_artist(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    with pytest.raises(NoLibraryArtistsError):
        discover_pass(conn, FakeDeezer(), FakeLastfm(), CFG, NOW, np.random.default_rng(0))
```

Dans `tests_radio/test_cli.py`, ajouter aux imports `import numpy as np`,
`from radio.sources.deezer import DeezerArtist` (à fusionner avec l'import existant),
`from radio.sources.lastfm import LastfmUnavailable, SimilarArtist` et
`from tests_radio.factories import make_library`, puis ajouter :

```python
class DiscoverFakes:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return [DeezerArtist(1, "Knife", 10)] if artist_id == 83 else []

    def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
        return [DeezerTrack(11, "Heartbeats", "Heartbeats", 200, 1000, 1, "Knife", True)]

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        if self.fail:
            raise LastfmUnavailable("code 29")
        return [SimilarArtist("The Knife", 0.9)]


def _discover_env(monkeypatch: pytest.MonkeyPatch, env: Path, fakes: DiscoverFakes) -> None:
    make_library(env / "data").close()
    monkeypatch.setattr(cli, "_deezer", lambda: fakes)
    monkeypatch.setattr(cli, "_lastfm", lambda s: fakes)
    monkeypatch.setattr(cli, "_rng", lambda: np.random.default_rng(0))


def test_discover_command(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _discover_env(monkeypatch, env, DiscoverFakes())
    res = runner.invoke(cli.app, ["discover"])
    assert res.exit_code == 0, res.output
    assert (
        "Découverte : passe n°1 (nouvelle), 2 graines → 1 voisins, 1 titres vus → 1 ajoutés, "
        "0 doublons, 0 écartés (pas l'artiste principal ou sans extrait), 0 sautés"
    ) in res.stdout


def test_discover_unavailable_exits_1(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _discover_env(monkeypatch, env, DiscoverFakes(fail=True))
    res = runner.invoke(cli.app, ["discover"])
    assert res.exit_code == 1
    assert "Last.fm indisponible (code 29) : le travail fait est gardé" in res.output


def test_discover_without_lastfm_key_exits_2(env: Path) -> None:
    res = runner.invoke(cli.app, ["discover"])
    assert res.exit_code == 2
    assert "LASTFM_API_KEY" in res.output


def test_discover_without_library_exits_1(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fakes = DiscoverFakes()
    monkeypatch.setattr(cli, "_deezer", lambda: fakes)
    monkeypatch.setattr(cli, "_lastfm", lambda s: fakes)
    res = runner.invoke(cli.app, ["discover"])
    assert res.exit_code == 1
    assert "radio library-sync" in res.output
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_discover.py tests_radio/test_cli.py -q`
Expected: FAIL (`ModuleNotFoundError: radio.discover.run`, `No such command 'discover'`).

- [ ] **Step 3: Implémenter**

`radio/discover/run.py` :

```python
"""Passe de découverte : graines → voisins → titres candidats (spec §5.2, §8).

Erreur définitive sur un artiste : sauté, compté, nommé. Deezer ou Last.fm indisponible : la
passe s'arrête, le travail fait est gardé, aucune graine n'est marquée ; la passe suivante
reprend avec les mêmes graines.
"""

import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime

import numpy as np

from radio.core.config import DiscoverConfig
from radio.discover.candidates import add_tracks, keep_tracks
from radio.discover.neighbours import neighbours
from radio.discover.seeds import finish_run, start_run
from radio.library.artists import library_artists, library_names
from radio.sources.deezer import DeezerClient, DeezerError
from radio.sources.lastfm import LastfmClient, LastfmError

logger = logging.getLogger(__name__)


class NoLibraryArtistsError(Exception):
    """Aucun artiste de la bibliothèque n'est rapproché de Deezer : pas de graine possible."""


@dataclass
class DiscoverReport:
    run_id: int
    resumed: bool
    n_seeds: int
    n_dropped: int
    n_neighbours: int = 0
    n_seen: int = 0
    n_added: int = 0
    n_duplicates: int = 0
    n_filtered: int = 0
    skipped: list[str] = field(default_factory=list)


def discover_pass(
    conn: sqlite3.Connection,
    deezer: DeezerClient,
    lastfm: LastfmClient,
    cfg: DiscoverConfig,
    now: datetime,
    rng: np.random.Generator,
) -> DiscoverReport:
    artists = library_artists(conn)
    if not artists:
        raise NoLibraryArtistsError("no library artist matched on Deezer")
    run = start_run(conn, artists, cfg, now, rng)
    exclude_ids = {a.deezer_artist_id for a in artists}
    exclude_names = library_names(conn)
    rep = DiscoverReport(run.run_id, run.resumed, len(run.seeds), run.n_dropped)
    seen: set[int] = set()
    stamp = now.isoformat()
    for i, seed in enumerate(run.seeds, 1):
        logger.info("discover: seed %d/%d", i, len(run.seeds))
        try:
            found = neighbours(
                seed, deezer, lastfm, cfg.lastfm_similar_limit, exclude_ids, exclude_names
            )
        except (DeezerError, LastfmError) as e:
            rep.skipped.append(f"{seed.name} ({type(e).__name__})")
            continue
        for n in found:
            if n.id in seen:
                continue
            seen.add(n.id)
            rep.n_neighbours += 1
            try:
                top = deezer.top(n.id, cfg.tracks_per_neighbour)
            except DeezerError as e:
                rep.skipped.append(f"{n.name} ({type(e).__name__})")
                continue
            kept = keep_tracks(top, n.id)
            with conn:
                added = add_tracks(conn, n.id, n.name, kept, "candidate", stamp)
                conn.executemany(
                    "INSERT INTO candidates VALUES (?, ?, ?, ?)",
                    [(tid, run.run_id, seed.deezer_artist_id, n.id) for tid in added],
                )
            rep.n_seen += len(top)
            rep.n_filtered += len(top) - len(kept)
            rep.n_added += len(added)
            rep.n_duplicates += len(kept) - len(added)
    finish_run(conn, run.run_id, now)
    return rep
```

Dans `radio/cli.py` :

1. Imports à ajouter : `import numpy as np`, `from radio.discover.run import DiscoverReport,
   NoLibraryArtistsError, discover_pass`, `from radio.sources.lastfm import LastfmClient,
   LastfmUnavailable`.
2. Ajouter les aides (après `_deezer`) :

```python
def _lastfm(settings: Settings) -> LastfmClient:
    if settings.lastfm_api_key is None:
        _fail("LASTFM_API_KEY doit être défini dans .env", 2)
    return LastfmClient(settings.lastfm_api_key.get_secret_value())


def _rng() -> np.random.Generator:
    return np.random.default_rng()


def _logging() -> None:
    logging.basicConfig(
        level=logging.INFO, stream=sys.stderr, format="%(asctime)s %(levelname)s %(message)s"
    )
    # À WARNING, urllib3 peut journaliser l'URL complète, clé Last.fm comprise.
    logging.getLogger("urllib3").setLevel(logging.ERROR)


def _unavailable(e: Exception) -> str:
    source = "Deezer" if isinstance(e, DeezerUnavailable) else "Last.fm"
    return f"{source} indisponible ({e}) : le travail fait est gardé, relancer plus tard"


def _discover_lines(rep: DiscoverReport) -> list[str]:
    kind = "reprise" if rep.resumed else "nouvelle"
    lines = [
        f"Découverte : passe n°{rep.run_id} ({kind}), {_n(rep.n_seeds)} graines → "
        f"{_n(rep.n_neighbours)} voisins, {_n(rep.n_seen)} titres vus → {_n(rep.n_added)} "
        f"ajoutés, {_n(rep.n_duplicates)} doublons, {_n(rep.n_filtered)} écartés (pas "
        f"l'artiste principal ou sans extrait), {_n(len(rep.skipped))} sautés"
    ]
    if rep.n_dropped:
        lines.append(f"  {_n(rep.n_dropped)} graines de la passe reprise ont quitté la bibliothèque")
    lines += [f"  sauté : {s}" for s in rep.skipped]
    return lines
```

3. Dans `library_sync`, remplacer les trois lignes de configuration du journal par `_logging()`,
   et le message `f"Deezer indisponible ({e}) : le travail fait est gardé, relancer plus tard"`
   par `_unavailable(e)` (texte identique).
4. Ajouter la commande :

```python
@app.command()
def discover() -> None:
    """Tire des graines dans la bibliothèque et découvre des titres candidats."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    lastfm = _lastfm(settings)
    conn = connect(settings.data_dir / "radio.db")
    try:
        rep = discover_pass(
            conn, _deezer(), lastfm, editorial.discover, datetime.now(UTC), _rng()
        )
    except NoLibraryArtistsError:
        _fail("Aucun artiste de la bibliothèque rapproché : lancer d'abord radio library-sync", 1)
    except (DeezerUnavailable, LastfmUnavailable) as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    for line in _discover_lines(rep):
        typer.echo(line)
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe (les tests `library-sync` existants aussi : messages inchangés).

- [ ] **Step 5: Commit**

```bash
git add radio/discover/run.py radio/cli.py tests_radio/test_discover.py tests_radio/test_cli.py
git commit -m "feat(v3): passe de découverte reprenable et commande radio discover"
```

---

### Task 7: Négatifs de démarrage et commande `radio negatives-sync`

**Files:**
- Create: `radio/discover/negatives.py`
- Modify: `radio/cli.py`
- Test: `tests_radio/test_negatives.py`, `tests_radio/test_cli.py` (ajout)

**Interfaces:**
- Consumes: `config/negatives.toml` (324 artistes : `name`, `deezer_id`, `category`, `source`), `keep_tracks`, `add_tracks` (Task 5), `DeezerClient.top` (Task 2), `DiscoverConfig.tracks_per_neighbour`.
- Produces :
  - `NegativeArtist` (modèle pydantic figé : `name: str`, `deezer_id: int > 0`, `category: Literal[...]`) ;
  - `load_negatives(path: Path) -> list[NegativeArtist]` (pydantic `ValidationError` si mal formé ; `ValueError` si id en double) ;
  - `NegativesReport(n_artists, n_already, n_added, n_duplicates, n_filtered, skipped)` ;
  - `import_negatives(conn, deezer, negatives, per_artist: int, now: str) -> NegativesReport` ;
  - commande `negatives-sync`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_negatives.py` :

```python
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import REPO_ROOT
from radio.core.db import connect
from radio.discover.negatives import NegativeArtist, import_negatives, load_negatives
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable


def test_repo_negatives_file() -> None:
    negs = load_negatives(REPO_ROOT / "config" / "negatives.toml")
    assert len(negs) == 324
    assert {n.category for n in negs} == {"commercial_fr", "commercial_intl", "metal", "hard_techno"}


def test_invalid_file_is_refused(tmp_path: Path) -> None:
    p = tmp_path / "n.toml"
    p.write_text('[[artist]]\nname = "X"\ndeezer_id = 1\ncategory = "jazz"\n')
    with pytest.raises(ValidationError):
        load_negatives(p)
    p.write_text(
        '[[artist]]\nname = "X"\ndeezer_id = 1\ncategory = "metal"\n'
        '[[artist]]\nname = "Y"\ndeezer_id = 1\ncategory = "metal"\n'
    )
    with pytest.raises(ValueError, match="1"):
        load_negatives(p)


class FakeDeezer:
    def __init__(self, top: dict[int, list[DeezerTrack] | Exception]) -> None:
        self._top = top
        self.calls: list[int] = []

    def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
        self.calls.append(artist_id)
        v = self._top[artist_id]
        if isinstance(v, Exception):
            raise v
        return v


def dt(tid: int, aid: int, title: str) -> DeezerTrack:
    return DeezerTrack(tid, title, title, 200, 1000, aid, "x", True)


NEGS = [
    NegativeArtist(name="Jul", deezer_id=900, category="commercial_fr"),
    NegativeArtist(name="Broken", deezer_id=901, category="metal"),
]


def test_import_negatives(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    dz = FakeDeezer(
        {
            900: [dt(1, 900, "Tchikita"), dt(2, 900, "Tchikita (Edit)"), dt(3, 5, "Feat")],
            901: DeezerError("code 501"),
        }
    )
    rep = import_negatives(conn, dz, NEGS, 10, "d")
    assert (rep.n_artists, rep.n_already, rep.n_added) == (2, 0, 1)
    assert (rep.n_duplicates, rep.n_filtered, rep.skipped) == (1, 1, ["Broken (DeezerError)"])
    row = conn.execute("SELECT * FROM negative_artists").fetchone()
    assert (row["deezer_artist_id"], row["category"]) == (900, "commercial_fr")
    assert conn.execute("SELECT origin FROM tracks").fetchone()[0] == "negative"
    dz.calls.clear()
    rep2 = import_negatives(conn, dz, NEGS, 10, "d")
    assert rep2.n_already == 1 and dz.calls == [901]


def test_import_stops_when_deezer_is_unavailable(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    dz = FakeDeezer({900: [dt(1, 900, "Tchikita")], 901: DeezerUnavailable("code 4")})
    with pytest.raises(DeezerUnavailable):
        import_negatives(conn, dz, NEGS, 10, "d")
    assert conn.execute("SELECT COUNT(*) FROM negative_artists").fetchone()[0] == 1
```

Dans `tests_radio/test_cli.py`, ajouter :

```python
def test_negatives_sync_command(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (env / "config" / "negatives.toml").write_text(
        '[[artist]]\nname = "Jul"\ndeezer_id = 900\ncategory = "commercial_fr"\n'
    )

    class Top:
        def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
            return [DeezerTrack(1, "Tchikita", "Tchikita", 200, 1000, 900, "Jul", True)]

    monkeypatch.setattr(cli, "_deezer", lambda: Top())
    res = runner.invoke(cli.app, ["negatives-sync"])
    assert res.exit_code == 0, res.output
    assert (
        "Négatifs : 1 artistes (0 déjà importés) → 1 titres ajoutés, 0 doublons, 0 écartés, "
        "0 sautés"
    ) in res.stdout


def test_negatives_sync_invalid_file_exits_2(env: Path) -> None:
    (env / "config" / "negatives.toml").write_text('[[artist]]\nname = "X"\n')
    res = runner.invoke(cli.app, ["negatives-sync"])
    assert res.exit_code == 2
    assert "negatives.toml invalide" in res.output
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_negatives.py tests_radio/test_cli.py -q`
Expected: FAIL (`ModuleNotFoundError: radio.discover.negatives`).

- [ ] **Step 3: Implémenter**

`radio/discover/negatives.py` :

```python
"""Négatifs faibles de démarrage (spec §5.4) : les titres des artistes de config/negatives.toml.

Ils sont lus et mesurés comme les candidats (10 titres, artiste principal, extrait présent) ;
leur poids à l'entraînement se décide plus tard, sur les votes.
"""

import sqlite3
import tomllib
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from radio.discover.candidates import add_tracks, keep_tracks
from radio.sources.deezer import DeezerClient, DeezerError


class NegativeArtist(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    name: str
    deezer_id: int = Field(gt=0)
    category: Literal["commercial_fr", "commercial_intl", "metal", "hard_techno"]


class _File(BaseModel):
    model_config = ConfigDict(extra="forbid")
    artist: list[NegativeArtist]


@dataclass
class NegativesReport:
    n_artists: int
    n_already: int = 0
    n_added: int = 0
    n_duplicates: int = 0
    n_filtered: int = 0
    skipped: list[str] = field(default_factory=list)


def load_negatives(path: Path) -> list[NegativeArtist]:
    with path.open("rb") as f:
        negatives = _File.model_validate(tomllib.load(f)).artist
    doubles = [i for i, n in Counter(a.deezer_id for a in negatives).items() if n > 1]
    if doubles:
        raise ValueError(f"deezer_id en double : {doubles}")
    return negatives


def import_negatives(
    conn: sqlite3.Connection,
    deezer: DeezerClient,
    negatives: list[NegativeArtist],
    per_artist: int,
    now: str,
) -> NegativesReport:
    done = {r[0] for r in conn.execute("SELECT deezer_artist_id FROM negative_artists")}
    rep = NegativesReport(n_artists=len(negatives))
    for n in negatives:
        if n.deezer_id in done:
            rep.n_already += 1
            continue
        try:
            top = deezer.top(n.deezer_id, per_artist)
        except DeezerError as e:
            rep.skipped.append(f"{n.name} ({type(e).__name__})")
            continue
        kept = keep_tracks(top, n.deezer_id)
        with conn:
            added = add_tracks(conn, n.deezer_id, n.name, kept, "negative", now)
            conn.execute("INSERT INTO negative_artists VALUES (?, ?)", (n.deezer_id, n.category))
        rep.n_added += len(added)
        rep.n_duplicates += len(kept) - len(added)
        rep.n_filtered += len(top) - len(kept)
    return rep
```

Dans `radio/cli.py` : importer `from pydantic import ValidationError` et
`from radio.discover.negatives import import_negatives, load_negatives`, puis ajouter :

```python
@app.command("negatives-sync")
def negatives_sync() -> None:
    """Importe les titres des artistes négatifs de démarrage (config/negatives.toml)."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    try:
        negatives = load_negatives(settings.config_dir / "negatives.toml")
    except ValidationError as e:
        _fail(f"negatives.toml invalide : {e.error_count()} erreurs", 2)
    except ValueError as e:
        _fail(f"negatives.toml invalide : {e}", 2)
    conn = connect(settings.data_dir / "radio.db")
    try:
        rep = import_negatives(
            conn,
            _deezer(),
            negatives,
            editorial.discover.tracks_per_neighbour,
            datetime.now(UTC).isoformat(),
        )
    except DeezerUnavailable as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    typer.echo(
        f"Négatifs : {_n(rep.n_artists)} artistes ({_n(rep.n_already)} déjà importés) → "
        f"{_n(rep.n_added)} titres ajoutés, {_n(rep.n_duplicates)} doublons, "
        f"{_n(rep.n_filtered)} écartés, {_n(len(rep.skipped))} sautés"
    )
    for s in rep.skipped:
        typer.echo(f"  sauté : {s}")
```

(`ValidationError` de pydantic est une sous-classe de `ValueError` : l'`except ValidationError`
doit précéder l'`except ValueError`.)

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/discover/negatives.py radio/cli.py tests_radio/test_negatives.py tests_radio/test_cli.py
git commit -m "feat(v3): négatifs de démarrage et commande radio negatives-sync"
```

---

### Task 8: Données brutes des artistes (Deezer, Last.fm)

**Files:**
- Create: `radio/signals/__init__.py` (vide)
- Create: `radio/signals/artists.py`
- Test: `tests_radio/test_fetch_artists.py`

**Interfaces:**
- Consumes: `DeezerClient.artist`, `.related` (Task 2), `LastfmClient.artist_info`, `.artist_top_tags`, `.similar_artists` (v3-1), tables `artists`, `tracks`.
- Produces :
  - `FetchReport(n_todo, n_fetched, not_on_deezer: list[str], skipped: list[str])` ;
  - `fetch_artists(conn, deezer, lastfm, similar_limit: int, now: str) -> FetchReport` : lit chaque artiste référencé par `tracks` et pas encore lu. Écrit `name` (nom Deezer), `nb_fan`, `deezer_related` (JSON `[[id, nom], …]`), `lastfm_found`, `lastfm_listeners`, `lastfm_tags` (JSON `[[tag, compte], …]`), `lastfm_similar` (JSON `[[nom, match], …]`) ; inconnu de Last.fm : `lastfm_found = 0`, tags et similaires `NULL`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_fetch_artists.py` :

```python
import json
import sqlite3
from pathlib import Path

import pytest

from radio.core.db import connect
from radio.signals.artists import fetch_artists
from radio.sources.deezer import DeezerArtist, DeezerError, DeezerUnavailable
from radio.sources.lastfm import ArtistInfo, SimilarArtist, Tag


class FakeDeezer:
    def __init__(
        self,
        artists: dict[int, DeezerArtist | None | Exception],
        related: dict[int, list[DeezerArtist]] | None = None,
    ) -> None:
        self._artists = artists
        self._related = related or {}

    def artist(self, artist_id: int) -> DeezerArtist | None:
        v = self._artists[artist_id]
        if isinstance(v, Exception):
            raise v
        return v

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return self._related.get(artist_id, [])


class FakeLastfm:
    def __init__(self, info: dict[str, ArtistInfo | None]) -> None:
        self._info = info
        self.limits: list[int] = []

    def artist_info(self, artist: str) -> ArtistInfo | None:
        return self._info[artist]

    def artist_top_tags(self, artist: str) -> list[Tag]:
        return [Tag("electronic", 100), Tag("french", 40)]

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        self.limits.append(limit)
        return [SimilarArtist("Air", 0.7)]


def db(tmp_path: Path) -> sqlite3.Connection:
    conn = connect(tmp_path / "radio.db")
    conn.executemany(
        "INSERT INTO artists (deezer_artist_id, name) VALUES (?, ?)",
        [(1, "Knife"), (2, "Jul"), (3, "Gone"), (4, "Broken"), (5, "Orphan")],
    )
    conn.executemany(
        "INSERT INTO tracks VALUES (?, ?, 'T', 'candidate', ?, 'd')",
        [(10, 1, "k1"), (20, 2, "k2"), (30, 3, "k3"), (40, 4, "k4")],
    )
    conn.commit()
    return conn


def test_fetch_artists(tmp_path: Path) -> None:
    conn = db(tmp_path)
    dz = FakeDeezer(
        {
            1: DeezerArtist(1, "The Knife", 900),
            2: DeezerArtist(2, "Jul", 5000),
            3: None,
            4: DeezerError("code 501"),
        },
        related={1: [DeezerArtist(83, "M83", 10)]},
    )
    lf = FakeLastfm({"The Knife": ArtistInfo("The Knife", 1234), "Jul": None})
    rep = fetch_artists(conn, dz, lf, 50, "d2")
    assert (rep.n_todo, rep.n_fetched) == (4, 2)
    assert (rep.not_on_deezer, rep.skipped) == (["Gone"], ["Broken (DeezerError)"])
    knife = conn.execute("SELECT * FROM artists WHERE deezer_artist_id = 1").fetchone()
    assert (knife["name"], knife["nb_fan"], knife["fetched_at"]) == ("The Knife", 900, "d2")
    assert (knife["lastfm_found"], knife["lastfm_listeners"]) == (1, 1234)
    assert json.loads(knife["deezer_related"]) == [[83, "M83"]]
    assert json.loads(knife["lastfm_tags"]) == [["electronic", 100], ["french", 40]]
    assert json.loads(knife["lastfm_similar"]) == [["Air", 0.7]]
    jul = conn.execute("SELECT * FROM artists WHERE deezer_artist_id = 2").fetchone()
    assert (jul["lastfm_found"], jul["lastfm_tags"], jul["lastfm_similar"]) == (0, None, None)
    assert lf.limits == [50]
    orphan = conn.execute("SELECT fetched_at FROM artists WHERE deezer_artist_id = 5").fetchone()
    assert orphan[0] is None
    assert fetch_artists(conn, dz, lf, 50, "d3").n_todo == 2


def test_unavailable_keeps_fetched_artists(tmp_path: Path) -> None:
    conn = db(tmp_path)
    dz = FakeDeezer({1: DeezerArtist(1, "The Knife", 900), 2: DeezerUnavailable("code 4")})
    lf = FakeLastfm({"The Knife": ArtistInfo("The Knife", 1)})
    with pytest.raises(DeezerUnavailable):
        fetch_artists(conn, dz, lf, 50, "d2")
    row = conn.execute("SELECT fetched_at FROM artists WHERE deezer_artist_id = 1").fetchone()
    assert row[0] == "d2"
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_fetch_artists.py -q`
Expected: FAIL (`ModuleNotFoundError: radio.signals`).

- [ ] **Step 3: Implémenter**

`radio/signals/__init__.py` : fichier vide.

`radio/signals/artists.py` :

```python
"""Données brutes de chaque artiste mesuré (Deezer, Last.fm), lues une fois.

Les signaux se calculent à la lecture (radio/signals/table.py) : la proximité dépend de la
bibliothèque du moment, pas de celle du jour où l'artiste a été lu. Last.fm est interrogé avec
le nom Deezer (autocorrect actif côté client).
"""

import json
import logging
import sqlite3
from dataclasses import dataclass, field

from radio.sources.deezer import DeezerClient, DeezerError
from radio.sources.lastfm import LastfmClient, LastfmError

logger = logging.getLogger(__name__)


@dataclass
class FetchReport:
    n_todo: int
    n_fetched: int = 0
    not_on_deezer: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


def fetch_artists(
    conn: sqlite3.Connection,
    deezer: DeezerClient,
    lastfm: LastfmClient,
    similar_limit: int,
    now: str,
) -> FetchReport:
    todo = conn.execute(
        """
        SELECT deezer_artist_id AS aid, name FROM artists
        WHERE fetched_at IS NULL
          AND deezer_artist_id IN (SELECT deezer_artist_id FROM tracks)
        ORDER BY deezer_artist_id
        """
    ).fetchall()
    rep = FetchReport(n_todo=len(todo))
    for i, r in enumerate(todo, 1):
        if i % 100 == 0:
            logger.info("artists: %d/%d processed", i, len(todo))
        try:
            artist = deezer.artist(r["aid"])
            if artist is None:
                rep.not_on_deezer.append(r["name"])
                continue
            related = deezer.related(artist.id)
            info = lastfm.artist_info(artist.name)
            tags = lastfm.artist_top_tags(artist.name) if info is not None else None
            similar = (
                lastfm.similar_artists(artist.name, limit=similar_limit)
                if info is not None
                else None
            )
        except (DeezerError, LastfmError) as e:
            rep.skipped.append(f"{r['name']} ({type(e).__name__})")
            continue
        with conn:
            conn.execute(
                """
                UPDATE artists SET name = ?, fetched_at = ?, nb_fan = ?, deezer_related = ?,
                    lastfm_found = ?, lastfm_listeners = ?, lastfm_tags = ?, lastfm_similar = ?
                WHERE deezer_artist_id = ?
                """,
                (
                    artist.name,
                    now,
                    artist.nb_fan,
                    json.dumps([[a.id, a.name] for a in related], ensure_ascii=False),
                    int(info is not None),
                    info.listeners if info is not None else None,
                    json.dumps([[t.name, t.count] for t in tags], ensure_ascii=False)
                    if tags is not None
                    else None,
                    json.dumps([[s.name, s.match] for s in similar], ensure_ascii=False)
                    if similar is not None
                    else None,
                    r["aid"],
                ),
            )
        rep.n_fetched += 1
    return rep
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/signals/__init__.py radio/signals/artists.py tests_radio/test_fetch_artists.py
git commit -m "feat(v3): lecture des données brutes des artistes (Deezer, Last.fm)"
```

---

### Task 9: Empreinte sonore EffNet et mesure des titres

**Prérequis (contrôleur, avant de lancer la tâche) :** placer le modèle officiel dans
`models/discogs-effnet-bs64-1.pb` et vérifier sa somme :

```bash
mkdir -p models
curl -fsSL -o models/discogs-effnet-bs64-1.pb \
  https://essentia.upf.edu/models/feature-extractors/discogs-effnet/discogs-effnet-bs64-1.pb
echo "3ed9af50d5367c0b9c795b294b00e7599e4943244f4cbd376869f3bfc87721b1  models/discogs-effnet-bs64-1.pb" | sha256sum -c
```

L'implémenteur lit ce fichier (tests d'intégration) mais ne l'écrit ni ne le déplace.

**Files:**
- Modify: `pyproject.toml` (dépendance `essentia-tensorflow==2.1b6.dev1389`, surcharge mypy), `uv.lock`
- Modify: `radio/core/config.py` (`Settings.effnet_model`)
- Create: `radio/signals/audio.py`
- Create: `radio/signals/measure.py`
- Test: `tests_radio/test_audio.py`, `tests_radio/test_measure.py`

**Interfaces:**
- Consumes: `DeezerClient.track`, `.download_preview`, `DeezerError` (Task 2), tables `tracks`, `artists`, `track_measures` (Task 1).
- Produces :
  - `Settings.effnet_model: Path` (défaut `REPO_ROOT/models/discogs-effnet-bs64-1.pb`, variable `RADIO_EFFNET_MODEL`) ;
  - `radio.signals.audio` : `MODEL_SHA256`, `MODEL_URL`, `MODEL_TAG = "discogs-effnet-bs64-1/hop62/mean-l2"`, `DIM = 1280`, `ModelError`, `check_model(path)`, `to_blob(v) -> bytes`, `from_blob(b) -> NDArray[float32]`, `EffnetEmbedder(model: Path)` avec `.embed(data: bytes, suffix: str = ".mp3") -> NDArray[float32] | None` ;
  - `radio.signals.measure` : `Embedder` (Protocol), `MeasureReport(n_todo, n_ok, n_no_preview, n_audio_failed, n_gone, errors)`, `measure_tracks(conn, deezer, embedder, now: str, batch: int = 20) -> MeasureReport`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_audio.py` :

```python
import io
import wave
from pathlib import Path

import numpy as np
import pytest

from radio.core.config import REPO_ROOT
from radio.signals.audio import DIM, EffnetEmbedder, ModelError, check_model, from_blob, to_blob

MODEL = REPO_ROOT / "models" / "discogs-effnet-bs64-1.pb"
needs_model = pytest.mark.skipif(not MODEL.exists(), reason="modèle EffNet absent")


def test_check_model(tmp_path: Path) -> None:
    with pytest.raises(ModelError, match="absent"):
        check_model(tmp_path / "none.pb")
    p = tmp_path / "m.pb"
    p.write_bytes(b"x")
    with pytest.raises(ModelError, match="somme de contrôle"):
        check_model(p)
    with pytest.raises(ModelError):
        EffnetEmbedder(p)


def test_blob_round_trip() -> None:
    v = np.arange(DIM, dtype=np.float32) / DIM
    b = to_blob(v)
    assert len(b) == 5120
    assert np.array_equal(from_blob(b), v)


@pytest.fixture(scope="module")
def effnet() -> EffnetEmbedder:
    return EffnetEmbedder(MODEL)


def sine_wav(seconds: float = 5.0, sr: int = 44100) -> bytes:
    t = np.arange(int(seconds * sr)) / sr
    pcm = (0.3 * np.sin(2 * np.pi * 440 * t) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


@needs_model
def test_effnet_embeds_audio(effnet: EffnetEmbedder) -> None:
    v = effnet.embed(sine_wav(), suffix=".wav")
    assert v is not None and v.shape == (DIM,) and v.dtype == np.float32
    assert abs(float(np.linalg.norm(v)) - 1.0) < 1e-5


@needs_model
def test_effnet_rejects_garbage(effnet: EffnetEmbedder) -> None:
    assert effnet.embed(b"not audio at all") is None
```

`tests_radio/test_measure.py` :

```python
import logging
import sqlite3
from pathlib import Path

import numpy as np
import numpy.typing as npt
import pytest

from radio.core.db import connect
from radio.signals.audio import DIM, MODEL_TAG, from_blob
from radio.signals.measure import measure_tracks
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable

URL = "https://cdnt-preview.dzcdn.net/x.mp3?hdnea=SIGNED-SECRET"
VEC = np.full(DIM, 1 / np.sqrt(DIM), dtype=np.float32)


def dt(tid: int, rank: int = 500) -> DeezerTrack:
    return DeezerTrack(tid, "T", "T", 200, rank, 1, "Knife", True)


class FakeDeezer:
    def __init__(self, tracks: dict[int, object], fail_download: bool = False) -> None:
        self._tracks = tracks
        self.fail_download = fail_download

    def track(self, track_id: int) -> object:
        v = self._tracks[track_id]
        if isinstance(v, Exception):
            raise v
        return v

    def download_preview(self, url: str) -> bytes:
        assert url == URL
        if self.fail_download:
            raise DeezerError("preview HTTP 404")
        return b"mp3"


class FakeEmbedder:
    def __init__(self, result: npt.NDArray[np.float32] | None = VEC) -> None:
        self.result = result

    def embed(self, data: bytes, suffix: str = ".mp3") -> npt.NDArray[np.float32] | None:
        return self.result


def db(tmp_path: Path, n: int = 5) -> sqlite3.Connection:
    conn = connect(tmp_path / "radio.db")
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (1, 'Knife')")
    conn.executemany(
        "INSERT INTO tracks VALUES (?, 1, 'T', 'candidate', ?, 'd')",
        [(i, f"k{i}") for i in range(1, n + 1)],
    )
    conn.commit()
    return conn


def rows(conn: sqlite3.Connection) -> dict[int, tuple[str, int | None]]:
    return {
        r["deezer_track_id"]: (r["status"], r["rank"])
        for r in conn.execute("SELECT * FROM track_measures")
    }


def test_statuses(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    conn = db(tmp_path)
    dz = FakeDeezer(
        {
            1: (dt(1, rank=700), URL),
            2: (dt(2), None),
            3: None,
            4: DeezerError("code 501"),
            5: (dt(5), URL),
        }
    )
    emb = FakeEmbedder()
    rep = measure_tracks(conn, dz, emb, "d")
    assert (rep.n_todo, rep.n_ok, rep.n_no_preview, rep.n_gone) == (5, 2, 1, 1)
    assert (rep.n_audio_failed, rep.errors) == (0, ["Knife — T (DeezerError)"])
    assert rows(conn) == {1: ("ok", 700), 2: ("no_preview", 500), 3: ("gone", None), 5: ("ok", 500)}
    blob = conn.execute("SELECT embedding, model FROM track_measures WHERE deezer_track_id = 1")
    b, model = blob.fetchone()
    assert np.array_equal(from_blob(b), VEC) and model == MODEL_TAG
    dump = "\n".join(conn.iterdump())
    assert "SIGNED-SECRET" not in dump and "SIGNED-SECRET" not in caplog.text
    dz._tracks[4] = (dt(4), URL)
    assert measure_tracks(conn, dz, emb, "d2").n_todo == 1


def test_failed_audio(tmp_path: Path) -> None:
    # Téléchargement refusé, puis audio illisible : deux bases d'un titre chacune.
    conn = db(tmp_path / "a", n=1)
    measure_tracks(conn, FakeDeezer({1: (dt(1), URL)}, fail_download=True), FakeEmbedder(), "d")
    conn2 = db(tmp_path / "b", n=1)
    measure_tracks(conn2, FakeDeezer({1: (dt(1), URL)}), FakeEmbedder(None), "d")
    assert rows(conn) == {1: ("audio_failed", 500)}
    assert rows(conn2) == {1: ("audio_failed", 500)}


def test_unavailable_commits_work_done(tmp_path: Path) -> None:
    conn = db(tmp_path, n=3)
    dz = FakeDeezer({1: (dt(1), URL), 2: (dt(2), None), 3: DeezerUnavailable("code 4")})
    with pytest.raises(DeezerUnavailable):
        measure_tracks(conn, dz, FakeEmbedder(), "d")
    assert set(rows(conn)) == {1, 2}
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_audio.py tests_radio/test_measure.py -q`
Expected: FAIL (`ModuleNotFoundError: radio.signals.audio`).

- [ ] **Step 3: Implémenter**

`pyproject.toml` : ajouter `"essentia-tensorflow==2.1b6.dev1389",` à `dependencies` (seule roue
cp312 manylinux x86_64 publiée), puis à la fin :

```toml
[[tool.mypy.overrides]]
module = ["essentia", "essentia.*"]
ignore_missing_imports = true
```

puis `uv lock && uv sync`.

`radio/core/config.py`, dans `Settings`, après `config_dir` :

```python
    effnet_model: Path = Field(
        default=REPO_ROOT / "models" / "discogs-effnet-bs64-1.pb",
        validation_alias="RADIO_EFFNET_MODEL",
    )
```

`radio/signals/audio.py` :

```python
"""Empreinte sonore Discogs-EffNet d'un extrait Deezer de 30 s (spec §5.3).

Chaîne officielle MTG (docs/superpowers/research/2026-09-23-essentia-effnet.md §1.1) : graphe
bs64, sortie PartitionedCall:1, MonoLoader à 16 kHz avec resampleQuality=4. Un seul MonoLoader,
reconfiguré à chaque extrait : en créer un par fichier produit des milliers d'avertissements (§4).
Pas de patchHopSize=128 : sur 30 s, les deux pas tiennent dans un seul lot de 64 patches, le pas
par défaut (62) ne coûte rien de plus. Vecteur de titre = moyenne des patches puis norme L2 :
convention maison, non documentée par MTG (§2).
"""

import hashlib
import os
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import numpy.typing as npt

MODEL_URL = (
    "https://essentia.upf.edu/models/feature-extractors/discogs-effnet/discogs-effnet-bs64-1.pb"
)
MODEL_SHA256 = "3ed9af50d5367c0b9c795b294b00e7599e4943244f4cbd376869f3bfc87721b1"
MODEL_TAG = "discogs-effnet-bs64-1/hop62/mean-l2"
DIM = 1280


class ModelError(Exception):
    """Modèle absent, ou différent du modèle officiel épinglé."""


def check_model(path: Path) -> None:
    if not path.is_file():
        raise ModelError(f"modèle absent : {path} (à télécharger depuis {MODEL_URL})")
    if hashlib.sha256(path.read_bytes()).hexdigest() != MODEL_SHA256:
        raise ModelError(f"somme de contrôle inattendue : {path}")


def to_blob(v: npt.NDArray[np.float32]) -> bytes:
    return np.asarray(v, dtype="<f4").tobytes()


def from_blob(b: bytes) -> npt.NDArray[np.float32]:
    return np.frombuffer(b, dtype="<f4").astype(np.float32)


class EffnetEmbedder:
    def __init__(self, model: Path) -> None:
        check_model(model)
        # Avant l'import : TensorFlow lit ces variables à la création de sa session. Un fil
        # chacun : sur cette machine partagée, le moins de CPU pour presque le même temps (§5.3).
        os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
        os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
        import essentia
        from essentia.standard import MonoLoader, TensorflowPredictEffnetDiscogs

        essentia.log.infoActive = False
        self._loader: Any = MonoLoader()
        self._net: Any = TensorflowPredictEffnetDiscogs(
            graphFilename=str(model), output="PartitionedCall:1"
        )

    def embed(self, data: bytes, suffix: str = ".mp3") -> npt.NDArray[np.float32] | None:
        """Vecteur unitaire de 1 280 valeurs, ou None si l'audio est illisible ou trop court."""
        with tempfile.NamedTemporaryFile(suffix=suffix) as f:
            f.write(data)
            f.flush()
            try:
                self._loader.configure(filename=f.name, sampleRate=16000, resampleQuality=4)
                audio = self._loader()
            except RuntimeError:
                return None
        if audio.size == 0:
            return None
        patches = self._net(audio)
        if patches.shape[0] == 0:
            return None
        v = np.asarray(patches, dtype=np.float32).mean(axis=0)
        norm = float(np.linalg.norm(v))
        if not np.isfinite(norm) or norm == 0.0:
            return None
        unit: npt.NDArray[np.float32] = (v / norm).astype(np.float32)
        return unit
```

Si `test_effnet_rejects_garbage` montre qu'Essentia lève un autre type que `RuntimeError` sur un
fichier illisible, attraper ce type précis (et seulement lui) et le dire dans le rapport.

`radio/signals/measure.py` :

```python
"""Mesure de chaque titre : rang Deezer et empreinte de l'extrait de 30 s (spec §5.3, §8).

L'URL d'extrait est demandée fraîche à Deezer juste avant le téléchargement (signée, elle expire).
Elle n'est ni stockée, ni journalisée, ni mise dans un message. Un titre sans extrait ou à
l'empreinte ratée n'est pas jugé ; il est compté. Deezer indisponible : le travail fait est
gardé, puis l'exception remonte.
"""

import logging
import sqlite3
from dataclasses import dataclass, field
from typing import Protocol

import numpy as np
import numpy.typing as npt

from radio.signals.audio import MODEL_TAG, to_blob
from radio.sources.deezer import DeezerClient, DeezerError

logger = logging.getLogger(__name__)


class Embedder(Protocol):
    def embed(self, data: bytes, suffix: str = ".mp3") -> npt.NDArray[np.float32] | None: ...


@dataclass
class MeasureReport:
    n_todo: int
    n_ok: int = 0
    n_no_preview: int = 0
    n_audio_failed: int = 0
    n_gone: int = 0
    errors: list[str] = field(default_factory=list)


def measure_tracks(
    conn: sqlite3.Connection,
    deezer: DeezerClient,
    embedder: Embedder,
    now: str,
    batch: int = 20,
) -> MeasureReport:
    todo = conn.execute(
        """
        SELECT t.deezer_track_id AS tid, t.title, a.name
        FROM tracks t JOIN artists a USING (deezer_artist_id)
        LEFT JOIN track_measures m USING (deezer_track_id)
        WHERE m.deezer_track_id IS NULL ORDER BY t.deezer_track_id
        """
    ).fetchall()
    rep = MeasureReport(n_todo=len(todo))
    rows: list[tuple[object, ...]] = []

    def flush() -> None:
        with conn:
            conn.executemany("INSERT INTO track_measures VALUES (?, ?, ?, ?, ?, ?)", rows)
        rows.clear()

    try:
        for i, r in enumerate(todo, 1):
            if i % 100 == 0:
                logger.info("measure: %d/%d tracks processed", i, len(todo))
            status: str
            rank: int | None = None
            blob: bytes | None = None
            try:
                got = deezer.track(r["tid"])
                if got is None:
                    status = "gone"
                else:
                    track, url = got
                    rank = track.rank
                    if url is None:
                        status = "no_preview"
                    else:
                        try:
                            vec = embedder.embed(deezer.download_preview(url))
                        except DeezerError:
                            vec = None
                        status = "ok" if vec is not None else "audio_failed"
                        blob = to_blob(vec) if vec is not None else None
            except DeezerError as e:
                rep.errors.append(f"{r['name']} — {r['title']} ({type(e).__name__})")
                continue
            rows.append((r["tid"], status, rank, blob, MODEL_TAG, now))
            if status == "ok":
                rep.n_ok += 1
            elif status == "no_preview":
                rep.n_no_preview += 1
            elif status == "audio_failed":
                rep.n_audio_failed += 1
            else:
                rep.n_gone += 1
            if len(rows) >= batch:
                flush()
    finally:
        flush()
    return rep
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe, **y compris** les deux tests `needs_model` (le contrôleur a placé le modèle ;
vérifier dans la sortie qu'ils ne sont pas « skipped »).

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml uv.lock radio/core/config.py radio/signals/audio.py \
  radio/signals/measure.py tests_radio/test_audio.py tests_radio/test_measure.py
git commit -m "feat(v3): empreinte EffNet des extraits Deezer et mesure des titres"
```

---

### Task 10: Les quatre signaux, calculés à la lecture

**Files:**
- Create: `radio/signals/popularity.py`, `radio/signals/culture.py`, `radio/signals/proximity.py`, `radio/signals/table.py`
- Test: `tests_radio/test_signal_values.py`, `tests_radio/test_signal_table.py`

**Interfaces:**
- Consumes: `library_artists`, `library_names` (Task 3), `normalize` (v3-1), `from_blob`, `DIM` (Task 9), tables `tracks`, `artists`, `track_measures`, `make_library` (Task 3).
- Produces :
  - `popularity(rank: int | None, nb_fan: int | None, listeners: int | None) -> tuple[float, float, float]` (log1p, absent = NaN) ;
  - `clean_tag(name) -> str`, `vocabulary(tag_lists: Iterable[list[tuple[str, int]]], size: int) -> list[str]`, `culture_vector(tags: list[tuple[str, int]] | None, vocab: list[str]) -> NDArray[float64]` ;
  - `proximity(self_id: int, self_names: set[str], similar: list[tuple[str, float]] | None, related: list[tuple[int, str]] | None, library_ids: set[int], library_names: frozenset[str]) -> tuple[float, float]` ;
  - `POPULARITY_COLUMNS = ("rang Deezer", "fans Deezer", "auditeurs Last.fm")`, `PROXIMITY_COLUMNS = ("match Last.fm", "sources")` ;
  - `SignalTable(track_ids, artist_ids, origins, audio (n, 1280) float32, popularity (n, 3), culture (n, V), proximity (n, 2), vocabulary)` avec `.missing_rates() -> dict[str, float]` ;
  - `load_signals(conn, vocab_size: int) -> SignalTable` : une ligne par titre mesuré `ok`, triée par id. C'est l'entrée du modèle (plan v3-3).

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_signal_values.py` :

```python
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
        83, {"m83"}, [("M83", 1.0), ("Wire", 0.6), ("Knife", 0.9)], [(83, "M83")], LIB_IDS, LIB_NAMES
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
```

`tests_radio/test_signal_table.py` :

```python
import json
import math
import sqlite3
from pathlib import Path

import numpy as np
import pytest

from radio.signals.audio import DIM, to_blob
from radio.signals.table import load_signals
from tests_radio.factories import make_library

VEC = np.full(DIM, 1 / np.sqrt(DIM), dtype=np.float32)


def fetched(conn: sqlite3.Connection, aid: int, name: str, **kw: object) -> None:
    conn.execute(
        """
        INSERT INTO artists (deezer_artist_id, name, fetched_at, nb_fan, deezer_related,
            lastfm_found, lastfm_listeners, lastfm_tags, lastfm_similar)
        VALUES (?, ?, 'd', ?, ?, 1, ?, ?, ?)
        ON CONFLICT (deezer_artist_id) DO UPDATE SET name = excluded.name,
            fetched_at = 'd', nb_fan = excluded.nb_fan, deezer_related = excluded.deezer_related,
            lastfm_found = 1, lastfm_listeners = excluded.lastfm_listeners,
            lastfm_tags = excluded.lastfm_tags, lastfm_similar = excluded.lastfm_similar
        """,
        (
            aid,
            name,
            kw["fans"],
            json.dumps(kw["related"]),
            kw["listeners"],
            json.dumps(kw["tags"]),
            json.dumps(kw["similar"]),
        ),
    )


def build(tmp_path: Path) -> sqlite3.Connection:
    conn = make_library(tmp_path)
    fetched(conn, 83, "M83", fans=100, listeners=1000, related=[[70, "Wire"]],
            tags=[["electronic", 100], ["french", 60]],
            similar=[["M83", 1.0], ["Knife", 0.8], ["Wire", 0.6]])
    fetched(conn, 1, "Knife", fans=10, listeners=None, related=[[83, "M83"]],
            tags=[["electronic", 100], ["swedish", 20]], similar=[["M83", 0.7]])
    conn.execute("INSERT INTO artists (deezer_artist_id, name) VALUES (9, 'Jul')")
    conn.executemany(
        "INSERT INTO tracks VALUES (?, ?, 'T', ?, ?, 'd')",
        [(101, 83, "library", "a"), (1, 1, "candidate", "b"), (2, 1, "candidate", "c"),
         (9, 9, "negative", "d")],
    )
    conn.executemany(
        "INSERT INTO track_measures VALUES (?, ?, ?, ?, 'm', 'd')",
        [(101, "ok", 700, to_blob(VEC)), (1, "ok", 50, to_blob(VEC)),
         (2, "no_preview", 5, None), (9, "ok", 0, to_blob(VEC))],
    )
    conn.commit()
    return conn


def test_load_signals(tmp_path: Path) -> None:
    t = load_signals(build(tmp_path), 10)
    assert t.track_ids.tolist() == [1, 9, 101]
    assert t.origins == ["candidate", "negative", "library"]
    assert t.audio.shape == (3, DIM)
    assert t.vocabulary == ["electronic", "french", "swedish"]
    knife, jul, m83 = 0, 1, 2
    assert t.popularity[knife, 0] == pytest.approx(math.log1p(50))
    assert np.isnan(t.popularity[knife, 2])
    assert t.culture[knife].tolist() == [1.0, 0.0, 0.2]
    assert t.proximity[knife].tolist() == [0.7, 2.0]
    assert t.proximity[m83].tolist() == [0.6, 2.0]
    assert t.popularity[jul, 0] == 0.0
    assert np.isnan(t.popularity[jul, 1:]).all()
    assert np.isnan(t.culture[jul]).all() and np.isnan(t.proximity[jul]).all()


def test_missing_rates(tmp_path: Path) -> None:
    rates = load_signals(build(tmp_path), 10).missing_rates()
    assert rates["rang Deezer"] == 0.0
    assert math.isclose(rates["auditeurs Last.fm"], 2 / 3)
    assert math.isclose(rates["culture"], 1 / 3)
    assert math.isclose(rates["match Last.fm"], 1 / 3)
```

Remarques pour l'implémenteur, à vérifier par ces tests :
- M83 est dans la bibliothèque : son propre nom dans ses similaires ne compte pas (artiste
  retiré) ; son meilleur lien est Wire (0,6). Last.fm et Deezer le relient tous deux à Wire :
  sources = 2, d'où `[0.6, 2.0]`.
- Le vocabulaire se calcule sur les artistes des titres `library` et `candidate` (pas `negative`), qu'ils soient mesurés ou non.

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_signal_values.py tests_radio/test_signal_table.py -q`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implémenter**

`radio/signals/popularity.py` :

```python
"""Popularité (spec §5.3) : rang du titre, fans Deezer et auditeurs Last.fm de l'artiste.

Chaque mesure passe par log(1 + x) ; une mesure absente vaut NaN.
"""

import math


def _log(x: int | None) -> float:
    return math.log1p(x) if x is not None else math.nan


def popularity(
    rank: int | None, nb_fan: int | None, listeners: int | None
) -> tuple[float, float, float]:
    return _log(rank), _log(nb_fan), _log(listeners)
```

`radio/signals/culture.py` :

```python
"""Culture (spec §5.3) : tags Last.fm de l'artiste sur un vocabulaire commun.

Vocabulaire : les `size` tags portés par le plus d'artistes (bibliothèque et candidats) ; à
égalité, l'ordre alphabétique. Poids d'un tag : son compte Last.fm divisé par le plus grand
compte de l'artiste. Un artiste sans tag a un vecteur entièrement absent (NaN).
"""

from collections import Counter
from collections.abc import Iterable

import numpy as np
import numpy.typing as npt


def clean_tag(name: str) -> str:
    return " ".join(name.casefold().split())


def vocabulary(tag_lists: Iterable[list[tuple[str, int]]], size: int) -> list[str]:
    counts: Counter[str] = Counter()
    for tags in tag_lists:
        counts.update({clean_tag(n) for n, _ in tags} - {""})
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [t for t, _ in ranked[:size]]


def culture_vector(
    tags: list[tuple[str, int]] | None, vocab: list[str]
) -> npt.NDArray[np.float64]:
    v = np.full(len(vocab), np.nan)
    if not tags:
        return v
    top = max(c for _, c in tags)
    if top <= 0:
        return v
    index = {t: i for i, t in enumerate(vocab)}
    v[:] = 0.0
    for name, count in tags:
        i = index.get(clean_tag(name))
        if i is not None:
            v[i] = max(v[i], count / top)
    return v
```

`radio/signals/proximity.py` :

```python
"""Proximité (spec §5.3) : lien d'un artiste avec la bibliothèque, en « artiste retiré ».

- plus grand `match` Last.fm avec un artiste de la bibliothèque autre que lui-même ; absent (NaN)
  si Last.fm ne donne aucun similaire, 0 si aucun similaire n'est de la bibliothèque ;
- nombre de sources (Deezer related, Last.fm similar) qui le relient à la bibliothèque : 0, 1, 2.

L'artiste lui-même ne compte jamais, même s'il est dans la bibliothèque : sinon l'absence de ce
lien trahirait les artistes de la bibliothèque.
"""

import math

from radio.library.match import normalize


def proximity(
    self_id: int,
    self_names: set[str],
    similar: list[tuple[str, float]] | None,
    related: list[tuple[int, str]] | None,
    library_ids: set[int],
    library_names: frozenset[str],
) -> tuple[float, float]:
    names = library_names - self_names
    ids = library_ids - {self_id}
    matches = [m for n, m in similar or [] if normalize(n) in names]
    best = (max(matches) if matches else 0.0) if similar else math.nan
    deezer_link = any(i in ids for i, _ in related or [])
    return best, float(int(deezer_link) + int(bool(matches)))
```

`radio/signals/table.py` :

```python
"""Table des signaux : une ligne par titre à l'empreinte réussie, quelle que soit son origine.

Tout se calcule ici, à la lecture, de la même façon pour la bibliothèque, les candidats et les
négatifs (spec §5.3). Un artiste pas encore lu a tous ses signaux absents (NaN).
"""

import json
import sqlite3
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from radio.library.artists import library_artists, library_names
from radio.library.match import normalize
from radio.signals.audio import DIM, from_blob
from radio.signals.culture import culture_vector, vocabulary
from radio.signals.popularity import popularity
from radio.signals.proximity import proximity

POPULARITY_COLUMNS = ("rang Deezer", "fans Deezer", "auditeurs Last.fm")
PROXIMITY_COLUMNS = ("match Last.fm", "sources")


@dataclass(frozen=True)
class SignalTable:
    track_ids: npt.NDArray[np.int64]
    artist_ids: npt.NDArray[np.int64]
    origins: list[str]
    audio: npt.NDArray[np.float32]
    popularity: npt.NDArray[np.float64]
    culture: npt.NDArray[np.float64]
    proximity: npt.NDArray[np.float64]
    vocabulary: list[str]

    def missing_rates(self) -> dict[str, float]:
        """Part des titres où chaque mesure est absente."""
        if len(self.track_ids) == 0:
            return {}
        out = {
            name: float(np.isnan(self.popularity[:, j]).mean())
            for j, name in enumerate(POPULARITY_COLUMNS)
        }
        out["culture"] = float(np.isnan(self.culture).all(axis=1).mean())
        out[PROXIMITY_COLUMNS[0]] = float(np.isnan(self.proximity[:, 0]).mean())
        return out


def _tags(raw: str | None) -> list[tuple[str, int]] | None:
    return None if raw is None else [(str(n), int(c)) for n, c in json.loads(raw)]


def load_signals(conn: sqlite3.Connection, vocab_size: int) -> SignalTable:
    lib = library_artists(conn)
    lib_ids = {a.deezer_artist_id for a in lib}
    lib_names = library_names(conn)
    plex_names = {a.deezer_artist_id: {normalize(n) for n in a.plex_names} for a in lib}
    artists = {
        r["deezer_artist_id"]: r
        for r in conn.execute("SELECT * FROM artists WHERE fetched_at IS NOT NULL")
    }
    vocab_ids = [
        r[0]
        for r in conn.execute(
            "SELECT DISTINCT deezer_artist_id FROM tracks WHERE origin != 'negative' ORDER BY 1"
        )
    ]
    vocab = vocabulary(
        (_tags(artists[a]["lastfm_tags"]) or [] for a in vocab_ids if a in artists), vocab_size
    )
    rows = conn.execute(
        """
        SELECT t.deezer_track_id AS tid, t.deezer_artist_id AS aid, t.origin, m.rank,
               m.embedding
        FROM tracks t JOIN track_measures m USING (deezer_track_id)
        WHERE m.status = 'ok' ORDER BY t.deezer_track_id
        """
    ).fetchall()
    n = len(rows)
    audio = np.zeros((n, DIM), dtype=np.float32)
    pop = np.full((n, len(POPULARITY_COLUMNS)), np.nan)
    cult = np.full((n, len(vocab)), np.nan)
    prox = np.full((n, len(PROXIMITY_COLUMNS)), np.nan)
    cache: dict[int, tuple[npt.NDArray[np.float64], tuple[float, float]]] = {}
    for i, r in enumerate(rows):
        audio[i] = from_blob(r["embedding"])
        a = artists.get(r["aid"])
        pop[i] = popularity(
            r["rank"],
            a["nb_fan"] if a is not None else None,
            a["lastfm_listeners"] if a is not None else None,
        )
        if a is None:
            continue
        if r["aid"] not in cache:
            similar = (
                None
                if a["lastfm_similar"] is None
                else [(str(s), float(m)) for s, m in json.loads(a["lastfm_similar"])]
            )
            related = [(int(x), str(y)) for x, y in json.loads(a["deezer_related"])]
            self_names = {normalize(a["name"])} | plex_names.get(r["aid"], set())
            cache[r["aid"]] = (
                culture_vector(_tags(a["lastfm_tags"]), vocab),
                proximity(r["aid"], self_names, similar, related, lib_ids, lib_names),
            )
        cult[i], prox[i] = cache[r["aid"]]
    return SignalTable(
        track_ids=np.array([r["tid"] for r in rows], dtype=np.int64),
        artist_ids=np.array([r["aid"] for r in rows], dtype=np.int64),
        origins=[r["origin"] for r in rows],
        audio=audio,
        popularity=pop,
        culture=cult,
        proximity=prox,
        vocabulary=vocab,
    )
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/signals/popularity.py radio/signals/culture.py radio/signals/proximity.py \
  radio/signals/table.py tests_radio/test_signal_values.py tests_radio/test_signal_table.py
git commit -m "feat(v3): popularité, culture et proximité calculées à la lecture, table des signaux"
```

---

### Task 11: Commande `radio signals` et essai de bout en bout

**Files:**
- Modify: `radio/cli.py`
- Test: `tests_radio/test_e2e_v3_2.py`, `tests_radio/test_cli.py` (ajout)

**Interfaces:**
- Consumes: tout ce qui précède : `register_library` (T3), `fetch_artists` (T8), `measure_tracks`, `EffnetEmbedder`, `ModelError` (T9), `load_signals`, `SignalTable` (T10), `_lastfm`, `_logging`, `_unavailable`, `_rng` (T6), `negatives-sync` (T7), `discover` (T6), `library-sync` (v3-1).
- Produces : `_embedder(settings) -> EffnetEmbedder`, `_rate(x: float) -> str`, `_signals_lines(reg, fetch, meas, table) -> list[str]`, commande `signals`.

- [ ] **Step 1: Écrire les tests qui échouent**

`tests_radio/test_e2e_v3_2.py` (mini-bibliothèque, toutes les commandes enchaînées, services
simulés) :

```python
import logging
import sqlite3
from pathlib import Path

import numpy as np
import numpy.typing as npt
import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.sources.deezer import DeezerArtist, DeezerTrack
from radio.sources.lastfm import ArtistInfo, SimilarArtist, Tag
from radio.sources.plex import PlexTrack

runner = CliRunner()
SIGNED = "https://cdnt-preview.dzcdn.net/x.mp3?hdnea=SIGNED-SECRET"
KEY = "k3y-SECRET-lastfm"

ARTISTS = {
    83: DeezerArtist(83, "M83", 5000),
    70: DeezerArtist(70, "Wire", 800),
    1: DeezerArtist(1, "The Knife", 900),
    2: DeezerArtist(2, "The Fall", 300),
    900: DeezerArtist(900, "Jul", 9000),
}
LIB = [
    DeezerTrack(101, "Midnight City", "Midnight City", 243, 900, 83, "M83", True),
    DeezerTrack(104, "Mannequin", "Mannequin", 157, 300, 70, "Wire", True),
]
TOP = {
    1: [
        DeezerTrack(11, "Heartbeats", "Heartbeats", 200, 800, 1, "The Knife", True),
        DeezerTrack(12, "Silent Shout", "Silent Shout", 200, 700, 1, "The Knife", True),
        DeezerTrack(13, "Heartbeats (Remastered)", "Heartbeats", 200, 600, 1, "The Knife", True),
        DeezerTrack(14, "Collab", "Collab", 200, 500, 99, "Other", True),
    ],
    2: [DeezerTrack(21, "Totally Wired", "Totally Wired", 200, 400, 2, "The Fall", True)],
    900: [DeezerTrack(901, "Tchikita", "Tchikita", 200, 950, 900, "Jul", True)],
}
RELATED = {
    83: [ARTISTS[1], ARTISTS[70]],
    70: [ARTISTS[1], ARTISTS[2]],
    1: [ARTISTS[83]],
    2: [ARTISTS[70]],
    900: [],
}
SIMILAR = {
    "M83": [SimilarArtist("Knife", 0.9)],
    "Wire": [SimilarArtist("The Fall", 0.8), SimilarArtist("The Knife", 0.5)],
    "The Knife": [SimilarArtist("M83", 0.7)],
    "The Fall": [SimilarArtist("Wire", 0.6)],
}


class World:
    """Deezer et Last.fm simulés : une seule instance sert les deux clients."""

    def search_tracks(self, query: str, limit: int = 10) -> list[DeezerTrack]:
        return [t for t in LIB if t.artist_name in query and t.title in query]

    def related(self, artist_id: int) -> list[DeezerArtist]:
        return RELATED.get(artist_id, [])

    def top(self, artist_id: int, limit: int = 10) -> list[DeezerTrack]:
        return TOP.get(artist_id, [])

    def artist(self, artist_id: int) -> DeezerArtist | None:
        return ARTISTS.get(artist_id)

    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None:
        every = LIB + [t for ts in TOP.values() for t in ts]
        t = next(x for x in every if x.id == track_id)
        return t, (None if track_id == 21 else SIGNED)

    def download_preview(self, url: str) -> bytes:
        return b"mp3"

    def similar_artists(self, artist: str, limit: int = 100) -> list[SimilarArtist]:
        return SIMILAR.get(artist, [])

    def artist_info(self, artist: str) -> ArtistInfo | None:
        return None if artist == "Jul" else ArtistInfo(artist, 1000)

    def artist_top_tags(self, artist: str) -> list[Tag]:
        return [Tag("electronic", 100)] if artist != "Wire" else [Tag("post-punk", 100)]


class Embedder:
    def embed(self, data: bytes, suffix: str = ".mp3") -> npt.NDArray[np.float32]:
        return np.full(1280, 1 / np.sqrt(1280), dtype=np.float32)


@pytest.fixture
def world(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text("[library]\nduration_tolerance_s = 3\n")
    (cfg / "negatives.toml").write_text(
        '[[artist]]\nname = "Jul"\ndeezer_id = 900\ncategory = "commercial_fr"\n'
    )
    settings = Settings(
        _env_file=None,
        plex_token="tok",
        plex_music_section="Musique",
        lastfm_api_key=KEY,
        RADIO_DATA_DIR=tmp_path / "data",
        RADIO_CONFIG_DIR=cfg,
    )
    w = World()
    plex = [
        PlexTrack("1", "M83", "Midnight City", "Hurry Up", 243000, 10),
        PlexTrack("2", "Wire", "Mannequin", "Pink Flag", 157000, 1),
    ]

    class Plex:
        def tracks(self) -> list[PlexTrack]:
            return plex

    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr(cli, "_plex", lambda s: Plex())
    monkeypatch.setattr(cli, "_deezer", lambda: w)
    monkeypatch.setattr(cli, "_lastfm", lambda s: w)
    monkeypatch.setattr(cli, "_rng", lambda: np.random.default_rng(0))
    monkeypatch.setattr(cli, "_embedder", lambda s: Embedder())
    return tmp_path


def test_end_to_end(world: Path, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    outputs = []
    for command in ("library-sync", "negatives-sync", "discover", "signals"):
        res = runner.invoke(cli.app, [command])
        assert res.exit_code == 0, (command, res.output)
        outputs.append(res.output)
    out = "\n".join(outputs)
    assert "Couverture : 2 / 2 titres rapprochés (100,0 %)" in out
    assert "→ 1 titres ajoutés" in out
    assert "2 graines → 2 voisins, 5 titres vus → 3 ajoutés, 1 doublons, 1 écartés" in out
    assert "Bibliothèque inscrite : 2 titres, 2 artistes (0 retirés)" in out
    assert "Artistes : 5 à lire → 5 lus, 0 introuvables sur Deezer, 0 sautés" in out
    assert "Titres : 6 à mesurer → 5 mesurés, 1 sans extrait" in out
    assert "Signaux prêts : 5 titres (bibliothèque 2, candidats 2, négatifs 1)" in out
    conn = sqlite3.connect(world / "data" / "radio.db")
    candidates_from_library = conn.execute(
        "SELECT COUNT(*) FROM tracks WHERE origin = 'candidate' AND deezer_artist_id IN (83, 70)"
    ).fetchone()[0]
    assert candidates_from_library == 0
    assert conn.execute("SELECT status FROM discover_runs").fetchone()[0] == "done"
    dump = "\n".join(conn.iterdump())
    for secret in ("SIGNED-SECRET", KEY):
        assert secret not in out and secret not in caplog.text and secret not in dump
```

Comptes attendus, pour l'implémenteur :
- découverte : graines M83 et Wire ; voisins The Knife (Deezer 83→1, Last.fm « Knife ») et The Fall (Deezer 70→2, Last.fm « The Fall ») ; titres vus 4 + 1 = 5 ; écarté 14 (pas l'artiste principal) ; doublon 13 ; ajoutés 11, 12, 21 ;
- mesure : 2 (bibliothèque) + 3 (candidats) + 1 (négatif) = 6 ; 21 sans extrait ; 5 mesurés ;
- artistes lus : 83, 70, 1, 2, 900 = 5 ; Jul inconnu de Last.fm (culture et proximité absentes).

Dans `tests_radio/test_cli.py`, ajouter (importer `from radio.signals.audio import ModelError`) :

```python
def test_signals_refuses_a_bad_model(env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def bad(settings: Settings) -> object:
        raise ModelError("somme de contrôle inattendue : m.pb")

    monkeypatch.setattr(cli, "_lastfm", lambda s: object())
    monkeypatch.setattr(cli, "_embedder", bad)
    res = runner.invoke(cli.app, ["signals"])
    assert res.exit_code == 2
    assert "Modèle EffNet refusé : somme de contrôle inattendue" in res.output
```

- [ ] **Step 2: Lancer les tests, constater l'échec**

Run: `uv run pytest tests_radio/test_e2e_v3_2.py tests_radio/test_cli.py -q`
Expected: FAIL (`No such command 'signals'`, `module 'radio.cli' has no attribute '_embedder'`).

- [ ] **Step 3: Implémenter**

Dans `radio/cli.py`, imports à ajouter : `from collections import Counter`,
`from radio.library.artists import RegisterReport, register_library`,
`from radio.signals.artists import FetchReport, fetch_artists`,
`from radio.signals.audio import EffnetEmbedder, ModelError`,
`from radio.signals.measure import MeasureReport, measure_tracks`,
`from radio.signals.table import SignalTable, load_signals`. Puis :

```python
def _embedder(settings: Settings) -> EffnetEmbedder:
    return EffnetEmbedder(settings.effnet_model)


def _rate(x: float) -> str:
    return f"{100 * x:.1f} %".replace(".", ",")


def _signals_lines(
    reg: RegisterReport, fetch: FetchReport, meas: MeasureReport, table: SignalTable
) -> list[str]:
    lines = [
        f"Bibliothèque inscrite : {_n(reg.n_tracks)} titres, {_n(reg.n_artists)} artistes "
        f"({_n(reg.n_removed)} retirés)",
        f"Artistes : {_n(fetch.n_todo)} à lire → {_n(fetch.n_fetched)} lus, "
        f"{_n(len(fetch.not_on_deezer))} introuvables sur Deezer, {_n(len(fetch.skipped))} sautés",
        f"Titres : {_n(meas.n_todo)} à mesurer → {_n(meas.n_ok)} mesurés, "
        f"{_n(meas.n_no_preview)} sans extrait, {_n(meas.n_audio_failed)} empreinte ratée, "
        f"{_n(meas.n_gone)} disparus de Deezer, {_n(len(meas.errors))} en erreur",
    ]
    lines += [f"  introuvable : {x}" for x in fetch.not_on_deezer]
    lines += [f"  sauté : {x}" for x in fetch.skipped]
    lines += [f"  erreur : {x}" for x in meas.errors]
    by_origin = Counter(table.origins)
    lines.append(
        f"Signaux prêts : {_n(len(table.origins))} titres (bibliothèque "
        f"{_n(by_origin['library'])}, candidats {_n(by_origin['candidate'])}, négatifs "
        f"{_n(by_origin['negative'])})"
    )
    rates = table.missing_rates()
    if rates:
        lines.append(
            "Valeurs absentes : " + ", ".join(f"{k} {_rate(v)}" for k, v in rates.items())
        )
    return lines


@app.command()
def signals() -> None:
    """Mesure les signaux de tous les titres connus (bibliothèque, candidats, négatifs)."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    lastfm = _lastfm(settings)
    try:
        embedder = _embedder(settings)
    except ModelError as e:
        _fail(f"Modèle EffNet refusé : {e}", 2)
    now = datetime.now(UTC).isoformat()
    deezer = _deezer()
    conn = connect(settings.data_dir / "radio.db")
    try:
        reg = register_library(conn, now)
        fetch = fetch_artists(
            conn, deezer, lastfm, editorial.discover.lastfm_similar_limit, now
        )
        meas = measure_tracks(conn, deezer, embedder, now)
        table = load_signals(conn, editorial.signals.culture_vocabulary)
    except (DeezerUnavailable, LastfmUnavailable) as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    for line in _signals_lines(reg, fetch, meas, table):
        typer.echo(line)
```

- [ ] **Step 4: Lancer les tests**

Run: `uv run pytest -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add radio/cli.py tests_radio/test_e2e_v3_2.py tests_radio/test_cli.py
git commit -m "feat(v3): commande radio signals et essai de bout en bout v3-2"
```

---

### Task 12: Essai réel (contrôleur, pas de sous-agent)

Après la revue finale de la branche. Aucune donnée existante n'est supprimée.

- [ ] **Step 1:** `uv sync`, puis `uv run pytest -q` : tout passe, tests EffNet réels compris.
- [ ] **Step 2:** `uv run radio library-sync > data/library-sync-3.log 2>&1` : rafraîchit Plex ; les rapprochements déjà faits sont gardés.
- [ ] **Step 3:** `uv run radio negatives-sync > data/negatives-sync-1.log 2>&1` : 324 artistes, ≈ 3 000 titres attendus.
- [ ] **Step 4:** `uv run radio discover > data/discover-1.log 2>&1` : 15 graines.
- [ ] **Step 5:** `nice -n 19 uv run radio signals > data/signals-1.log 2>&1` en arrière-plan. Durée estimée : ≈ 15 000 titres × 3 s ≈ 12 à 13 h, plus ≈ 1 500 artistes × 1 s. La commande reprend là où elle s'est arrêtée si elle est relancée.
- [ ] **Step 6:** vérifier qu'aucun secret n'apparaît : `grep -c -i -E 'token|api_key|dzcdn|hdnea' data/*.log` doit donner 0 partout.
- [ ] **Step 7:** compte rendu à Victor, en français : graines tirées, voisins, candidats, négatifs, titres mesurés par origine, valeurs absentes par signal, artistes sautés ou introuvables.
