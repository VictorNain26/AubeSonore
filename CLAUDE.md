# musilogy

Couche 0 : deux dumps JSON MusicBrainz transformés en cinq tables Parquet
reproductibles. Les règles métier et les chiffres sont dans le `README.md` ; ce
fichier décrit comment on travaille sur ce dépôt.

Les conventions qui ne servent qu'à un endroit sont chargées à la demande :
`.claude/rules/sql.md` en ouvrant `src/musilogy/sql/`, `.claude/rules/tests.md`
en ouvrant `tests/`, et `/baseline` pour instruire un écart à la ligne de base.

## Python

- Python 3.12, `uv` pour l'environnement et l'exécution, dépendances épinglées
  au patch près — la reproductibilité du pipeline en dépend autant que le code.
- `pathlib` partout, et des chemins ancrés sur le paquet plutôt que sur le
  répertoire courant : `musilogy.paths` existe pour ça, et la suite de tests
  doit passer depuis n'importe où.
- Séparer le calcul de l'entrée-sortie, comme le fait déjà le paquet :
  `extract.py` projette sans règle métier, `build.py` orchestre, `publish.py`
  écrit. Une fonction qui fait les deux est difficile à tester.
- `ruff` pour le lint et le format, `mypy` pour les types. `ty` est plus rapide
  et cohérent avec l'outillage Astral, mais il est encore en 0.0.x : adosser la
  vérification de types à un outil dont la sémantique peut bouger contredit
  l'épinglage au patch près que le reste du dépôt s'impose.

## Architecture

- **La couche 0 produit des tables, pas des vues d'affichage.** Un filtre qui
  sert au rendu appartient à la projection (`density`, export web) ; la
  population reste complète. Confondre les deux fait disparaître des données
  qu'on ne sait plus récupérer en aval.
- **Une valeur dérivée voyage avec sa provenance.** Publier `y0` à côté de
  `y0_source` permet au consommateur de distinguer une donnée déclarée d'une
  donnée inférée, au lieu de lui faire confiance à l'aveugle.
- **Les règles vivent dans le SQL** ; le Python enchaîne et vérifie, il
  n'arbitre pas.
- **Une donnée de référence n'a qu'un seul point d'autorité.** Le contrat
  exécutable des chiffres est `tests/test_baseline.py`. Un chiffre repris
  ailleurs — README, commentaire — est descriptif et doit se donner comme tel :
  c'est la duplication silencieuse qui finit par diverger, et c'est la source
  la plus courante de documentation qui se contredit.

## Mesurer plutôt que raisonner

Les extractions complètes vivent dans `data/work/` et DuckDB lit un JSONL de
400 Mo en quelques secondes. Une question chiffrée — « combien de groupes perd
cette règle ? », « ce changement bouge-t-il la densité ? » — se tranche par une
requête, pas par un raisonnement plausible, et le résultat est opposable. Le
pipeline étant déterministe, un contrefactuel est toujours possible.

C'est aussi ce qui rend le travail délégué praticable ici : un critère
d'acceptation se donne en nombre ou en code de sortie. « `density` doit valoir
52 201 cellules » vaut mieux que « corriger la densité ».

## Dépôt

- Les sorties du pipeline (`data/`) ne sont pas versionnées — seules les
  empreintes et les fixtures le sont. La livraison web (`web/public/data/`)
  fait exception : elle est versionnée, et `tests/test_delivery.py` la garde
  contre son manifeste.
- La CI passe le lint, les types et la suite rapide ; la suite lente exige le
  dump et tourne à la demande.

## Commandes

```bash
uv sync
uv run pre-commit install     # une fois par clone : ruff check --fix et format à chaque commit
uv run pytest                 # suite rapide, sur les témoins
uv run pytest -m slow         # ligne de base sur le dump réel, exige data/work/
uv run musilogy run           # fetch → extract → transform → validate → publish
uv run musilogy make-fixtures
uv run musilogy make-web-fixtures
uv run musilogy sync-web      # copie la livraison courante dans web/public/data/
```

Avant de pousser, la CI exige aussi le gate web, à lancer depuis `web/` :

```bash
pnpm install
pnpm run check
pnpm run types
pnpm run test
```

## Licence

Les données de base MusicBrainz sont CC0, mais les genres et tags sont
CC-BY-NC-SA 3.0. Comme `bands` et `genres` en dépendent, le jeu produit est
CC-BY-NC-SA 3.0 : attribution, usage non commercial, partage à l'identique. Les
fixtures versionnées suivent la même licence. Toute question de diffusion des
sorties part de là.
