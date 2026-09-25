# Plan v3-3 — Le modèle — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** entraîner le modèle empilé du goût (note audio puis décision), le juger sur les votes,
ne le mettre en service que s'il fait au moins aussi bien que le modèle courant, et noter les
candidats. Deux commandes : `radio votes-import` (reprise unique du banc d'écoute du 2026-09-24)
et `radio train`.

**Architecture :**
- Étiquettes :
  - `build_labels` lit les votes (table `votes`) et l'origine des titres, puis produit un jeu
    d'entraînement (bibliothèque, « oui », « non », négatifs faibles) et un jeu d'examen.
  - Les votes d'examen n'entrent jamais dans l'entraînement.
- Modèle empilé :
  - une régression logistique sur l'empreinte standardisée donne la note audio, calculée hors pli
    pour le second étage ;
  - un `HistGradientBoostingClassifier` décide à partir de cette note et des autres signaux.
- Validation croisée :
  - groupée par nom d'artiste normalisé, stratifiée par catégorie d'exemple ;
  - l'évaluation est **imbriquée** : chaque pli externe est noté par un empilement entier ajusté
    sans lui.
- `train_model` :
  - choisit le poids des négatifs faibles et fait l'ablation, sur les votes de leçon ;
  - choisit le seuil (précision ≥ 0,90 sur les votes de leçon) ;
  - mesure le garde-fou (bibliothèque en « artiste retiré »).
- `promote` :
  - compare le nouveau modèle au modèle en service sur les votes d'examen ;
  - historise chaque entraînement (table `models` + fichier joblib) ;
  - note les candidats avec le modèle en service (table `scores`).

**Tech Stack :**
- Tout ce que v3-2 utilise : Python 3.12, uv, typer, pydantic 2, sqlite3 STRICT, numpy,
  essentia-tensorflow.
- En plus : scikit-learn `>=1.9`, scipy `>=1.18` (intervalle de Wilson : `binomtest(...).proportion_ci(method="wilson")`)
  et joblib `>=1.6`. Ces trois API ont été vérifiées le 2026-09-25 dans un environnement jetable :
  scikit-learn 1.9.1, scipy 1.18.1, joblib 1.6.0.

**Spec :** `docs/superpowers/specs/2026-09-24-gout-decouverte-v3-design.md` (§5.4, §6.1 reprise des
votes, §7, §8). Points de revue à neutraliser : `docs/superpowers/research/2026-09-25-revue-finale-v3-2-pour-v3-3.md`.

## Global Constraints

- **Secrets et données personnelles.**
  - Plex reste en lecture seule.
  - Le disque « MUSIC MAËL » (`/media/musique`) ne se lit, ne se liste et ne se référence jamais.
  - La section Plex « Musique second wave » ne s'utilise jamais.
  - Aucun secret dans les journaux, messages, exceptions, tests ou commits : jeton Plex, clé
    Last.fm, **URL d'extraits Deezer signées**. `DeezerClient.track()` renvoie une URL d'extrait :
    elle n'est ni gardée, ni journalisée, ni stockée.
- **Rien de silencieux.**
  - Un repli silencieux est pire qu'une panne : tout ce qui est sauté est compté et nommé dans le
    rapport.
  - Un vote n'est jamais perdu. Un vote sans signaux est compté.
- **Les votes jugent (spec §5.4, §7).**
  - Seuls les votes d'examen jugent un modèle, et ils ne servent **jamais** à l'entraînement.
  - Le poids des négatifs faibles, le seuil et l'ablation se choisissent sur les votes de leçon,
    notés hors pli.
  - « Passer » est ignoré.
- **Validation croisée.**
  - Elle est groupée par **nom d'artiste Deezer normalisé** (`SignalTable.artist_keys`), jamais
    par id Deezer : un artiste Plex peut avoir plusieurs pages Deezer.
  - Graine fixe `0` pour tout le hasard (plis, modèles) : deux entraînements sur les mêmes données
    donnent le même modèle.
- **Vocabulaire de culture.** Il est figé avec le modèle. Un modèle ne note jamais une table dont
  le vocabulaire diffère du sien : il lève une `ValueError`, pas de décalage silencieux de colonnes.
- **Code et typage.**
  - Pas d'usine à gaz : scikit-learn fait le travail. Aucun algorithme maison là où une fonction
    existe (`cross_val_predict`, `StratifiedGroupKFold`, `roc_auc_score`, `binomtest`).
  - scikit-learn, scipy et joblib n'ont pas de marqueur `py.typed` : ils sont déclarés dans
    `[[tool.mypy.overrides]]` avec `ignore_missing_imports`. Toute valeur qui en sort et qu'on
    renvoie passe par `np.asarray(..., dtype=np.float64)` ou `float(...)`, sinon mypy strict signale
    `Returning Any`.
- **Langue.** Commentaires, docstrings et messages utilisateur en français. Journaux en anglais
  (convention existante). Commits en français.
- **Périmètre des fichiers.** Implémenteurs : ne jamais toucher `data/`, `.env`,
  `/home/victormoi/radio/pipeline` (production) ; `models/` est en lecture seule. Les modèles
  entraînés vont dans `<data_dir>/models/`, ignoré par git.
- **Vérifications vertes avant chaque commit :** `uv run pytest tests_radio -q`, `uv run mypy`,
  `uv run ruff check . && uv run ruff format --check .`
- **Fin de chaque message de commit :**
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY
  ```

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `radio/core/migrations/003_model.sql` | tables `votes`, `models`, `scores` |
| `radio/core/config.py` | `ModelConfig` (section `[model]` de `editorial.toml`) |
| `radio/signals/table.py` | vocabulaire figé, `artist_keys`, valeurs absentes par origine |
| `radio/votes/importer.py` | lecture du banc et import des votes |
| `radio/model/evaluate.py` | AUC, seuil de précision, précision à taux fixé, Wilson |
| `radio/model/dataset.py` | étiquettes, poids, jeu d'examen |
| `radio/model/stack.py` | modèle empilé, plis, notes hors pli imbriquées |
| `radio/model/train.py` | poids des négatifs faibles, ablation, seuil, garde-fou |
| `radio/model/promote.py` | examen, décision, historique, notes des candidats |
| `radio/cli.py` | commandes `votes-import` et `train` |
| `tests_radio/model_factory.py` | base de démonstration partagée par les tests du modèle |

---

### Task 1 : Dépendances, migration 003, section `[model]`

**Files:**
- Modify: `pyproject.toml` (dépendances, overrides mypy)
- Create: `radio/core/migrations/003_model.sql`
- Modify: `radio/core/config.py` (ajout `ModelConfig`, champ `Editorial.model`)
- Modify: `config/editorial.toml` (section `[model]`)
- Modify: `tests_radio/test_core.py:15,24` et `tests_radio/test_schema_v3_2.py:25` (version de schéma)
- Create: `tests_radio/test_schema_v3_3.py`

**Interfaces:**
- Consumes : `radio.core.db.connect`, `radio.core.config.load_editorial`.
- Produces :
  - tables `votes(deezer_track_id, kind, vote, voted_at, source)`,
    `models(model_id, trained_at, file, threshold, promoted, verdict, params, metrics)` et
    `scores(deezer_track_id, model_id, score, accepted)` ;
  - `ModelConfig` avec les champs `target_precision: float`, `library_acceptance_min: float`,
    `candidate_acceptance_alert: float`, `exam_window: int`, `min_votes_per_class: int` et
    `folds: int` ;
  - `Editorial.model: ModelConfig`.

- [ ] **Step 1 : dépendances**

Run : `uv add "scikit-learn>=1.9" "scipy>=1.18" "joblib>=1.6"`

Puis, dans `pyproject.toml`, remplacer le bloc d'override mypy existant par :

```toml
[[tool.mypy.overrides]]
module = ["essentia", "essentia.*", "sklearn", "sklearn.*", "scipy", "scipy.*", "joblib"]
ignore_missing_imports = true
```

- [ ] **Step 2 : écrire les tests qui échouent**

`tests_radio/test_schema_v3_3.py` :

```python
import sqlite3
from pathlib import Path

import pytest
from pydantic import ValidationError

from radio.core.config import load_editorial
from radio.core.db import connect


def test_migration_003_creates_tables(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 3
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"votes", "models", "scores"} <= names


def test_a_vote_survives_without_its_track(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    # Pas de clé étrangère : un vote ne se perd jamais, même si son titre quitte `tracks`.
    conn.execute("INSERT INTO votes VALUES (999, 'exam', 'oui', '2026-09-24', 'banc')")
    assert conn.execute("SELECT COUNT(*) FROM votes").fetchone()[0] == 1


@pytest.mark.parametrize(
    "row",
    [
        (1, "examen", "oui", "d", "s"),
        (1, "exam", "passe", "d", "s"),
    ],
)
def test_vote_values_are_checked(tmp_path: Path, row: tuple[object, ...]) -> None:
    conn = connect(tmp_path / "radio.db")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO votes VALUES (?, ?, ?, ?, ?)", row)


def test_a_promoted_model_has_a_threshold(tmp_path: Path) -> None:
    conn = connect(tmp_path / "radio.db")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO models (trained_at, file, threshold, promoted, verdict, params, metrics)"
            " VALUES ('d', 'f', NULL, 1, 'v', '{}', '{}')"
        )


def test_model_config(tmp_path: Path) -> None:
    path = tmp_path / "editorial.toml"
    path.write_text("[model]\nmin_votes_per_class = 3\nfolds = 3\n")
    m = load_editorial(path).model
    assert (m.min_votes_per_class, m.folds) == (3, 3)
    assert (m.target_precision, m.library_acceptance_min) == (0.90, 0.80)
    assert (m.candidate_acceptance_alert, m.exam_window) == (0.10, 60)
    path.write_text("[model]\nfolds = 2\n")
    with pytest.raises(ValidationError):
        load_editorial(path)
```

- [ ] **Step 3 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_schema_v3_3.py -q`
Expected : FAIL (`user_version` vaut 2, `Editorial` n'a pas de champ `model`).

- [ ] **Step 4 : la migration**

`radio/core/migrations/003_model.sql` :

```sql
-- Votes de Victor (spec §6). Pas de clé étrangère vers `tracks` : un vote ne se perd jamais,
-- même si son titre quitte la table (titre retiré de Plex). Un vote sans signaux est compté.
CREATE TABLE votes (
    deezer_track_id INTEGER PRIMARY KEY,
    kind            TEXT NOT NULL CHECK (kind IN ('exam', 'lesson')),
    vote            TEXT NOT NULL CHECK (vote IN ('oui', 'non', 'passer')),
    voted_at        TEXT NOT NULL,
    source          TEXT NOT NULL
) STRICT;

-- Historique des entraînements (spec §7.4) : une ligne par entraînement, promu ou non.
-- `file` : nom du fichier joblib dans <data_dir>/models/. Le modèle en service est le dernier
-- promu.
CREATE TABLE models (
    model_id   INTEGER PRIMARY KEY,
    trained_at TEXT NOT NULL,
    file       TEXT NOT NULL,
    threshold  REAL CHECK (threshold IS NULL OR (threshold >= 0 AND threshold <= 1)),
    promoted   INTEGER NOT NULL CHECK (promoted IN (0, 1)),
    verdict    TEXT NOT NULL,
    params     TEXT NOT NULL,
    metrics    TEXT NOT NULL,
    CHECK (promoted = 0 OR threshold IS NOT NULL)
) STRICT;

-- Notes des candidats par le modèle en service ; remplacées à chaque entraînement.
CREATE TABLE scores (
    deezer_track_id INTEGER PRIMARY KEY REFERENCES tracks (deezer_track_id) ON DELETE CASCADE,
    model_id        INTEGER NOT NULL REFERENCES models (model_id),
    score           REAL NOT NULL CHECK (score >= 0 AND score <= 1),
    accepted        INTEGER NOT NULL CHECK (accepted IN (0, 1))
) STRICT;
```

- [ ] **Step 5 : la configuration**

Dans `radio/core/config.py`, ajouter après `SignalsConfig` :

```python
class ModelConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # Précision visée sur les votes de leçon : fixe le seuil d'acceptation (spec §5.4.5).
    target_precision: float = Field(default=0.90, gt=0, lt=1)
    # Garde-fou de sévérité : part minimale de la bibliothèque acceptée (spec §7.3).
    library_acceptance_min: float = Field(default=0.80, gt=0, lt=1)
    # Alerte si une fournée de candidats est acceptée sous ce taux (spec §7.3).
    candidate_acceptance_alert: float = Field(default=0.10, gt=0, lt=1)
    # Fenêtre des derniers votes d'examen qui jugent (spec §7.2).
    exam_window: int = Field(default=60, ge=10, le=1000)
    # En dessous, par classe (« oui », « non ») : pas de seuil, pas d'ablation, pas de promotion.
    min_votes_per_class: int = Field(default=10, ge=2, le=1000)
    folds: int = Field(default=5, ge=3, le=10)
```

et dans `Editorial` : `model: ModelConfig = ModelConfig()`.

Ajouter à la fin de `config/editorial.toml` :

```toml

[model]
# Précision visée sur les votes de leçon : fixe le seuil d'acceptation.
target_precision = 0.90
# Garde-fou : part minimale des titres de la bibliothèque acceptés (artiste retiré).
library_acceptance_min = 0.80
# Alerte si une fournée de candidats est acceptée sous ce taux.
candidate_acceptance_alert = 0.10
# Nombre de derniers votes d'examen qui jugent le modèle.
exam_window = 60
# Minimum de « oui » et de « non » de leçon pour choisir un seuil et promouvoir un modèle.
min_votes_per_class = 10
# Plis de la validation croisée groupée par artiste.
folds = 5
```

- [ ] **Step 6 : version de schéma dans les tests existants**

Dans `tests_radio/test_core.py`, les deux assertions `== 2` des tests
`test_connect_applies_migrations` et `test_connect_is_idempotent` passent à `== 3`. Dans
`tests_radio/test_schema_v3_2.py`, l'assertion `== 2` de `test_migration_002_creates_tables`
devient `>= 2` : ce test vérifie la migration 002, pas la dernière.

- [ ] **Step 7 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 8 : commit**

```bash
git add pyproject.toml uv.lock radio/core/migrations/003_model.sql radio/core/config.py \
  config/editorial.toml tests_radio/test_core.py tests_radio/test_schema_v3_2.py \
  tests_radio/test_schema_v3_3.py
git commit -m "v3-3 : tables votes, models, scores et section [model]

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 2 : Table des signaux — vocabulaire figé, groupes d'artistes, absences par origine

Revue v3-2, points 2, 4 et 5 : le vocabulaire de culture se fige avec le modèle. Les groupes de
validation croisée prennent le nom d'artiste normalisé. Les valeurs absentes se rapportent par
origine.

**Files:**
- Modify: `radio/signals/table.py`
- Modify: `radio/cli.py` (`_signals_lines` : absences par origine ; nouveaux `_ORIGINS`, `_missing_lines`)
- Modify: `tests_radio/test_signal_table.py`
- Modify: `tests_radio/test_e2e_v3_2.py` (une assertion)

**Interfaces:**
- Consumes : `radio.library.match.normalize`.
- Produces :
  - `load_signals(conn, vocab_size: int, vocabulary: list[str] | None = None) -> SignalTable` :
    quand `vocabulary` est donné, il est utilisé tel quel et `vocab_size` est ignoré ;
  - `SignalTable.artist_keys: list[str]` : nom Deezer normalisé de l'artiste, ou `#<id>` si la
    normalisation est vide ;
  - `SignalTable.missing_rates_by_origin() -> dict[str, dict[str, float]]`, avec les clés
    d'origine triées ;
  - dans `radio/cli.py` : `_ORIGINS: dict[str, str]` et `_missing_lines(table: SignalTable) -> list[str]`.

- [ ] **Step 1 : écrire les tests qui échouent**

Dans `tests_radio/test_signal_table.py`, compléter `test_load_signals` par :

```python
    assert t.artist_keys == ["knife", "jul", "m83"]
```

et ajouter :

```python
def test_load_signals_with_a_frozen_vocabulary(tmp_path: Path) -> None:
    t = load_signals(build(tmp_path), 10, vocabulary=["swedish", "rock"])
    assert t.vocabulary == ["swedish", "rock"]
    assert t.culture[0].tolist() == [0.2, 0.0]
    assert np.isnan(t.culture[1]).all()


def test_artist_key_falls_back_to_the_id(tmp_path: Path) -> None:
    conn = build(tmp_path)
    conn.execute("UPDATE artists SET name = '!!!' WHERE deezer_artist_id = 9")
    conn.commit()
    assert load_signals(conn, 10).artist_keys[1] == "#9"


def test_missing_rates_by_origin(tmp_path: Path) -> None:
    rates = load_signals(build(tmp_path), 10).missing_rates_by_origin()
    assert list(rates) == ["candidate", "library", "negative"]
    assert rates["candidate"]["auditeurs Last.fm"] == 1.0
    assert rates["library"]["auditeurs Last.fm"] == 0.0
    assert rates["negative"]["culture"] == 1.0
```

Dans `tests_radio/test_e2e_v3_2.py`, après l'assertion `"Signaux prêts : 5 titres …" in out`,
ajouter :

```python
    assert "Valeurs absentes (bibliothèque) : " in out
```

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_signal_table.py tests_radio/test_e2e_v3_2.py -q`
Expected : FAIL (`artist_keys`, `vocabulary`, `missing_rates_by_origin` inconnus).

Vérifier d'abord que `normalize("!!!")` renvoie bien `""` :
`uv run python -c "from radio.library.match import normalize; print(repr(normalize('!!!')))"`.
Si ce n'est pas le cas, prendre pour ce test un nom dont la normalisation est vide et le signaler
dans le rapport.

- [ ] **Step 3 : implémenter**

Dans `radio/signals/table.py` :

1. Importer `numpy.typing` (déjà fait) et garder les imports existants.
2. Ajouter le champ `artist_keys: list[str]` juste après `artist_ids` dans `SignalTable`, puis
   remplacer `missing_rates` par :

```python
    def missing_rates(self) -> dict[str, float]:
        """Part des titres où chaque mesure est absente."""
        return self._rates(np.ones(len(self.track_ids), dtype=bool))

    def missing_rates_by_origin(self) -> dict[str, dict[str, float]]:
        """Idem, par origine : les absences corrélées à l'origine sont une fuite possible."""
        origins = np.array(self.origins)
        return {o: self._rates(origins == o) for o in sorted(set(self.origins))}

    def _rates(self, mask: npt.NDArray[np.bool_]) -> dict[str, float]:
        if not mask.any():
            return {}
        out = {
            name: float(np.isnan(self.popularity[mask, j]).mean())
            for j, name in enumerate(POPULARITY_COLUMNS)
        }
        out["culture"] = float(np.isnan(self.culture[mask]).all(axis=1).mean())
        out[PROXIMITY_COLUMNS[0]] = float(np.isnan(self.proximity[mask, 0]).mean())
        return out
```

3. Changer la signature et le calcul du vocabulaire :

```python
def load_signals(
    conn: sqlite3.Connection, vocab_size: int, vocabulary: list[str] | None = None
) -> SignalTable:
    """Tous les titres mesurés. `vocabulary` fige les colonnes de culture (celles d'un modèle
    entraîné) ; sans lui, le vocabulaire est recalculé sur la bibliothèque et les candidats."""
```

Le bloc `vocab_ids = …` / `vocab = vocabulary(...)` devient :

```python
    if vocabulary is not None:
        vocab = list(vocabulary)
    else:
        vocab_ids = [
            r[0]
            for r in conn.execute(
                "SELECT DISTINCT deezer_artist_id FROM tracks WHERE origin != 'negative' ORDER BY 1"
            )
        ]
        vocab = build_vocabulary(
            (_tags(artists[a]["lastfm_tags"]) or [] for a in vocab_ids if a in artists),
            vocab_size,
        )
```

L'import existant `from radio.signals.culture import culture_vector, vocabulary` devient
`from radio.signals.culture import culture_vector, vocabulary as build_vocabulary`, pour que le
paramètre `vocabulary` ne masque pas la fonction. Laisser ruff choisir la mise en forme de l'import.

4. Dans la requête des titres, joindre le nom d'artiste :

```python
    rows = conn.execute(
        """
        SELECT t.deezer_track_id AS tid, t.deezer_artist_id AS aid, t.origin, m.rank,
               m.embedding, a.name AS aname
        FROM tracks t JOIN track_measures m USING (deezer_track_id)
             JOIN artists a ON a.deezer_artist_id = t.deezer_artist_id
        WHERE m.status = 'ok' AND m.model = ? ORDER BY t.deezer_track_id
        """,
        (MODEL_TAG,),
    ).fetchall()
```

5. Dans le `return SignalTable(...)`, après `artist_ids=…` :

```python
        artist_keys=[normalize(r["aname"]) or f"#{r['aid']}" for r in rows],
```

Dans `radio/cli.py`, ajouter après `_rate` :

```python
_ORIGINS = {"library": "bibliothèque", "candidate": "candidats", "negative": "négatifs"}


def _missing_lines(table: SignalTable) -> list[str]:
    return [
        f"Valeurs absentes ({_ORIGINS.get(origin, origin)}) : "
        + ", ".join(f"{k} {_rate(v)}" for k, v in rates.items())
        for origin, rates in table.missing_rates_by_origin().items()
    ]
```

et dans `_signals_lines`, remplacer les quatre dernières lignes (le bloc `rates = table.missing_rates()`)
par :

```python
    lines += _missing_lines(table)
    return lines
```

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 5 : commit**

```bash
git add radio/signals/table.py radio/cli.py tests_radio/test_signal_table.py tests_radio/test_e2e_v3_2.py
git commit -m "v3-3 : vocabulaire de culture figé, groupes d'artistes, absences par origine

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 3 : Reprise des votes du banc d'écoute (`radio votes-import`)

Spec §6.1 : les votes du 2026-09-24 sont repris par un import JSON unique. La série 1 (60 titres)
va à l'examen, la série 2 (257 titres) à la leçon.

Format du banc :
- un fichier `<id Deezer>.json` par titre voté, `{"vote": "oui" | "non" | "passe", "at": "<ISO 8601>"}`.
  C'est ce que produit la lecture de la collection `votes` de l'artefact vers un dossier ;
- `series.json` : `{"s1": [{"id", "artist", "title"}, …], "s2": […]}`.

Règles :
- **Titre connu** (id présent dans `tracks`) : le vote s'y rattache.
- **Titre inconnu** : `deezer.track(id)` renvoie le titre, dont on ne garde **que** le `DeezerTrack` ;
  l'URL d'extrait est jetée. Ensuite :
  - si un titre de même clé de dédoublonnage existe, le vote s'y rattache (« rattaché ») ;
  - sinon, le titre est inséré comme `candidate` via `add_tracks` (« ajouté »).
- **Absences et erreurs.** Un titre absent de Deezer est nommé dans « introuvables ». Une
  `DeezerError` le fait nommer dans « sautés ». Une `DeezerUnavailable` remonte, et les votes déjà
  enregistrés restent.
- **Doublons.** Deux votes qui visent le même titre : le premier (ordre des noms de fichier) est
  gardé, l'autre est nommé dans « sautés ».
- **Réimport.** Il met à jour le vote (`ON CONFLICT DO UPDATE`), sans rien dupliquer.

**Files:**
- Create: `radio/votes/__init__.py` (vide), `radio/votes/importer.py`
- Modify: `radio/cli.py` (commande `votes-import`)
- Test: `tests_radio/test_votes_import.py`

**Interfaces:**
- Consumes :
  - `radio.discover.candidates.add_tracks(conn, artist_id, artist_name, tracks, origin, now) -> list[int]` ;
  - `radio.library.dedupe.dedupe_key(artist, title) -> str` ;
  - `DeezerClient.track(track_id) -> tuple[DeezerTrack, str | None] | None` ;
  - `DeezerError`, `DeezerUnavailable`.
- Produces :
  - `BenchVote(deezer_track_id: int, label: str, kind: str, vote: str, voted_at: str)` ;
  - `ImportReport(n_votes, n_recorded, n_added, n_mapped: int, not_found: list[str], skipped: list[str])` ;
  - `load_bench(votes_dir: Path, series_path: Path) -> list[BenchVote]` ;
  - `import_votes(conn, deezer, votes, source: str, now: str) -> ImportReport` ;
  - `vote_counts(conn) -> dict[str, dict[str, int]]`.

- [ ] **Step 1 : écrire les tests qui échouent**

`tests_radio/test_votes_import.py` :

```python
import json
import sqlite3
from pathlib import Path

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from radio.library.artists import register_library
from radio.sources.deezer import DeezerError, DeezerTrack, DeezerUnavailable
from radio.votes.importer import import_votes, load_bench, vote_counts
from tests_radio.factories import make_library

SIGNED = "https://cdnt-preview.dzcdn.net/api/1/1/secret-signature.mp3?hdnea=exp=1~hmac=abc"


class FakeDeezer:
    def __init__(self, fail_on: int | None = None) -> None:
        self.calls: list[int] = []
        self.fail_on = fail_on

    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None:
        self.calls.append(track_id)
        if track_id == self.fail_on:
            raise DeezerUnavailable("code 4")
        if track_id == 555:
            t = DeezerTrack(555, "Bande organisée", "Bande organisée", 200, 900, 9, "Jul", True)
            return t, SIGNED
        if track_id in (556, 560):
            t = DeezerTrack(track_id, "Wait (Remastered)", "Wait", 343, 500, 83, "M83", True)
            return t, SIGNED
        if track_id == 558:
            raise DeezerError("code 12")
        return None


def bench(tmp_path: Path, votes: dict[str, str]) -> tuple[Path, Path]:
    series = tmp_path / "series.json"
    series.write_text(
        json.dumps(
            {
                "s1": [
                    {"id": "555", "artist": "Jul", "title": "Bande organisée"},
                    {"id": "557", "artist": "Ghost", "title": "Nowhere"},
                ],
                "s2": [
                    {"id": "101", "artist": "M83", "title": "Midnight City"},
                    {"id": "556", "artist": "M83", "title": "Wait (Remastered)"},
                    {"id": "558", "artist": "Err", "title": "Broken"},
                    {"id": "559", "artist": "Never", "title": "Voted"},
                    {"id": "560", "artist": "M83", "title": "Wait (Remastered)"},
                ],
            }
        )
    )
    d = tmp_path / "votes"
    d.mkdir()
    for tid, v in votes.items():
        (d / f"{tid}.json").write_text(json.dumps({"vote": v, "at": f"2026-09-24T16:{tid[-2:]}Z"}))
    return d, series


VOTES = {"101": "oui", "555": "non", "556": "passe", "557": "oui", "558": "non"}


def db(tmp_path: Path) -> sqlite3.Connection:
    conn = make_library(tmp_path)
    register_library(conn, "d1")
    return conn


def test_load_bench(tmp_path: Path) -> None:
    votes = load_bench(*bench(tmp_path, VOTES))
    assert [(v.deezer_track_id, v.kind, v.vote) for v in votes] == [
        (101, "lesson", "oui"),
        (555, "exam", "non"),
        (556, "lesson", "passer"),
        (557, "exam", "oui"),
        (558, "lesson", "non"),
    ]
    assert votes[1].label == "Jul – Bande organisée"
    assert votes[0].voted_at == "2026-09-24T16:01Z"


def test_load_bench_refuses_an_unknown_vote(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="vote inconnu"):
        load_bench(*bench(tmp_path, {"101": "peut-être"}))


def test_load_bench_refuses_a_vote_outside_the_series(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="hors des séries"):
        load_bench(*bench(tmp_path, {"999": "oui"}))


def test_import_votes(tmp_path: Path) -> None:
    conn = db(tmp_path)
    deezer = FakeDeezer()
    rep = import_votes(conn, deezer, load_bench(*bench(tmp_path, VOTES)), "banc", "d2")
    assert deezer.calls == [555, 556, 557, 558]
    assert (rep.n_votes, rep.n_recorded, rep.n_added, rep.n_mapped) == (5, 3, 1, 1)
    assert rep.not_found == ["Ghost – Nowhere"]
    assert rep.skipped == ["Err – Broken (code 12)"]
    rows = conn.execute("SELECT * FROM votes ORDER BY deezer_track_id").fetchall()
    assert [tuple(r) for r in rows] == [
        (101, "lesson", "oui", "2026-09-24T16:01Z", "banc"),
        (103, "lesson", "passer", "2026-09-24T16:56Z", "banc"),
        (555, "exam", "non", "2026-09-24T16:55Z", "banc"),
    ]
    added = conn.execute("SELECT origin, deezer_artist_id FROM tracks WHERE deezer_track_id = 555")
    assert tuple(added.fetchone()) == ("candidate", 9)
    assert vote_counts(conn) == {"exam": {"non": 1}, "lesson": {"oui": 1, "passer": 1}}


def test_import_is_idempotent(tmp_path: Path) -> None:
    conn = db(tmp_path)
    votes = load_bench(*bench(tmp_path, VOTES))
    import_votes(conn, FakeDeezer(), votes, "banc", "d2")
    deezer = FakeDeezer()
    rep = import_votes(conn, deezer, votes, "banc", "d3")
    assert deezer.calls == [556, 557, 558]
    assert (rep.n_recorded, rep.n_added, rep.n_mapped) == (3, 0, 1)
    assert conn.execute("SELECT COUNT(*) FROM votes").fetchone()[0] == 3


def test_two_votes_on_the_same_track_keep_the_first(tmp_path: Path) -> None:
    conn = db(tmp_path)
    votes = load_bench(*bench(tmp_path, {"556": "oui", "560": "non"}))
    rep = import_votes(conn, FakeDeezer(), votes, "banc", "d2")
    assert rep.n_recorded == 1
    assert rep.skipped == ["M83 – Wait (Remastered) (même titre que M83 – Wait (Remastered))"]
    assert conn.execute("SELECT vote FROM votes WHERE deezer_track_id = 103").fetchone()[0] == "oui"


def test_an_outage_keeps_the_votes_already_recorded(tmp_path: Path) -> None:
    conn = db(tmp_path)
    with pytest.raises(DeezerUnavailable):
        import_votes(conn, FakeDeezer(fail_on=556), load_bench(*bench(tmp_path, VOTES)), "b", "d")
    assert conn.execute("SELECT COUNT(*) FROM votes").fetchone()[0] == 2


def test_cli_votes_import(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db(tmp_path / "data").close()
    settings = Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data")
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr(cli, "_deezer", lambda: FakeDeezer())
    votes_dir, series = bench(tmp_path, VOTES)
    res = CliRunner().invoke(cli.app, ["votes-import", str(votes_dir), str(series)])
    assert res.exit_code == 0, res.output
    assert "Votes du banc : 5 lus → 3 enregistrés" in res.output
    assert "  introuvable : Ghost – Nowhere" in res.output
    assert "Votes en base : examen 1 (oui 0, non 1, passer 0)" in res.output
    assert "1 nouveaux titres à mesurer : lancer radio signals" in res.output
    assert "secret-signature" not in res.output


def test_cli_votes_import_refuses_a_broken_bench(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data")
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    votes_dir, series = bench(tmp_path, {"101": "peut-être"})
    res = CliRunner().invoke(cli.app, ["votes-import", str(votes_dir), str(series)])
    assert res.exit_code == 2
    assert "Banc d'écoute illisible" in res.output
```

Note sur les dates : `bench` fabrique `at` à partir des deux derniers chiffres de l'id. Par
exemple, 101 donne `16:01`, 556 donne `16:56`. Le vote 556 est rattaché au titre 103, d'où la
ligne `(103, …, "2026-09-24T16:56Z", …)`.

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_votes_import.py -q`
Expected : FAIL (`radio.votes` n'existe pas).

- [ ] **Step 3 : implémenter**

`radio/votes/__init__.py` : fichier vide.

`radio/votes/importer.py` :

```python
"""Reprise des votes du banc d'écoute du 2026-09-24 (spec §6.1), par un import JSON unique.

Série 1 (60 titres) → examen ; série 2 (257 titres) → leçon. Le banc écrit un document par titre
voté, nommé par l'id Deezer : {"vote": "oui" | "non" | "passe", "at": "<ISO 8601>"}.
"""

import json
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from radio.discover.candidates import add_tracks
from radio.library.dedupe import dedupe_key
from radio.sources.deezer import DeezerError, DeezerTrack

_VOTES = {"oui": "oui", "non": "non", "passe": "passer"}
_KINDS = {"s1": "exam", "s2": "lesson"}


class TrackSource(Protocol):
    def track(self, track_id: int) -> tuple[DeezerTrack, str | None] | None: ...


@dataclass(frozen=True)
class BenchVote:
    deezer_track_id: int
    label: str  # « artiste – titre » du banc, pour nommer un vote sauté
    kind: str
    vote: str
    voted_at: str


@dataclass(frozen=True)
class ImportReport:
    n_votes: int
    n_recorded: int
    n_added: int
    n_mapped: int
    not_found: list[str]
    skipped: list[str]


def load_bench(votes_dir: Path, series_path: Path) -> list[BenchVote]:
    series = json.loads(series_path.read_text(encoding="utf-8"))
    where: dict[str, tuple[str, str]] = {}
    for name, kind in _KINDS.items():
        for t in series[name]:
            where[str(t["id"])] = (kind, f"{t['artist']} – {t['title']}")
    out = []
    for path in sorted(votes_dir.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if path.stem not in where:
            raise ValueError(f"vote hors des séries du banc : {path.stem}")
        if doc.get("vote") not in _VOTES:
            raise ValueError(f"vote inconnu pour {path.stem} : {doc.get('vote')!r}")
        kind, label = where[path.stem]
        out.append(BenchVote(int(path.stem), label, kind, _VOTES[doc["vote"]], str(doc["at"])))
    return out


def _known(conn: sqlite3.Connection, track_id: int) -> bool:
    row = conn.execute("SELECT 1 FROM tracks WHERE deezer_track_id = ?", (track_id,)).fetchone()
    return row is not None


def _by_key(conn: sqlite3.Connection, key: str) -> int | None:
    row = conn.execute(
        "SELECT deezer_track_id FROM tracks WHERE dedupe_key = ? ORDER BY deezer_track_id LIMIT 1",
        (key,),
    ).fetchone()
    return None if row is None else int(row[0])


def import_votes(
    conn: sqlite3.Connection, deezer: TrackSource, votes: list[BenchVote], source: str, now: str
) -> ImportReport:
    added = mapped = 0
    not_found: list[str] = []
    skipped: list[str] = []
    done: dict[int, str] = {}
    for v in votes:
        target: int | None = v.deezer_track_id
        if not _known(conn, v.deezer_track_id):
            try:
                found = deezer.track(v.deezer_track_id)
            except DeezerError as e:
                skipped.append(f"{v.label} ({e})")
                continue
            if found is None:
                not_found.append(v.label)
                continue
            t = found[0]  # l'URL d'extrait signée (found[1]) n'est jamais gardée
            target = _by_key(conn, dedupe_key(t.artist_name, t.title))
            if target is not None:
                mapped += 1
            else:
                with conn:
                    add_tracks(conn, t.artist_id, t.artist_name, [t], "candidate", now)
                target = t.id
                added += 1
        assert target is not None
        if target in done:
            skipped.append(f"{v.label} (même titre que {done[target]})")
            continue
        done[target] = v.label
        with conn:
            conn.execute(
                """
                INSERT INTO votes (deezer_track_id, kind, vote, voted_at, source)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (deezer_track_id) DO UPDATE SET kind = excluded.kind,
                    vote = excluded.vote, voted_at = excluded.voted_at, source = excluded.source
                """,
                (target, v.kind, v.vote, v.voted_at, source),
            )
    return ImportReport(len(votes), len(done), added, mapped, not_found, skipped)


def vote_counts(conn: sqlite3.Connection) -> dict[str, dict[str, int]]:
    out: defaultdict[str, Counter[str]] = defaultdict(Counter)
    for r in conn.execute("SELECT kind, vote, COUNT(*) FROM votes GROUP BY kind, vote"):
        out[r[0]][r[1]] = r[2]
    return {k: dict(sorted(c.items())) for k, c in sorted(out.items())}
```

`assert target is not None` sert de garde de typage pour mypy : `target` vaut l'id connu, l'id
rattaché ou l'id ajouté, jamais `None` à cet endroit. S'il est remplacé, ce doit être par une
construction équivalente, jamais par un `cast` qui cache un `None`.

Dans `radio/cli.py` :
- `Path` rejoint l'import existant `from pathlib import PurePosixPath`, `Annotated` rejoint
  `from typing import NoReturn`, et ajouter
  `from radio.votes.importer import import_votes, load_bench, vote_counts` ;
- ajouter la commande :

```python
@app.command("votes-import")
def votes_import(
    votes_dir: Annotated[Path, typer.Argument(help="Dossier des votes du banc, un JSON par titre")],
    series: Annotated[Path, typer.Argument(help="series.json du banc : s1 examen, s2 leçon")],
    source: Annotated[str, typer.Option(help="Origine des votes, gardée en base")] = (
        "banc-2026-09-24"
    ),
) -> None:
    """Importe les votes du banc d'écoute (série 1 → examen, série 2 → leçon)."""
    _logging()
    settings = _settings()
    try:
        votes = load_bench(votes_dir, series)
    except (OSError, KeyError, TypeError, ValueError) as e:
        _fail(f"Banc d'écoute illisible : {type(e).__name__} {e}", 2)
    conn = connect(settings.data_dir / "radio.db")
    try:
        rep = import_votes(conn, _deezer(), votes, source, datetime.now(UTC).isoformat())
        counts = vote_counts(conn)
    except DeezerUnavailable as e:
        _fail(_unavailable(e), 1)
    finally:
        conn.close()
    typer.echo(
        f"Votes du banc : {_n(rep.n_votes)} lus → {_n(rep.n_recorded)} enregistrés, "
        f"{_n(rep.n_added)} titres ajoutés, {_n(rep.n_mapped)} rattachés à un titre connu, "
        f"{_n(len(rep.not_found))} introuvables sur Deezer, {_n(len(rep.skipped))} sautés"
    )
    for x in rep.not_found:
        typer.echo(f"  introuvable : {x}")
    for x in rep.skipped:
        typer.echo(f"  sauté : {x}")
    kinds = (("exam", "examen"), ("lesson", "leçon"))
    typer.echo(
        "Votes en base : "
        + ", ".join(
            f"{label} {_n(sum(counts.get(k, {}).values()))} ("
            + ", ".join(f"{v} {_n(counts.get(k, {}).get(v, 0))}" for v in ("oui", "non", "passer"))
            + ")"
            for k, label in kinds
        )
    )
    if rep.n_added:
        typer.echo(f"{_n(rep.n_added)} nouveaux titres à mesurer : lancer radio signals")
```

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 5 : commit**

```bash
git add radio/votes radio/cli.py tests_radio/test_votes_import.py
git commit -m "v3-3 : reprise des votes du banc d'écoute (radio votes-import)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 4 : Mesures d'évaluation

**Files:**
- Create: `radio/model/__init__.py` (vide), `radio/model/evaluate.py`
- Test: `tests_radio/test_evaluate.py`

**Interfaces:**
- Produces (types `Floats = NDArray[float64]` et `Ints = NDArray[int64]`) :
  - `auc(labels: Ints, scores: Floats) -> float | None` : `None` s'il manque une classe ;
  - `threshold_for_precision(labels, scores, target: float) -> float | None` ;
  - `precision_at_rate(labels, scores, rate: float) -> float | None` ;
  - `acceptance(scores, threshold: float) -> float | None` : `None` si `scores` est vide ;
  - `YesRate(n: int, yes: int, low: float, high: float)`, avec la propriété `rate` ;
  - `yes_rate(labels, scores, threshold) -> YesRate | None` : `None` si aucun titre n'est accepté.

- [ ] **Step 1 : écrire les tests qui échouent**

`tests_radio/test_evaluate.py` :

```python
import numpy as np
import pytest

from radio.model.evaluate import (
    acceptance,
    auc,
    precision_at_rate,
    threshold_for_precision,
    yes_rate,
)

L = np.array([1, 1, 0, 1, 0, 0], dtype=np.int64)
S = np.array([0.9, 0.8, 0.7, 0.6, 0.5, 0.1])


def test_auc() -> None:
    assert auc(L, S) == pytest.approx(8 / 9)
    assert auc(np.ones(3, dtype=np.int64), S[:3]) is None


def test_threshold_for_precision_takes_the_widest_acceptance() -> None:
    # Précisions cumulées : 1, 1, 2/3, 3/4, 3/5, 1/2.
    assert threshold_for_precision(L, S, 0.75) == 0.6
    assert threshold_for_precision(L, S, 0.9) == 0.8
    assert threshold_for_precision(np.zeros(3, dtype=np.int64), S[:3], 0.9) is None
    assert threshold_for_precision(L[:0], S[:0], 0.9) is None


def test_threshold_respects_ties() -> None:
    labels = np.array([1, 0, 1], dtype=np.int64)
    scores = np.array([0.9, 0.9, 0.2])
    # 0,9 accepte ensemble le « oui » et le « non » : précision 1/2, jamais 1.
    assert threshold_for_precision(labels, scores, 0.9) is None


def test_precision_at_rate() -> None:
    assert precision_at_rate(L, S, 0.5) == pytest.approx(2 / 3)
    assert precision_at_rate(L, S, 0.0) is None


def test_acceptance() -> None:
    assert acceptance(S, 0.6) == pytest.approx(4 / 6)
    assert acceptance(S[:0], 0.6) is None


def test_yes_rate_with_wilson_interval() -> None:
    labels = np.array([1] * 9 + [0] + [0] * 5, dtype=np.int64)
    scores = np.array([0.9] * 10 + [0.1] * 5)
    y = yes_rate(labels, scores, 0.5)
    assert y is not None
    assert (y.n, y.yes, y.rate) == (10, 9, 0.9)
    assert y.low == pytest.approx(0.59585, abs=1e-5)
    assert y.high == pytest.approx(0.98212, abs=1e-5)
    assert yes_rate(labels, scores, 0.95) is None
```

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_evaluate.py -q`
Expected : FAIL (`radio.model` n'existe pas).

- [ ] **Step 3 : implémenter**

`radio/model/__init__.py` : fichier vide.

`radio/model/evaluate.py` :

```python
"""Mesures du modèle (spec §5.4, §7) : AUC, seuil de précision, précision à taux d'acceptation
fixé, taux de oui avec intervalle de Wilson à 95 %."""

import math
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from scipy.stats import binomtest
from sklearn.metrics import roc_auc_score

Floats = npt.NDArray[np.float64]
Ints = npt.NDArray[np.int64]


def auc(labels: Ints, scores: Floats) -> float | None:
    """AUC ROC ; None s'il manque l'une des deux classes."""
    if len(np.unique(labels)) < 2:
        return None
    return float(roc_auc_score(labels, scores))


def threshold_for_precision(labels: Ints, scores: Floats, target: float) -> float | None:
    """Plus petit seuil dont la précision (part de oui parmi les notes ≥ seuil) atteint la cible,
    donc le plus grand taux d'acceptation possible. None si aucun seuil n'y arrive."""
    if len(scores) == 0:
        return None
    order = np.argsort(-scores, kind="stable")
    s, lab = scores[order], labels[order]
    precision = np.cumsum(lab) / np.arange(1, len(s) + 1)
    # Seules comptent les fins de paliers : à égalité de note, tous sont acceptés ensemble.
    block_end = np.append(s[1:] != s[:-1], True)
    ok = np.flatnonzero(block_end & (precision >= target))
    return float(s[ok[-1]]) if len(ok) else None


def precision_at_rate(labels: Ints, scores: Floats, rate: float) -> float | None:
    """Précision parmi les ⌈rate × n⌉ meilleures notes : compare deux modèles à taux égal."""
    k = math.ceil(rate * len(scores))
    if k == 0:
        return None
    top = np.argsort(-scores, kind="stable")[:k]
    return float(labels[top].mean())


def acceptance(scores: Floats, threshold: float) -> float | None:
    return float((scores >= threshold).mean()) if len(scores) else None


@dataclass(frozen=True)
class YesRate:
    n: int
    yes: int
    low: float
    high: float

    @property
    def rate(self) -> float:
        return self.yes / self.n


def yes_rate(labels: Ints, scores: Floats, threshold: float) -> YesRate | None:
    """Taux de oui parmi les titres acceptés (note ≥ seuil), intervalle de Wilson à 95 %."""
    accepted = labels[scores >= threshold]
    n, yes = len(accepted), int(accepted.sum())
    if n == 0:
        return None
    ci = binomtest(yes, n).proportion_ci(confidence_level=0.95, method="wilson")
    return YesRate(n, yes, float(ci.low), float(ci.high))
```

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 5 : commit**

```bash
git add radio/model/__init__.py radio/model/evaluate.py tests_radio/test_evaluate.py
git commit -m "v3-3 : mesures d'évaluation (AUC, seuil de précision, Wilson)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 5 : Étiquettes, poids et jeu d'examen

Spec §5.4.3 et §7.1, et revue v3-2 point 6.

Étiquettes :
- **Positifs :** titres de la bibliothèque, avec un poids d'écoute `play_weight` calculé sur la
  somme des écoutes des titres Plex rapprochés de ce titre Deezer. S'y ajoutent les « oui » de
  leçon.
- **Négatifs :** les « non » de leçon, et les **négatifs faibles** (origine `negative`).
- **Poids d'un vote :** `VOTE_WEIGHT = WEIGHT_CAP` (4). Un vote est un jugement direct : il pèse
  autant que le titre le plus écouté de la bibliothèque.
- **Priorités :** un vote l'emporte sur l'origine du titre. Un titre voté à l'examen (où qu'il
  soit dans la fenêtre) n'est **jamais** un exemple d'entraînement.
- **Négatif faible écarté** (et compté) si :
  - son artiste est un artiste de la bibliothèque, par id Deezer ou par nom normalisé ;
  - ou sa clé de dédoublonnage est celle d'un titre de la bibliothèque ou d'un titre voté.
- **Candidat sans vote :** ce n'est pas un exemple.

Poids d'entraînement `weights(ds, λ)` :
- λ multiplie le poids des négatifs faibles ;
- les classes sont ensuite équilibrées : même poids total pour les positifs et les négatifs,
  poids moyen 1. Ainsi, λ règle seulement la part des négatifs faibles face aux « non », et la
  part de la bibliothèque face aux « oui » reste fixe.

**Files:**
- Create: `radio/model/dataset.py`
- Create: `tests_radio/model_factory.py` (base de démonstration, réutilisée par les tâches 6 à 9)
- Test: `tests_radio/test_dataset.py`

**Interfaces:**
- Consumes :
  - `SignalTable` avec `track_ids`, `artist_ids`, `artist_keys` et `origins` (Task 2) ;
  - `library_artists`, `library_names` ;
  - `play_weight`, `WEIGHT_CAP`.
- Produces :
  - `CATEGORIES = ("library", "vote_yes", "vote_no", "weak")` et les constantes `LIBRARY`,
    `VOTE_YES`, `VOTE_NO`, `WEAK` (0 à 3) ;
  - `Dataset(rows: Ints, labels: Ints, base_weights: Floats, categories: Ints, groups: Ints)`,
    avec la méthode `.counts() -> dict[str, int]`. Les clés sont les `CATEGORIES`, les lignes
    sont des indices dans la `SignalTable` ;
  - `ExamSet(rows: Ints, labels: Ints, last_vote: str | None)` ;
  - `Labels(train: Dataset, exam: ExamSet, n_votes_unmeasured: int, n_weak_excluded: int)` ;
  - `build_labels(conn, table: SignalTable, exam_window: int) -> Labels` ;
  - `MissingExamplesError(Exception)` ;
  - `weights(ds: Dataset, weak_weight: float) -> Floats`, qui lève `MissingExamplesError` si
    l'une des classes pèse 0 ;
  - dans `tests_radio/model_factory.py` : `LIKED`, `make_model_db(directory, n_artists=12,
    per_artist=4, seed=0)` et `add_vote(conn, track_id, kind, vote, at=...)`. Les ids suivent
    ce schéma :
    - artistes de la bibliothèque `1000 + a`, leurs titres `100000 + 10·a + k` ;
    - candidats aimés : artistes `2000 + a`, titres `(2000 + a)·100 + k` ;
    - candidats rejetés : artistes `3000 + a`, titres `(3000 + a)·100 + k` ;
    - négatifs : artistes `4000 + a`, titres `(4000 + a)·100 + k`.

- [ ] **Step 1 : la base de démonstration**

`tests_radio/model_factory.py` :

```python
"""Base de démonstration du modèle : le goût est la direction LIKED de l'empreinte.

Bibliothèque et candidats « aimés » (artistes 2000+) pointent vers LIKED (6 écarts-types, pour
des tests stables) ; candidats « rejetés »
(3000+) et négatifs (4000+) vers DISLIKED. Les autres signaux sont identiques pour tous.
"""

import json
import sqlite3
from pathlib import Path

import numpy as np

from radio.core.db import connect
from radio.discover.candidates import add_tracks
from radio.library.artists import register_library
from radio.signals.audio import DIM, MODEL_TAG, to_blob
from radio.sources.deezer import DeezerTrack

NOW = "2026-09-25T00:00:00+00:00"
LIKED = np.eye(DIM, dtype=np.float32)[0]
DISLIKED = np.eye(DIM, dtype=np.float32)[1]


def make_model_db(
    directory: Path, n_artists: int = 12, per_artist: int = 4, seed: int = 0
) -> sqlite3.Connection:
    rng = np.random.default_rng(seed)
    conn = connect(directory / "radio.db")
    lib, matches = [], []
    for a in range(n_artists):
        for k in range(per_artist):
            key = f"p{a}-{k}"
            plays = int(rng.integers(0, 20))
            lib.append((key, f"Lib {a}", f"Chanson {k}", "Album", 200000, plays, NOW))
            matches.append((key, "matched", None, 100000 + 10 * a + k, 1000 + a, NOW))
    conn.executemany("INSERT INTO library_tracks VALUES (?, ?, ?, ?, ?, ?, ?)", lib)
    conn.executemany("INSERT INTO deezer_matches VALUES (?, ?, ?, ?, ?, ?)", matches)
    conn.commit()
    register_library(conn, NOW)
    for base, origin in ((2000, "candidate"), (3000, "candidate"), (4000, "negative")):
        for a in range(n_artists):
            aid = base + a
            tracks = [
                DeezerTrack(aid * 100 + k, f"Titre {k}", f"Titre {k}", 200, 1000, aid, f"Art {aid}", True)
                for k in range(per_artist)
            ]
            add_tracks(conn, aid, f"Art {aid}", tracks, origin, NOW)
    for tid, aid, origin in conn.execute(
        "SELECT deezer_track_id, deezer_artist_id, origin FROM tracks"
    ).fetchall():
        liked = origin == "library" or 2000 <= aid < 3000
        v = 6 * (LIKED if liked else DISLIKED) + rng.normal(size=DIM)
        blob = to_blob((v / np.linalg.norm(v)).astype(np.float32))
        rank = int(rng.integers(0, 1000))
        conn.execute(
            "INSERT INTO track_measures VALUES (?, 'ok', ?, ?, ?, ?)",
            (tid, rank, blob, MODEL_TAG, NOW),
        )
    conn.execute(
        """
        UPDATE artists SET fetched_at = ?, nb_fan = 100, deezer_related = '[]', lastfm_found = 1,
            lastfm_listeners = 1000, lastfm_tags = ?, lastfm_similar = '[]'
        """,
        (NOW, json.dumps([["rock", 100]])),
    )
    conn.commit()
    return conn


def add_vote(
    conn: sqlite3.Connection,
    track_id: int,
    kind: str,
    vote: str,
    at: str = "2026-09-24T12:00:00+00:00",
) -> None:
    conn.execute(
        "INSERT INTO votes VALUES (?, ?, ?, ?, 'test')", (track_id, kind, vote, at)
    )
    conn.commit()
```

- [ ] **Step 2 : écrire les tests qui échouent**

`tests_radio/test_dataset.py` :

```python
from pathlib import Path

import numpy as np
import pytest

from radio.library.weights import play_weight
from radio.model.dataset import (
    LIBRARY,
    VOTE_NO,
    VOTE_YES,
    WEAK,
    MissingExamplesError,
    build_labels,
    weights,
)
from radio.signals.table import load_signals
from tests_radio.model_factory import add_vote, make_model_db


def test_categories_and_exam(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    add_vote(conn, 200000, "lesson", "oui")
    add_vote(conn, 300000, "lesson", "non")
    add_vote(conn, 300001, "lesson", "passer")
    add_vote(conn, 200100, "exam", "oui")
    add_vote(conn, 300100, "exam", "non")
    table = load_signals(conn, 10)
    lab = build_labels(conn, table, 60)
    assert lab.train.counts() == {"library": 6, "vote_yes": 1, "vote_no": 1, "weak": 6}
    ids = table.track_ids
    assert ids[lab.exam.rows].tolist() == [200100, 300100]
    assert lab.exam.labels.tolist() == [1, 0]
    assert lab.exam.last_vote == "2026-09-24T12:00:00+00:00"
    assert not set(ids[lab.train.rows].tolist()) & {200100, 300100, 300001}
    yes = lab.train.rows[lab.train.categories == VOTE_YES]
    assert ids[yes].tolist() == [200000]


def test_library_weights_follow_plays(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    table = load_signals(conn, 10)
    lab = build_labels(conn, table, 60)
    plays = {
        r[0]: r[1]
        for r in conn.execute(
            "SELECT m.deezer_track_id, t.plays FROM deezer_matches m JOIN library_tracks t "
            "USING (plex_key)"
        )
    }
    lib = lab.train.categories == LIBRARY
    for row, w in zip(lab.train.rows[lib], lab.train.base_weights[lib], strict=True):
        assert w == pytest.approx(play_weight(plays[int(table.track_ids[row])]))


def test_a_vote_overrides_the_origin(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    add_vote(conn, 100000, "lesson", "non")
    table = load_signals(conn, 10)
    lab = build_labels(conn, table, 60)
    row = int(np.flatnonzero(table.track_ids == 100000)[0])
    i = int(np.flatnonzero(lab.train.rows == row)[0])
    assert (lab.train.categories[i], lab.train.labels[i]) == (VOTE_NO, 0)


def test_weak_negatives_close_to_the_library_are_excluded(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    # Même nom qu'un artiste de la bibliothèque.
    conn.execute("UPDATE artists SET name = 'Lib 0' WHERE deezer_artist_id = 4000")
    # Même clé de dédoublonnage qu'un titre de la bibliothèque.
    key = conn.execute("SELECT dedupe_key FROM tracks WHERE deezer_track_id = 100010").fetchone()
    conn.execute("UPDATE tracks SET dedupe_key = ? WHERE deezer_track_id = 400100", (key[0],))
    conn.commit()
    table = load_signals(conn, 10)
    lab = build_labels(conn, table, 60)
    assert lab.n_weak_excluded == 3
    assert lab.train.counts()["weak"] == 3


def test_exam_window_keeps_the_latest_votes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    add_vote(conn, 200000, "exam", "oui", at="2026-09-24T10:00:00+00:00")
    add_vote(conn, 200001, "exam", "non", at="2026-09-24T11:00:00+00:00")
    add_vote(conn, 200100, "exam", "oui", at="2026-09-24T12:00:00+00:00")
    add_vote(conn, 999, "lesson", "oui")
    table = load_signals(conn, 10)
    lab = build_labels(conn, table, 2)
    assert table.track_ids[lab.exam.rows].tolist() == [200001, 200100]
    assert lab.n_votes_unmeasured == 1
    # Hors fenêtre, un titre d'examen ne s'entraîne pas pour autant.
    assert 200000 not in table.track_ids[lab.train.rows].tolist()


def test_groups_follow_normalized_artist_names(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    conn.execute("UPDATE artists SET name = 'LIB 1' WHERE deezer_artist_id = 1000")
    conn.commit()
    table = load_signals(conn, 10)
    lab = build_labels(conn, table, 60)
    keys = [table.artist_keys[r] for r in lab.train.rows]
    by_group: dict[int, set[str]] = {}
    for g, k in zip(lab.train.groups.tolist(), keys, strict=True):
        by_group.setdefault(g, set()).add(k)
    assert all(len(v) == 1 for v in by_group.values())
    lib1 = {g for g, k in zip(lab.train.groups.tolist(), keys, strict=True) if k == "lib 1"}
    assert len(lib1) == 1


def test_weights_balance_the_classes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    add_vote(conn, 300000, "lesson", "non")
    table = load_signals(conn, 10)
    ds = build_labels(conn, table, 60).train
    w = weights(ds, 0.1)
    assert w[ds.labels == 1].sum() == pytest.approx(w[ds.labels == 0].sum())
    assert w.mean() == pytest.approx(1.0)
    weak, no = w[ds.categories == WEAK], w[ds.categories == VOTE_NO]
    assert weak[0] / no[0] == pytest.approx(0.1 / 4.0)
    w0 = weights(ds, 0.0)
    assert (w0[ds.categories == WEAK] == 0).all()


def test_weights_need_both_classes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=3, per_artist=2)
    table = load_signals(conn, 10)
    ds = build_labels(conn, table, 60).train
    with pytest.raises(MissingExamplesError):
        weights(ds, 0.0)
```

`test_weak_negatives_close_to_the_library_are_excluded` compte 3 titres écartés : l'artiste 4000
nommé « Lib 0 » a deux titres, 400100 a la clé d'un titre de la bibliothèque, et 400101 reste.
Sur 6 négatifs, il en reste donc 3.

- [ ] **Step 3 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_dataset.py -q`
Expected : FAIL (`radio.model.dataset` n'existe pas).

- [ ] **Step 4 : implémenter**

`radio/model/dataset.py` :

```python
"""Exemples d'entraînement et jeu d'examen (spec §5.4.3, §7.1 ; revue v3-2 point 6).

- Positifs : titres de la bibliothèque (poids d'écoute) et « oui » de leçon.
- Négatifs : « non » de leçon, et négatifs faibles (origine `negative`), pondérés par λ.
- « Passer » est ignoré. Un vote l'emporte sur l'origine du titre.
- Un titre voté à l'examen n'est jamais un exemple d'entraînement.
- Un négatif faible est écarté si son artiste est dans la bibliothèque (id ou nom normalisé), ou
  si sa clé de dédoublonnage est celle d'un titre de la bibliothèque ou d'un titre voté.
- Un candidat sans vote n'est pas un exemple.
"""

import sqlite3
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from radio.library.artists import library_artists, library_names
from radio.library.weights import WEIGHT_CAP, play_weight
from radio.signals.table import SignalTable

Floats = npt.NDArray[np.float64]
Ints = npt.NDArray[np.int64]

CATEGORIES = ("library", "vote_yes", "vote_no", "weak")
LIBRARY, VOTE_YES, VOTE_NO, WEAK = range(len(CATEGORIES))
# Un vote est un jugement direct : il pèse autant que le titre le plus écouté de la bibliothèque.
VOTE_WEIGHT = WEIGHT_CAP


class MissingExamplesError(Exception):
    """Il faut des exemples positifs et négatifs de poids non nul."""


@dataclass(frozen=True)
class Dataset:
    rows: Ints  # indices dans la SignalTable
    labels: Ints  # 1 positif, 0 négatif
    base_weights: Floats  # avant λ et équilibrage
    categories: Ints  # index dans CATEGORIES
    groups: Ints  # artiste (nom normalisé) codé en entier

    def counts(self) -> dict[str, int]:
        return {name: int((self.categories == i).sum()) for i, name in enumerate(CATEGORIES)}


@dataclass(frozen=True)
class ExamSet:
    rows: Ints
    labels: Ints
    last_vote: str | None


@dataclass(frozen=True)
class Labels:
    train: Dataset
    exam: ExamSet
    n_votes_unmeasured: int
    n_weak_excluded: int


def _plays(conn: sqlite3.Connection) -> dict[int, int]:
    return {
        int(r[0]): int(r[1])
        for r in conn.execute(
            """
            SELECT m.deezer_track_id, SUM(t.plays)
            FROM deezer_matches m JOIN library_tracks t USING (plex_key)
            WHERE m.status = 'matched' GROUP BY m.deezer_track_id
            """
        )
    }


def build_labels(conn: sqlite3.Connection, table: SignalTable, exam_window: int) -> Labels:
    index = {int(t): i for i, t in enumerate(table.track_ids)}
    votes = conn.execute(
        """
        SELECT deezer_track_id AS tid, kind, vote, voted_at FROM votes
        WHERE vote != 'passer' ORDER BY voted_at, deezer_track_id
        """
    ).fetchall()
    unmeasured = sum(1 for v in votes if v["tid"] not in index)
    exam_ids = {v["tid"] for v in votes if v["kind"] == "exam"}
    exam = [v for v in votes if v["kind"] == "exam" and v["tid"] in index][-exam_window:]
    lesson = {v["tid"]: v["vote"] for v in votes if v["kind"] == "lesson" and v["tid"] in index}
    keys = {
        int(r[0]): str(r[1]) for r in conn.execute("SELECT deezer_track_id, dedupe_key FROM tracks")
    }
    protected = {keys[t] for t in lesson} | {keys[t] for t in exam_ids if t in keys}
    protected |= {
        str(r[0]) for r in conn.execute("SELECT dedupe_key FROM tracks WHERE origin = 'library'")
    }
    lib_ids = {a.deezer_artist_id for a in library_artists(conn)}
    lib_names = library_names(conn)
    plays = _plays(conn)

    rows: list[int] = []
    labels: list[int] = []
    base: list[float] = []
    cats: list[int] = []
    excluded = 0
    for i, (tid, origin) in enumerate(zip(table.track_ids.tolist(), table.origins, strict=True)):
        if tid in exam_ids:
            continue
        if tid in lesson:
            yes = lesson[tid] == "oui"
            label, weight, cat = int(yes), VOTE_WEIGHT, VOTE_YES if yes else VOTE_NO
        elif origin == "library":
            label, weight, cat = 1, play_weight(plays.get(tid, 0)), LIBRARY
        elif origin == "negative":
            if (
                int(table.artist_ids[i]) in lib_ids
                or table.artist_keys[i] in lib_names
                or keys[tid] in protected
            ):
                excluded += 1
                continue
            label, weight, cat = 0, 1.0, WEAK
        else:
            continue  # candidat sans vote : pas un exemple
        rows.append(i)
        labels.append(label)
        base.append(weight)
        cats.append(cat)
    _, groups = np.unique([table.artist_keys[i] for i in rows], return_inverse=True)
    train = Dataset(
        rows=np.array(rows, dtype=np.int64),
        labels=np.array(labels, dtype=np.int64),
        base_weights=np.array(base, dtype=np.float64),
        categories=np.array(cats, dtype=np.int64),
        groups=np.asarray(groups, dtype=np.int64).reshape(-1),
    )
    exam_set = ExamSet(
        rows=np.array([index[v["tid"]] for v in exam], dtype=np.int64),
        labels=np.array([int(v["vote"] == "oui") for v in exam], dtype=np.int64),
        last_vote=exam[-1]["voted_at"] if exam else None,
    )
    return Labels(train, exam_set, unmeasured, excluded)


def weights(ds: Dataset, weak_weight: float) -> Floats:
    """Poids d'entraînement : λ sur les négatifs faibles, puis classes équilibrées (même poids
    total pour les positifs et les négatifs, poids moyen 1)."""
    w = ds.base_weights.copy()
    w[ds.categories == WEAK] *= weak_weight
    pos, neg = w[ds.labels == 1].sum(), w[ds.labels == 0].sum()
    if pos == 0 or neg == 0:
        raise MissingExamplesError("il faut des exemples positifs et négatifs")
    w[ds.labels == 1] *= len(w) / (2 * pos)
    w[ds.labels == 0] *= len(w) / (2 * neg)
    return w
```

Sur une liste vide, `np.unique(..., return_inverse=True)` renvoie des groupes vides ; `reshape(-1)` garantit un
tableau à une dimension.

- [ ] **Step 5 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 6 : commit**

```bash
git add radio/model/dataset.py tests_radio/model_factory.py tests_radio/test_dataset.py
git commit -m "v3-3 : étiquettes, poids et jeu d'examen

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 6 : Le modèle empilé

Spec §5.4.1, §5.4.2 et §5.4.4.

- **Note audio :** `make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))` sur
  l'empreinte.
- **Décision :** `HistGradientBoostingClassifier(early_stopping=False, random_state=0)` sur
  `[note audio, signaux gardés]`.
- **Groupes de signaux :** `GROUPS = ("rang du titre", "popularité de l'artiste", "culture",
  "proximité")`. Le rang du titre est séparé des signaux d'artiste (revue v3-2 point 1) : c'est
  un artefact d'échantillonnage possible, et l'ablation le juge seul.
- **Plis :** `StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=0)`, avec pour
  groupes l'artiste (`Dataset.groups`) et pour strates la catégorie d'exemple
  (`Dataset.categories`). Chaque pli reçoit ainsi sa part de votes.
- **`fit_stack` :** la note audio du second étage est calculée hors pli (`cross_val_predict`) ;
  le modèle audio final est ajusté sur tout.
- **`nested_scores` :** notes hors pli de l'empilement **entier**. Pour chaque pli externe, le
  modèle audio (avec sa note hors pli interne) est ajusté sans ce pli, et une décision est
  ajustée par jeu de signaux demandé. Les jeux de l'ablation partagent ainsi le modèle audio.
- **`Stack.predict` :** lève `ValueError` si le vocabulaire de la table diffère de celui du
  modèle (revue v3-2 point 4).

**Files:**
- Create: `radio/model/stack.py`
- Test: `tests_radio/test_stack.py`

**Interfaces:**
- Consumes : `Dataset` (Task 5), `SignalTable` (Task 2).
- Produces :
  - `GROUPS: tuple[str, ...]` et `SEED = 0` ;
  - `features(table, rows: Ints, groups: tuple[str, ...]) -> Floats` ;
  - `splits(strata: Ints, groups: Ints, folds: int) -> list[tuple[Ints, Ints]]` ;
  - `Stack(audio, decision, groups: tuple[str, ...], vocabulary: list[str])`, avec la méthode
    `.predict(table, rows) -> Floats` ;
  - `fit_stack(table, ds: Dataset, w: Floats, folds: int, groups: tuple[str, ...]) -> Stack` ;
  - `nested_scores(table, ds, w, folds, feature_sets: list[tuple[str, ...]]) -> list[Floats]`.

- [ ] **Step 1 : écrire les tests qui échouent**

`tests_radio/test_stack.py` :

```python
from pathlib import Path

import numpy as np
import pytest

from radio.model.dataset import build_labels, weights
from radio.model.evaluate import auc
from radio.model.stack import GROUPS, features, fit_stack, nested_scores, splits
from radio.signals.table import load_signals
from tests_radio.model_factory import make_model_db


def setup(tmp_path: Path):  # type: ignore[no-untyped-def]
    conn = make_model_db(tmp_path)
    table = load_signals(conn, 10)
    ds = build_labels(conn, table, 60).train
    return table, ds, weights(ds, 0.3)


def test_features_columns(tmp_path: Path) -> None:
    table, ds, _ = setup(tmp_path)
    v = len(table.vocabulary)
    assert features(table, ds.rows, GROUPS).shape == (len(ds.rows), 1 + 2 + v + 2)
    assert features(table, ds.rows, ("culture",)).shape == (len(ds.rows), v)
    assert features(table, ds.rows, ()).shape == (len(ds.rows), 0)


def test_splits_never_share_an_artist(tmp_path: Path) -> None:
    _, ds, _ = setup(tmp_path)
    folds = splits(ds.categories, ds.groups, 3)
    assert len(folds) == 3
    seen = np.concatenate([test for _, test in folds])
    assert sorted(seen.tolist()) == list(range(len(ds.rows)))
    for train, test in folds:
        assert not set(ds.groups[train].tolist()) & set(ds.groups[test].tolist())


def test_fit_stack_learns_the_taste(tmp_path: Path) -> None:
    table, ds, w = setup(tmp_path)
    stack = fit_stack(table, ds, w, 3, GROUPS)
    ids = table.track_ids
    liked = np.flatnonzero((ids >= 200000) & (ids < 300000))
    disliked = np.flatnonzero((ids >= 300000) & (ids < 400000))
    assert stack.predict(table, liked).mean() > stack.predict(table, disliked).mean() + 0.5
    assert stack.vocabulary == table.vocabulary


def test_predict_refuses_another_vocabulary(tmp_path: Path) -> None:
    table, ds, w = setup(tmp_path)
    stack = fit_stack(table, ds, w, 3, GROUPS)
    conn = make_model_db(tmp_path / "autre")
    other = load_signals(conn, 10, vocabulary=["jazz"])
    with pytest.raises(ValueError, match="vocabulaire"):
        stack.predict(other, np.arange(3))


def test_nested_scores(tmp_path: Path) -> None:
    table, ds, w = setup(tmp_path)
    full, no_culture = nested_scores(table, ds, w, 3, [GROUPS, ("rang du titre",)])
    for s in (full, no_culture):
        assert s.shape == (len(ds.rows),)
        assert ((s >= 0) & (s <= 1)).all()
        got = auc(ds.labels, s)
        assert got is not None and got > 0.9
```

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_stack.py -q`
Expected : FAIL (`radio.model.stack` n'existe pas).

- [ ] **Step 3 : implémenter**

`radio/model/stack.py` :

```python
"""Modèle empilé (spec §5.4) : note audio, puis décision.

- Note audio : régression logistique sur l'empreinte standardisée.
- Décision : HistGradientBoosting sur la note audio et les signaux gardés ; il traite les
  valeurs absentes nativement.

Plis groupés par artiste (nom normalisé) et stratifiés par catégorie d'exemple : un artiste n'est
jamais à la fois dans l'apprentissage et le contrôle, et chaque pli reçoit sa part de votes. La
note audio du second étage est calculée hors pli ; l'évaluation est imbriquée.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
import numpy.typing as npt
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from radio.model.dataset import Dataset
from radio.signals.table import SignalTable

Floats = npt.NDArray[np.float64]
Ints = npt.NDArray[np.int64]

# Le rang du titre est séparé des signaux d'artiste : l'ablation le juge seul (revue v3-2, point 1).
GROUPS = ("rang du titre", "popularité de l'artiste", "culture", "proximité")
SEED = 0


def features(table: SignalTable, rows: Ints, groups: tuple[str, ...]) -> Floats:
    parts: list[Floats] = [np.empty((len(rows), 0))]
    if "rang du titre" in groups:
        parts.append(table.popularity[rows, :1])
    if "popularité de l'artiste" in groups:
        parts.append(table.popularity[rows, 1:])
    if "culture" in groups:
        parts.append(table.culture[rows])
    if "proximité" in groups:
        parts.append(table.proximity[rows])
    return np.hstack(parts)


def splits(strata: Ints, groups: Ints, folds: int) -> list[tuple[Ints, Ints]]:
    cv = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=SEED)
    return [
        (np.asarray(tr, dtype=np.int64), np.asarray(te, dtype=np.int64))
        for tr, te in cv.split(np.zeros(len(strata)), strata, groups)
    ]


def _audio_model() -> Any:
    return make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))


def _decision_model() -> Any:
    return HistGradientBoostingClassifier(early_stopping=False, random_state=SEED)


def _proba(model: Any, x: Floats) -> Floats:
    return np.asarray(model.predict_proba(x)[:, 1], dtype=np.float64)


@dataclass(frozen=True)
class Stack:
    audio: Any
    decision: Any
    groups: tuple[str, ...]
    vocabulary: list[str]

    def predict(self, table: SignalTable, rows: Ints) -> Floats:
        if table.vocabulary != self.vocabulary:
            raise ValueError("vocabulaire de culture différent de celui du modèle")
        a = _proba(self.audio, table.audio[rows])
        return _proba(self.decision, np.column_stack([a, features(table, rows, self.groups)]))


def _fit_audio(
    x: npt.NDArray[np.float32], y: Ints, w: Floats, strata: Ints, groups: Ints, folds: int
) -> tuple[Any, Floats]:
    """Modèle audio ajusté sur tout, et sa note hors pli pour le second étage."""
    oof = cross_val_predict(
        _audio_model(),
        x,
        y,
        cv=splits(strata, groups, folds),
        method="predict_proba",
        params={"logisticregression__sample_weight": w},
    )
    full = _audio_model().fit(x, y, logisticregression__sample_weight=w)
    return full, np.asarray(oof[:, 1], dtype=np.float64)


def fit_stack(
    table: SignalTable, ds: Dataset, w: Floats, folds: int, groups: tuple[str, ...]
) -> Stack:
    audio, oof = _fit_audio(table.audio[ds.rows], ds.labels, w, ds.categories, ds.groups, folds)
    x = np.column_stack([oof, features(table, ds.rows, groups)])
    decision = _decision_model().fit(x, ds.labels, sample_weight=w)
    return Stack(audio, decision, groups, list(table.vocabulary))


def nested_scores(
    table: SignalTable,
    ds: Dataset,
    w: Floats,
    folds: int,
    feature_sets: list[tuple[str, ...]],
) -> list[Floats]:
    """Notes hors pli de l'empilement entier, une par jeu de signaux : chaque pli externe est
    noté par un empilement ajusté sans lui, note audio hors pli interne comprise."""
    out = [np.zeros(len(ds.rows)) for _ in feature_sets]
    for train, test in splits(ds.categories, ds.groups, folds):
        tr, te = ds.rows[train], ds.rows[test]
        audio, oof = _fit_audio(
            table.audio[tr],
            ds.labels[train],
            w[train],
            ds.categories[train],
            ds.groups[train],
            folds,
        )
        a_test = _proba(audio, table.audio[te])
        for k, fs in enumerate(feature_sets):
            decision = _decision_model().fit(
                np.column_stack([oof, features(table, tr, fs)]),
                ds.labels[train],
                sample_weight=w[train],
            )
            out[k][test] = _proba(decision, np.column_stack([a_test, features(table, te, fs)]))
    return out
```

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert. Des `UserWarning` de `StratifiedGroupKFold` (« least populated class ») sont
normaux sur de petites catégories.

- [ ] **Step 5 : commit**

```bash
git add radio/model/stack.py tests_radio/test_stack.py
git commit -m "v3-3 : modèle empilé (note audio hors pli, décision, évaluation imbriquée)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 7 : L'entraînement

Spec §5.4.3, §5.4.5, §5.4.6, §7.3 et §8 (« Trop peu de "non" »).

**Démarrage.** Les votes suffisent quand il y a au moins `min_votes_per_class` « oui » ET autant
de « non » de leçon. Sans assez de votes :
- les négatifs faibles sont maintenus au poids le plus fort de la grille (0,3) ;
- il n'y a ni ablation ni seuil. Le modèle est entraîné, rapporté et historisé, mais jamais
  promu ;
- le rapport dit combien de votes manquent.

**Avec assez de votes :**
1. Pour chaque λ de `(0, 0,1, 0,3)`, notes imbriquées de 5 jeux de signaux : tous les groupes,
   puis tous sauf un, pour chaque groupe.
2. λ retenu : celui dont l'AUC sur les votes de leçon est la plus haute. À égalité, le premier
   de la grille.
3. **Ablation** avec ce λ. Un groupe est **gardé** s'il aide, c'est-à-dire si le retirer fait
   baisser l'AUC OU la précision au taux d'acceptation courant sur les votes de leçon. Sinon il
   est retiré du modèle, et le rapport le dit. La liste des groupes gardés est stockée avec le
   modèle, au lieu d'une modification de `editorial.toml` : le modèle porte sa configuration.
4. **Seuil** : `threshold_for_precision` sur les notes hors pli des votes de leçon, avec le jeu de
   signaux gardé.
5. **Garde-fou** : part des titres de la bibliothèque dont la note hors pli (artiste retiré) passe
   le seuil. Elle se mesure deux fois : sur toute la bibliothèque, et sur les titres sans aucune
   valeur absente dans les signaux gardés. Revue v3-2 point 2 : les absences corrèlent avec
   l'origine et gonflent la première mesure.
6. **Modèle final** : `fit_stack` sur tous les exemples.

**Files:**
- Create: `radio/model/train.py`
- Test: `tests_radio/test_train.py`

**Interfaces:**
- Consumes :
  - `Labels`, `Dataset`, `weights`, `LIBRARY`, `VOTE_YES` et `VOTE_NO` (Task 5) ;
  - `GROUPS`, `features`, `fit_stack`, `nested_scores` et `Stack` (Task 6) ;
  - `auc`, `threshold_for_precision`, `precision_at_rate`, `acceptance`, `yes_rate` et
    `YesRate` (Task 4) ;
  - `ModelConfig` (Task 1).
- Produces :
  - `WEAK_WEIGHTS = (0.0, 0.1, 0.3)` ;
  - `Ablation(removed: str, auc: float | None, precision: float | None, kept: bool)` ;
  - `TrainResult`, avec les champs :
    - `stack: Stack`, `weak_weight: float`, `counts: dict[str, int]`,
      `missing_votes: dict[str, int]` (clés `"oui"`, `"non"`) ;
    - `weak_weight_aucs: dict[float, float | None]`, `ablation: list[Ablation]`,
      `threshold: float | None` ;
    - `lesson_auc: float | None`, `lesson_yes: YesRate | None`, `lesson_acceptance: float | None` ;
    - `library_acceptance: float | None`, `library_acceptance_complete: float | None`,
      `n_library_complete: int` ;
  - `train_model(table, labels: Labels, cfg: ModelConfig) -> TrainResult`.

- [ ] **Step 1 : écrire les tests qui échouent**

`tests_radio/test_train.py` :

```python
from pathlib import Path

from radio.core.config import ModelConfig
from radio.model.dataset import build_labels
from radio.model.stack import GROUPS
from radio.model.train import WEAK_WEIGHTS, train_model
from radio.signals.table import load_signals
from tests_radio.model_factory import add_vote, make_model_db

CFG = ModelConfig(min_votes_per_class=4, folds=3)


def test_cold_start_without_votes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    table = load_signals(conn, 10)
    r = train_model(table, build_labels(conn, table, 60), CFG)
    assert r.missing_votes == {"oui": 4, "non": 4}
    assert r.weak_weight == WEAK_WEIGHTS[-1]
    assert list(r.weak_weight_aucs) == [WEAK_WEIGHTS[-1]]
    assert r.ablation == []
    assert r.threshold is None and r.lesson_yes is None and r.library_acceptance is None
    assert r.stack.groups == GROUPS


def test_training_with_enough_votes(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path)
    for a in range(6):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    table = load_signals(conn, 10)
    r = train_model(table, build_labels(conn, table, 60), CFG)
    assert r.missing_votes == {"oui": 0, "non": 0}
    assert list(r.weak_weight_aucs) == list(WEAK_WEIGHTS)
    assert r.weak_weight in WEAK_WEIGHTS
    assert [a.removed for a in r.ablation] == list(GROUPS)
    assert r.stack.groups == tuple(a.removed for a in r.ablation if a.kept)
    assert r.threshold is not None
    assert r.lesson_auc is not None and r.lesson_auc > 0.8
    assert r.lesson_yes is not None and r.lesson_yes.rate >= 0.9
    assert r.library_acceptance is not None and r.library_acceptance > 0.5
    assert 0 <= r.n_library_complete <= r.counts["library"]
```

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_train.py -q`
Expected : FAIL (`radio.model.train` n'existe pas).

- [ ] **Step 3 : implémenter**

`radio/model/train.py` :

```python
"""Entraînement (spec §5.4, §7.3, §8).

Sans assez de votes de leçon (« oui » ET « non ») : négatifs faibles maintenus au poids le plus
fort de la grille, ni ablation ni seuil ; le modèle est rapporté mais ne peut pas être promu.

Avec assez de votes, tout se juge sur les votes de leçon notés hors pli :
- le poids des négatifs faibles ;
- l'ablation : un groupe de signaux qui n'aide pas est retiré du modèle ;
- le seuil (précision visée).
"""

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from radio.core.config import ModelConfig
from radio.model.dataset import LIBRARY, VOTE_NO, VOTE_YES, Labels, weights
from radio.model.evaluate import (
    YesRate,
    acceptance,
    auc,
    precision_at_rate,
    threshold_for_precision,
    yes_rate,
)
from radio.model.stack import GROUPS, Stack, features, fit_stack, nested_scores
from radio.signals.table import SignalTable

WEAK_WEIGHTS = (0.0, 0.1, 0.3)


@dataclass(frozen=True)
class Ablation:
    removed: str
    auc: float | None
    precision: float | None
    kept: bool


@dataclass(frozen=True)
class TrainResult:
    stack: Stack
    weak_weight: float
    counts: dict[str, int]
    missing_votes: dict[str, int]
    weak_weight_aucs: dict[float, float | None]
    ablation: list[Ablation]
    threshold: float | None
    lesson_auc: float | None
    lesson_yes: YesRate | None
    lesson_acceptance: float | None
    library_acceptance: float | None
    library_acceptance_complete: float | None
    n_library_complete: int


def _worse(x: float | None, ref: float | None) -> bool:
    return x is not None and ref is not None and x < ref


def _rank(a: float | None) -> float:
    return -1.0 if a is None else a


def train_model(table: SignalTable, labels: Labels, cfg: ModelConfig) -> TrainResult:
    ds = labels.train
    counts = ds.counts()
    missing = {
        "oui": max(0, cfg.min_votes_per_class - counts["vote_yes"]),
        "non": max(0, cfg.min_votes_per_class - counts["vote_no"]),
    }
    enough = not any(missing.values())
    votes = np.isin(ds.categories, [VOTE_YES, VOTE_NO])
    yv = ds.labels[votes]

    grid = WEAK_WEIGHTS if enough else (WEAK_WEIGHTS[-1],)
    sets = [GROUPS]
    if enough:
        sets += [tuple(g for g in GROUPS if g != r) for r in GROUPS]
    runs = {lam: nested_scores(table, ds, weights(ds, lam), cfg.folds, sets) for lam in grid}
    aucs = {lam: auc(yv, runs[lam][0][votes]) for lam in grid}
    # À égalité (ou sans AUC), le premier de la grille : le moins de négatifs faibles.
    lam = max(grid, key=lambda x: _rank(aucs[x]))
    by_set = dict(zip(sets, runs[lam], strict=True))

    ablation: list[Ablation] = []
    kept = GROUPS
    if enough:
        full = by_set[GROUPS][votes]
        full_thr = threshold_for_precision(yv, full, cfg.target_precision)
        rate = None if full_thr is None else acceptance(full, full_thr)
        full_auc = auc(yv, full)
        full_prec = None if rate is None else precision_at_rate(yv, full, rate)
        for removed in GROUPS:
            s = by_set[tuple(g for g in GROUPS if g != removed)][votes]
            a = auc(yv, s)
            p = None if rate is None else precision_at_rate(yv, s, rate)
            ablation.append(Ablation(removed, a, p, _worse(a, full_auc) or _worse(p, full_prec)))
        kept = tuple(x.removed for x in ablation if x.kept)

    w = weights(ds, lam)
    scores = by_set[kept] if kept in by_set else nested_scores(table, ds, w, cfg.folds, [kept])[0]
    threshold = threshold_for_precision(yv, scores[votes], cfg.target_precision) if enough else None
    lib = ds.categories == LIBRARY
    complete = lib & ~np.isnan(features(table, ds.rows, kept)).any(axis=1)

    def at(mask: npt.NDArray[np.bool_]) -> float | None:
        return None if threshold is None else acceptance(scores[mask], threshold)

    return TrainResult(
        stack=fit_stack(table, ds, w, cfg.folds, kept),
        weak_weight=lam,
        counts=counts,
        missing_votes=missing,
        weak_weight_aucs=aucs,
        ablation=ablation,
        threshold=threshold,
        lesson_auc=auc(yv, scores[votes]),
        lesson_yes=None if threshold is None else yes_rate(yv, scores[votes], threshold),
        lesson_acceptance=at(votes),
        library_acceptance=at(lib),
        library_acceptance_complete=at(complete),
        n_library_complete=int(complete.sum()),
    )
```

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 5 : commit**

```bash
git add radio/model/train.py tests_radio/test_train.py
git commit -m "v3-3 : entraînement (poids des négatifs faibles, ablation, seuil, garde-fou)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 8 : Examen, promotion, historique, notes des candidats

Spec §7.1, §7.2, §7.4 et §8.

**Examen.**
- Il porte sur les votes d'examen de la fenêtre (`ExamSet`).
- Il mesure deux choses :
  - l'AUC ;
  - le **taux de oui au seuil**, c'est-à-dire le taux de « oui » parmi les titres d'examen que ce
    modèle accepte, avec un intervalle de Wilson.

**Promotion.** Toutes les conditions suivantes sont requises :
- un seuil existe. Sinon : votes insuffisants, ou précision inatteignable ;
- garde-fou respecté : ≥ `library_acceptance_min` sur toute la bibliothèque ET sur la
  bibliothèque aux signaux complets, quand ces mesures existent ;
- s'il existe un modèle en service :
  - la comparaison doit être possible, c'est-à-dire que les deux AUC et les deux taux de oui
    existent. Sinon le modèle n'est pas promu (« comparaison impossible ») ;
  - AUC d'examen ≥ celle du modèle en service ;
  - taux de oui d'examen ≥ celui du modèle en service.
- Premier modèle (aucun en service) : il est promu si les deux premières conditions tiennent.
  Limite connue : sa comparaison reste à faire, et le rapport d'examen suivant la fera.

**Historique.**
- Chaque entraînement donne une ligne `models` et un fichier `modele-NNNN.joblib` dans
  `<data_dir>/models/`, promu ou non.
- Le fichier est écrit dans la même transaction que la ligne : si l'écriture échoue, la ligne
  n'existe pas.
- Le modèle en service est le dernier promu.
- `joblib.load` ne lit que les fichiers que `save_model` a écrits.

**Notes.**
- `write_scores` note tous les candidats (origine `candidate`) avec le modèle en service et
  remplace la table `scores`.
- `batch_acceptance` donne le taux d'acceptation de la dernière passe de découverte.

**Files:**
- Create: `radio/model/promote.py`
- Test: `tests_radio/test_promote.py`

**Interfaces:**
- Consumes : `TrainResult` (Task 7), `Stack` (Task 6), `ExamSet` (Task 5), `auc`, `yes_rate`,
  `YesRate` (Task 4), `ModelConfig` (Task 1).
- Produces :
  - `ExamMetrics(n: int, auc: float | None, yes: YesRate | None)` ;
  - `exam_metrics(stack, threshold: float | None, table, exam: ExamSet) -> ExamMetrics` ;
  - `Decision(promoted: bool, reasons: list[str])` ;
  - `decide(result: TrainResult, new: ExamMetrics, current: ExamMetrics | None, cfg) -> Decision` ;
  - `Serving(model_id: int, stack: Stack, threshold: float)` ;
  - `save_model(conn, models_dir: Path, result, exam: ExamMetrics, decision, cfg, now: str) -> int` ;
  - `current_model(conn, models_dir: Path) -> Serving | None` ;
  - `write_scores(conn, serving: Serving, table) -> tuple[int, int]`, qui renvoie
    `(notés, acceptés)` ;
  - `batch_acceptance(conn) -> tuple[int, int, int] | None`, qui renvoie
    `(run_id, notés, acceptés)` pour la dernière passe qui a des candidats notés.

- [ ] **Step 1 : écrire les tests qui échouent**

`tests_radio/test_promote.py` :

```python
import dataclasses
import json
from pathlib import Path
from typing import cast

import joblib
import numpy as np
import pytest

from radio.core.config import ModelConfig
from radio.model.dataset import ExamSet, build_labels
from radio.model.evaluate import YesRate
from radio.model.promote import (
    Decision,
    ExamMetrics,
    Serving,
    batch_acceptance,
    current_model,
    decide,
    exam_metrics,
    save_model,
    write_scores,
)
from radio.model.stack import Stack
from radio.model.train import TrainResult, train_model
from radio.signals.table import SignalTable, load_signals
from tests_radio.model_factory import add_vote, make_model_db

CFG = ModelConfig(min_votes_per_class=4, folds=3)
BASE = TrainResult(
    stack=cast(Stack, None),
    weak_weight=0.1,
    counts={},
    missing_votes={"oui": 0, "non": 0},
    weak_weight_aucs={},
    ablation=[],
    threshold=0.5,
    lesson_auc=0.9,
    lesson_yes=None,
    lesson_acceptance=0.4,
    library_acceptance=0.9,
    library_acceptance_complete=0.85,
    n_library_complete=10,
)
GOOD = ExamMetrics(20, 0.8, YesRate(10, 9, 0.6, 0.98))


def test_first_model_is_promoted() -> None:
    assert decide(BASE, GOOD, None, CFG) == Decision(True, ["premier modèle"])


def test_missing_votes_block_promotion() -> None:
    r = dataclasses.replace(BASE, threshold=None, missing_votes={"oui": 3, "non": 10})
    d = decide(r, GOOD, None, CFG)
    assert not d.promoted
    assert d.reasons == ["votes de leçon insuffisants : il manque 3 « oui » et 10 « non »"]


def test_unreachable_precision_blocks_promotion() -> None:
    d = decide(dataclasses.replace(BASE, threshold=None), GOOD, None, CFG)
    assert d.reasons == ["précision 90,0 % inatteignable sur les votes de leçon"]


def test_guard_rail_blocks_promotion() -> None:
    d = decide(dataclasses.replace(BASE, library_acceptance_complete=0.7), GOOD, None, CFG)
    assert d == Decision(
        False, ["garde-fou : bibliothèque acceptée (signaux complets) 70,0 % < 80,0 %"]
    )


def test_a_worse_model_is_not_promoted() -> None:
    worse = ExamMetrics(20, 0.7, YesRate(10, 8, 0.5, 0.95))
    d = decide(BASE, worse, GOOD, CFG)
    assert not d.promoted
    assert d.reasons == [
        "AUC d'examen 0,700 < 0,800 (modèle en service)",
        "taux de oui d'examen 80,0 % < 90,0 % (modèle en service)",
    ]


def test_comparison_needs_exam_votes() -> None:
    d = decide(BASE, ExamMetrics(0, None, None), GOOD, CFG)
    assert not d.promoted
    assert d.reasons[0].startswith("comparaison impossible sur l'examen (0 votes")


def test_as_good_as_current_is_promoted() -> None:
    d = decide(BASE, GOOD, GOOD, CFG)
    assert d == Decision(True, ["au moins aussi bon que le modèle en service sur l'examen"])


def trained(tmp_path: Path):  # type: ignore[no-untyped-def]
    conn = make_model_db(tmp_path)
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    add_vote(conn, 200600, "exam", "oui")
    add_vote(conn, 300600, "exam", "non")
    table = load_signals(conn, 10)
    labels = build_labels(conn, table, 60)
    return conn, table, labels, train_model(table, labels, CFG)


def test_history_and_serving_model(tmp_path: Path) -> None:
    conn, table, labels, r = trained(tmp_path)
    assert r.threshold is not None
    exam = exam_metrics(r.stack, r.threshold, table, labels.exam)
    assert exam.n == 2 and exam.auc == 1.0
    models = tmp_path / "models"
    first = save_model(conn, models, r, exam, Decision(False, ["x"]), CFG, "d1")
    assert current_model(conn, models) is None
    second = save_model(conn, models, r, exam, Decision(True, ["premier modèle"]), CFG, "d2")
    assert (first, second) == (1, 2)
    serving = current_model(conn, models)
    assert serving is not None and serving.model_id == 2
    assert serving.threshold == r.threshold
    rows = labels.exam.rows
    assert np.allclose(serving.stack.predict(table, rows), r.stack.predict(table, rows))
    row = conn.execute("SELECT * FROM models WHERE model_id = 2").fetchone()
    assert row["file"] == "modele-0002.joblib" and row["promoted"] == 1
    assert json.loads(row["params"])["weak_weight"] == r.weak_weight
    assert json.loads(row["metrics"])["exam"]["auc"] == 1.0


def test_exam_metrics_without_exam() -> None:
    empty = ExamSet(np.zeros(0, dtype=np.int64), np.zeros(0, dtype=np.int64), None)
    got = exam_metrics(cast(Stack, None), 0.5, cast(SignalTable, None), empty)
    assert got == ExamMetrics(0, None, None)


def test_write_scores_and_batch_acceptance(tmp_path: Path) -> None:
    conn, table, _, r = trained(tmp_path)
    assert r.threshold is not None
    conn.execute(
        "INSERT INTO discover_runs VALUES (1, 'd', 'd', 'done'), (2, 'd', 'd', 'done')"
    )
    conn.execute("INSERT INTO candidates VALUES (200000, 1, 1000, 2000)")
    conn.execute("INSERT INTO candidates VALUES (200700, 2, 1000, 2007)")
    conn.execute("INSERT INTO candidates VALUES (300700, 2, 1000, 3007)")
    conn.commit()
    model_id = save_model(
        conn, tmp_path / "m", r, ExamMetrics(0, None, None), Decision(True, ["p"]), CFG, "d"
    )
    n, accepted = write_scores(conn, Serving(model_id, r.stack, r.threshold), table)
    n_candidates = conn.execute(
        "SELECT COUNT(*) FROM tracks t JOIN track_measures m USING (deezer_track_id) "
        "WHERE t.origin = 'candidate' AND m.status = 'ok'"
    ).fetchone()[0]
    assert n == n_candidates
    assert tuple(conn.execute("SELECT COUNT(*), SUM(accepted) FROM scores").fetchone()) == (
        n,
        accepted,
    )
    assert batch_acceptance(conn) == (
        2,
        2,
        conn.execute(
            "SELECT SUM(accepted) FROM scores WHERE deezer_track_id IN (200700, 300700)"
        ).fetchone()[0],
    )
    write_scores(conn, Serving(model_id, r.stack, r.threshold), table)
    assert conn.execute("SELECT COUNT(*) FROM scores").fetchone()[0] == n


def test_current_model_file_must_be_a_stack(tmp_path: Path) -> None:
    conn = make_model_db(tmp_path, n_artists=2, per_artist=1)
    models = tmp_path / "models"
    models.mkdir()
    joblib.dump({"pas": "un modèle"}, models / "modele-0001.joblib")
    conn.execute(
        "INSERT INTO models VALUES (1, 'd', 'modele-0001.joblib', 0.5, 1, 'v', '{}', '{}')"
    )
    conn.commit()
    with pytest.raises(ValueError, match="n'est pas un modèle"):
        current_model(conn, models)
```

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_promote.py -q`
Expected : FAIL (`radio.model.promote` n'existe pas).

- [ ] **Step 3 : implémenter**

`radio/model/promote.py` :

```python
"""Examen, promotion et historique (spec §7) ; notes des candidats par le modèle en service.

Un nouveau modèle n'est mis en service que s'il a un seuil, respecte le garde-fou et fait au
moins aussi bien que le modèle courant sur les votes d'examen (AUC et taux de oui au seuil).
Chaque entraînement est historisé (table `models`, fichier joblib), promu ou non.
"""

import dataclasses
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import sklearn

from radio.core.config import ModelConfig
from radio.model.dataset import ExamSet
from radio.model.evaluate import YesRate, auc, yes_rate
from radio.model.stack import SEED, Stack
from radio.model.train import TrainResult
from radio.signals.audio import MODEL_TAG
from radio.signals.table import SignalTable


def _pct(x: float) -> str:
    return f"{100 * x:.1f} %".replace(".", ",")


@dataclass(frozen=True)
class ExamMetrics:
    n: int
    auc: float | None
    yes: YesRate | None


def exam_metrics(
    stack: Stack, threshold: float | None, table: SignalTable, exam: ExamSet
) -> ExamMetrics:
    if len(exam.rows) == 0:
        return ExamMetrics(0, None, None)
    s = stack.predict(table, exam.rows)
    yes = None if threshold is None else yes_rate(exam.labels, s, threshold)
    return ExamMetrics(len(exam.rows), auc(exam.labels, s), yes)


@dataclass(frozen=True)
class Decision:
    promoted: bool
    reasons: list[str]


def decide(
    result: TrainResult, new: ExamMetrics, current: ExamMetrics | None, cfg: ModelConfig
) -> Decision:
    if result.threshold is None:
        m = result.missing_votes
        if any(m.values()):
            why = f"votes de leçon insuffisants : il manque {m['oui']} « oui » et {m['non']} « non »"
        else:
            why = f"précision {_pct(cfg.target_precision)} inatteignable sur les votes de leçon"
        return Decision(False, [why])
    reasons = []
    for name, rate in (
        ("bibliothèque acceptée", result.library_acceptance),
        ("bibliothèque acceptée (signaux complets)", result.library_acceptance_complete),
    ):
        if rate is not None and rate < cfg.library_acceptance_min:
            reasons.append(f"garde-fou : {name} {_pct(rate)} < {_pct(cfg.library_acceptance_min)}")
    if current is not None:
        if new.auc is None or current.auc is None or new.yes is None or current.yes is None:
            reasons.append(
                f"comparaison impossible sur l'examen ({new.n} votes : il faut des « oui », des "
                "« non » et des titres acceptés par les deux modèles)"
            )
        else:
            if new.auc < current.auc:
                reasons.append(
                    f"AUC d'examen {new.auc:.3f} < {current.auc:.3f} (modèle en service)".replace(
                        ".", ","
                    )
                )
            if new.yes.rate < current.yes.rate:
                reasons.append(
                    f"taux de oui d'examen {_pct(new.yes.rate)} < {_pct(current.yes.rate)} "
                    "(modèle en service)"
                )
    if reasons:
        return Decision(False, reasons)
    first = current is None
    return Decision(
        True,
        ["premier modèle" if first else "au moins aussi bon que le modèle en service sur l'examen"],
    )


@dataclass(frozen=True)
class Serving:
    model_id: int
    stack: Stack
    threshold: float


def _params(result: TrainResult, cfg: ModelConfig) -> dict[str, Any]:
    return {
        "weak_weight": result.weak_weight,
        "groups": list(result.stack.groups),
        "vocabulary_size": len(result.stack.vocabulary),
        "folds": cfg.folds,
        "target_precision": cfg.target_precision,
        "seed": SEED,
        "embedding": MODEL_TAG,
        "sklearn": sklearn.__version__,
    }


def _metrics(result: TrainResult, exam: ExamMetrics) -> dict[str, Any]:
    def yes(y: YesRate | None) -> dict[str, Any] | None:
        return None if y is None else dataclasses.asdict(y)

    return {
        "counts": result.counts,
        "missing_votes": result.missing_votes,
        "weak_weight_aucs": {str(k): v for k, v in result.weak_weight_aucs.items()},
        "ablation": [dataclasses.asdict(a) for a in result.ablation],
        "lesson_auc": result.lesson_auc,
        "lesson_yes": yes(result.lesson_yes),
        "lesson_acceptance": result.lesson_acceptance,
        "library_acceptance": result.library_acceptance,
        "library_acceptance_complete": result.library_acceptance_complete,
        "n_library_complete": result.n_library_complete,
        "exam": {"n": exam.n, "auc": exam.auc, "yes": yes(exam.yes)},
    }


def save_model(
    conn: sqlite3.Connection,
    models_dir: Path,
    result: TrainResult,
    exam: ExamMetrics,
    decision: Decision,
    cfg: ModelConfig,
    now: str,
) -> int:
    models_dir.mkdir(parents=True, exist_ok=True)
    with conn:
        cur = conn.execute(
            """
            INSERT INTO models (trained_at, file, threshold, promoted, verdict, params, metrics)
            VALUES (?, '', ?, ?, ?, ?, ?)
            """,
            (
                now,
                result.threshold,
                int(decision.promoted),
                " ; ".join(decision.reasons),
                json.dumps(_params(result, cfg)),
                json.dumps(_metrics(result, exam)),
            ),
        )
        model_id = cur.lastrowid
        assert model_id is not None
        file = f"modele-{model_id:04d}.joblib"
        # Dans la transaction : si l'écriture du fichier échoue, la ligne n'existe pas.
        joblib.dump(result.stack, models_dir / file)
        conn.execute("UPDATE models SET file = ? WHERE model_id = ?", (file, model_id))
    return model_id


def current_model(conn: sqlite3.Connection, models_dir: Path) -> Serving | None:
    """Le dernier modèle promu. joblib ne lit que les fichiers écrits par save_model."""
    row = conn.execute(
        "SELECT model_id, file, threshold FROM models WHERE promoted = 1 "
        "ORDER BY model_id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return None
    stack = joblib.load(models_dir / row["file"])
    if not isinstance(stack, Stack):
        raise ValueError(f"{row['file']} n'est pas un modèle AubeSonore")
    return Serving(int(row["model_id"]), stack, float(row["threshold"]))


def write_scores(conn: sqlite3.Connection, serving: Serving, table: SignalTable) -> tuple[int, int]:
    rows = np.flatnonzero(np.array(table.origins) == "candidate").astype(np.int64)
    scores = serving.stack.predict(table, rows) if len(rows) else np.zeros(0)
    accepted = scores >= serving.threshold
    with conn:
        conn.execute("DELETE FROM scores")
        conn.executemany(
            "INSERT INTO scores VALUES (?, ?, ?, ?)",
            [
                (int(table.track_ids[i]), serving.model_id, float(s), int(a))
                for i, s, a in zip(rows, scores, accepted, strict=True)
            ],
        )
    return len(rows), int(accepted.sum())


def batch_acceptance(conn: sqlite3.Connection) -> tuple[int, int, int] | None:
    """Taux d'acceptation de la dernière passe de découverte (spec §7.3)."""
    row = conn.execute(
        """
        SELECT c.run_id, COUNT(*), SUM(s.accepted)
        FROM scores s JOIN candidates c USING (deezer_track_id)
        GROUP BY c.run_id ORDER BY c.run_id DESC LIMIT 1
        """
    ).fetchone()
    return None if row is None else (int(row[0]), int(row[1]), int(row[2]))
```

`assert model_id is not None` est une garde de typage : `lastrowid` vaut toujours un entier après
un `INSERT` réussi.

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 5 : commit**

```bash
git add radio/model/promote.py tests_radio/test_promote.py
git commit -m "v3-3 : examen, promotion, historique des modèles, notes des candidats

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 9 : La commande `radio train`, et le bout en bout

Enchaînement :
1. Lire les signaux et les étiquettes, puis charger le modèle en service. Un fichier illisible
   donne le code 2.
2. Entraîner.
3. Faire l'examen du nouveau modèle et de celui en service. Le modèle en service note une table
   chargée avec **son** vocabulaire. L'ensemble des lignes ne dépend pas du vocabulaire, donc les
   indices d'examen sont les mêmes.
4. Décider, puis historiser.
5. Noter les candidats avec le modèle en service : le nouveau s'il est promu, sinon l'ancien,
   sinon aucun.
6. Rapporter.

Codes de sortie :
- 1 si les exemples sont insuffisants (`MissingExamplesError`, par exemple aucun négatif mesuré) ;
- 2 si le modèle en service est illisible.

**Files:**
- Modify: `radio/cli.py` (commande `train`, `_train_lines` et ses aides)
- Test: `tests_radio/test_cli_train.py`

**Interfaces:**
- Consumes :
  - `load_signals` (avec `vocabulary=`), `_missing_lines` et `_ORIGINS` (Task 2) ;
  - `build_labels`, `Labels` et `MissingExamplesError` (Task 5) ;
  - `train_model` et `TrainResult` (Task 7) ;
  - `exam_metrics`, `decide`, `save_model`, `current_model`, `write_scores`,
    `batch_acceptance`, `Serving`, `ExamMetrics` et `Decision` (Task 8) ;
  - `YesRate` (Task 4) ;
  - `Editorial.model` (Task 1).
- Produces : la commande `radio train`.

- [ ] **Step 1 : écrire les tests qui échouent**

`tests_radio/test_cli_train.py` :

```python
import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

import radio.cli as cli
from radio.core.config import Settings
from tests_radio.model_factory import add_vote, make_model_db

runner = CliRunner()


@pytest.fixture
def env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "editorial.toml").write_text("[model]\nmin_votes_per_class = 4\nfolds = 3\n")
    settings = Settings(_env_file=None, RADIO_DATA_DIR=tmp_path / "data", RADIO_CONFIG_DIR=cfg)
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    return tmp_path


def test_cold_start_trains_but_does_not_promote(env: Path) -> None:
    make_model_db(env / "data").close()
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    out = res.output
    assert "Exemples : bibliothèque 48, oui 0, non 0, négatifs faibles 48" in out
    assert "Valeurs absentes (candidats) : " in out
    assert "Votes de leçon insuffisants : il manque 4 « oui » et 4 « non »" in out
    assert "Modèle n°1 : non promu — votes de leçon insuffisants" in out
    assert "Aucun modèle en service : candidats non notés" in out
    assert (env / "data" / "models" / "modele-0001.joblib").exists()


def test_train_promotes_then_compares(env: Path) -> None:
    conn = make_model_db(env / "data")
    for a in range(5):
        add_vote(conn, (2000 + a) * 100, "lesson", "oui")
        add_vote(conn, (3000 + a) * 100, "lesson", "non")
    add_vote(conn, 200600, "exam", "oui")
    add_vote(conn, 300600, "exam", "non")
    add_vote(conn, 200700, "exam", "oui")
    conn.close()

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert "Modèle n°1 : promu — premier modèle" in res.output
    assert "Signaux gardés : son" in res.output
    assert "Examen (nouveau modèle) : 3 votes, AUC 1,000" in res.output
    assert "Candidats notés par le modèle n°1 : " in res.output

    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 0, res.output
    assert "Examen (modèle en service) : 3 votes" in res.output
    assert "Modèle n°2 : promu — au moins aussi bon que le modèle en service" in res.output


def test_train_without_negatives_exits_1(env: Path) -> None:
    conn = make_model_db(env / "data", n_artists=4, per_artist=2)
    conn.execute("DELETE FROM track_measures WHERE deezer_track_id >= 400000")
    conn.commit()
    conn.close()
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 1
    assert "Exemples insuffisants" in res.output


def test_unreadable_serving_model_exits_2(env: Path) -> None:
    conn = make_model_db(env / "data", n_artists=4, per_artist=2)
    conn.execute(
        "INSERT INTO models VALUES (1, 'd', 'modele-0001.joblib', 0.5, 1, 'v', ?, '{}')",
        (json.dumps({}),),
    )
    conn.commit()
    conn.close()
    res = runner.invoke(cli.app, ["train"])
    assert res.exit_code == 2
    assert "Modèle en service illisible : FileNotFoundError" in res.output
```

- [ ] **Step 2 : vérifier l'échec**

Run : `uv run pytest tests_radio/test_cli_train.py -q`
Expected : FAIL (commande `train` inconnue).

- [ ] **Step 3 : implémenter**

Dans `radio/cli.py`, ajouter les imports :

```python
from radio.core.config import ModelConfig
from radio.model.dataset import Labels, MissingExamplesError, build_labels
from radio.model.evaluate import YesRate
from radio.model.promote import (
    Decision,
    ExamMetrics,
    Serving,
    batch_acceptance,
    current_model,
    decide,
    exam_metrics,
    save_model,
    write_scores,
)
from radio.model.train import TrainResult, train_model
```

(`ModelConfig` rejoint l'import existant `from radio.core.config import Settings, load_editorial`.)

Puis, à la fin du fichier :

```python
def _dec(x: float | None, digits: int = 3) -> str:
    return "—" if x is None else f"{x:.{digits}f}".replace(".", ",")


def _opt_rate(x: float | None) -> str:
    return "—" if x is None else _rate(x)


def _yes(y: YesRate | None) -> str:
    if y is None:
        return "aucun titre accepté"
    return (
        f"taux de oui {_rate(y.rate)} [{_rate(y.low)} – {_rate(y.high)}] sur {_n(y.n)} acceptés"
    )


def _exam_line(label: str, e: ExamMetrics) -> str:
    if e.n == 0:
        return f"{label} : aucun vote d'examen"
    return f"{label} : {_n(e.n)} votes, AUC {_dec(e.auc)}, {_yes(e.yes)}"


def _train_lines(
    r: TrainResult,
    labels: Labels,
    table: SignalTable,
    new: ExamMetrics,
    cur: ExamMetrics | None,
    decision: Decision,
    model_id: int,
    scored: tuple[int, int, int] | None,
    batch: tuple[int, int, int] | None,
    cfg: ModelConfig,
) -> list[str]:
    c = r.counts
    lines = [
        f"Exemples : bibliothèque {_n(c['library'])}, oui {_n(c['vote_yes'])}, "
        f"non {_n(c['vote_no'])}, négatifs faibles {_n(c['weak'])} "
        f"({_n(labels.n_weak_excluded)} écartés) ; examen {_n(len(labels.exam.rows))} "
        f"(dernier vote : {labels.exam.last_vote or 'aucun'}) ; "
        f"{_n(labels.n_votes_unmeasured)} votes sans signaux",
        *_missing_lines(table),
    ]
    m = r.missing_votes
    if any(m.values()):
        lines.append(
            f"Votes de leçon insuffisants : il manque {_n(m['oui'])} « oui » et {_n(m['non'])} "
            f"« non » ; négatifs faibles maintenus (poids {_dec(r.weak_weight, 1)}), "
            "ni seuil ni ablation"
        )
    lines.append(
        "Poids des négatifs faibles : "
        + " ; ".join(f"{_dec(k, 1)} → AUC {_dec(v)}" for k, v in r.weak_weight_aucs.items())
        + f" ; retenu {_dec(r.weak_weight, 1)}"
    )
    for a in r.ablation:
        verdict = "gardé" if a.kept else "retiré"
        lines.append(
            f"  sans {a.removed} : AUC {_dec(a.auc)}, précision {_opt_rate(a.precision)} "
            f"→ {verdict}"
        )
    lines.append("Signaux gardés : " + ", ".join(("son", *r.stack.groups)))
    if r.threshold is None:
        lines.append(
            f"Leçon (hors pli) : AUC {_dec(r.lesson_auc)}, aucun seuil "
            f"(précision visée {_rate(cfg.target_precision)})"
        )
    else:
        lines.append(
            f"Leçon (hors pli) : AUC {_dec(r.lesson_auc)}, seuil {_dec(r.threshold)} → "
            f"{_yes(r.lesson_yes)}, {_opt_rate(r.lesson_acceptance)} des votes acceptés"
        )
        lines.append(
            f"Garde-fou : bibliothèque acceptée {_opt_rate(r.library_acceptance)} (artiste "
            f"retiré), {_opt_rate(r.library_acceptance_complete)} sur "
            f"{_n(r.n_library_complete)} titres aux signaux complets ; minimum "
            f"{_rate(cfg.library_acceptance_min)}"
        )
    lines.append(_exam_line("Examen (nouveau modèle)", new))
    if cur is not None:
        lines.append(_exam_line("Examen (modèle en service)", cur))
    verdict = "promu" if decision.promoted else "non promu"
    lines.append(f"Modèle n°{model_id} : {verdict} — " + " ; ".join(decision.reasons))
    if scored is None:
        lines.append("Aucun modèle en service : candidats non notés")
    else:
        sid, n, acc = scored
        lines.append(
            f"Candidats notés par le modèle n°{sid} : {_n(n)}, {_n(acc)} acceptés ({_pct(acc, n)})"
        )
    if batch is not None:
        run_id, n, acc = batch
        alert = n > 0 and acc / n < cfg.candidate_acceptance_alert
        lines.append(
            f"Dernière fournée (passe n°{run_id}) : {_pct(acc, n)} acceptés"
            + (f" — ALERTE : sous {_rate(cfg.candidate_acceptance_alert)}" if alert else "")
        )
    return lines


@app.command()
def train() -> None:
    """Entraîne le modèle, le compare au modèle en service et note les candidats."""
    _logging()
    settings = _settings()
    editorial = load_editorial(settings.config_dir / "editorial.toml")
    cfg = editorial.model
    size = editorial.signals.culture_vocabulary
    models_dir = settings.data_dir / "models"
    conn = connect(settings.data_dir / "radio.db")
    try:
        table = load_signals(conn, size)
        labels = build_labels(conn, table, cfg.exam_window)
        try:
            current = current_model(conn, models_dir)
        except (OSError, ValueError, EOFError) as e:
            _fail(f"Modèle en service illisible : {type(e).__name__}", 2)
        result = train_model(table, labels, cfg)
        new_exam = exam_metrics(result.stack, result.threshold, table, labels.exam)
        cur_exam = None
        cur_table = None
        if current is not None:
            # Même ensemble de lignes que `table` : seul le vocabulaire (colonnes) change.
            cur_table = load_signals(conn, size, vocabulary=current.stack.vocabulary)
            cur_exam = exam_metrics(current.stack, current.threshold, cur_table, labels.exam)
        decision = decide(result, new_exam, cur_exam, cfg)
        now = datetime.now(UTC).isoformat()
        model_id = save_model(conn, models_dir, result, new_exam, decision, cfg, now)
        serving, serving_table = current, cur_table
        if decision.promoted and result.threshold is not None:
            serving, serving_table = Serving(model_id, result.stack, result.threshold), table
        scored = None
        batch = None
        if serving is not None and serving_table is not None:
            n, acc = write_scores(conn, serving, serving_table)
            scored = (serving.model_id, n, acc)
            batch = batch_acceptance(conn)
    except MissingExamplesError:
        _fail(
            "Exemples insuffisants (il faut des titres de la bibliothèque et des négatifs "
            "mesurés) : lancer radio negatives-sync puis radio signals",
            1,
        )
    finally:
        conn.close()
    for line in _train_lines(
        result, labels, table, new_exam, cur_exam, decision, model_id, scored, batch, cfg
    ):
        typer.echo(line)
```

Attention : `train` est aussi le nom de la commande typer. La fonction du module s'appelle donc
`train_model`, pour ne pas la masquer.

- [ ] **Step 4 : vérifier**

Run : `uv run pytest tests_radio -q && uv run mypy && uv run ruff check . && uv run ruff format --check .`
Expected : tout vert.

- [ ] **Step 5 : commit**

```bash
git add radio/cli.py tests_radio/test_cli_train.py
git commit -m "v3-3 : commande radio train (examen, promotion, notes, rapport)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SAgqYCXZxrxTUVBA3CFRKY"
```

---

### Task 10 : Essai réel (contrôleur, pas de sous-agent)

Il dépend de la fin de `radio signals` (v3-2 Task 12) et des votes de Victor sur le banc.

- [ ] **Step 1 :** attendre la fin de `signals`, puis sauvegarder la base :
  `cp data/radio.db data/radio.db.avant-v3-3`.
- [ ] **Step 2 :** lire les votes du banc avec l'outil Artifact : `read_db`, collection `votes`,
  `out_dir` dans le scratchpad. Puis lancer
  `uv run radio votes-import <out_dir>/votes <scratchpad>/ecoute/series.json`.
- [ ] **Step 3 :** si des titres ont été ajoutés, relancer `nice -n 19 uv run radio signals`,
  qui ne mesure que les nouveaux titres.
- [ ] **Step 4 :** lancer `nice -n 19 uv run radio train > data/train-1.log 2>&1`.
- [ ] **Step 5 : contrôles.**
  - Chercher des secrets dans le journal (`grep` des motifs `dzcdn`, `hdnea`, `api_key`,
    `X-Plex-Token`).
  - Lire les absences par origine.
  - Proximité des artistes de la bibliothèque, artiste retiré (revue v3-2 point 7) : distribution
    de `match Last.fm` pour la bibliothèque face aux candidats, par un script du scratchpad.
  - Avec moins de 10 « oui » ou « non » de leçon, le rapport doit dire combien il en manque, et
    Victor doit voter.
- [ ] **Step 6 :** rapport à Victor en français, puis mise à jour de la mémoire du projet.
