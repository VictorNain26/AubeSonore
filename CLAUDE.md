# CLAUDE.md — pipeline AubeSonore

## Ce que fait ce dépôt

Le goût et la découverte de la radio : lire la bibliothèque Plex de Victor, découvrir des titres
voisins, les noter par un modèle de goût appris sur la bibliothèque et sur les votes de Victor,
et retenir le tiers le mieux noté de chaque fournée. La conception est dans
`docs/superpowers/specs/2026-09-24-gout-decouverte-v3-design.md`, amendée par
`docs/superpowers/research/2026-09-30-modele-audio-seul.md`. L'exploitation est décrite dans
`docs/exploitation.md`.

Rien ici ne publie encore sur AzuraCast. L'acquisition, l'analyse, l'enchaînement et la
publication feront l'objet de specs ultérieures. En attendant, la station tourne en natif
AzuraCast sur ses playlists existantes.

## Commandes

```bash
uv sync                                  # dépendances (.venv)
.venv/bin/pytest -q -W error             # suite complète, ~12 s, sans réseau
.venv/bin/ruff check radio tests_radio && .venv/bin/ruff format --check radio tests_radio
.venv/bin/mypy                           # strict
.venv/bin/radio --help                   # library-sync, discover, negatives-sync, signals,
                                         # train, report, votes-select, votes-serve, votes-remind
```

## Invariants

- **Plex est la seule vérité, en lecture seule.** Section `Musique` uniquement (jamais
  « Musique second wave »), racine `/media/plex/Musique`. Ne jamais lire, lister ni référencer le
  disque de Maël (`/media/musique`), pas même par un `find`.
- **Aucun secret dans les journaux, exceptions, tests ou commits.** Cela vaut pour le jeton Plex,
  la clé Last.fm (passée en paramètre de requête : `urllib3` reste à ERROR), les URL d'extraits
  Deezer (signées : jamais stockées) et la clé CallMeBot. Le `.env` est illisible par l'agent.
- **Un repli silencieux est pire qu'une panne.** Tout ce qui est sauté est compté et nommé dans le
  rapport de la commande.
- **Seuls les votes d'examen jugent un modèle.** Un vote d'examen n'est jamais un exemple
  d'entraînement.
- **Pas d'usine à gaz.** Un signal ou un mécanisme qui ne prouve pas son utilité sur les votes
  est retiré. Pas de garde défensive entre fonctions internes.

## Pièges

- `signals` mesure environ 3 s par titre (EffNet sur un fil). Un rattrapage de milliers de titres
  prend des heures : le lancer à la main, en `nice`. Ne pas lancer `train` pendant `signals`.
- Recherche Deezer : le filtre avancé `artist:"…"` est cassé côté Deezer. Il faut requêter en
  texte simple, puis laisser `pick_match` juger.
- Les migrations SQLite suivent la procédure officielle de reconstruction de table. Un script ne
  contient ni `BEGIN` ni `COMMIT`.
- Les unités systemd de `deploy/systemd/` sont liées par `systemctl --user link`. Il faut les
  re-lier si le dépôt change de place.
