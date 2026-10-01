# AubeSonore — vision

Seul document de conception et d'exploitation du pipeline. Les preuves (mesures, sources datées)
sont dans `docs/recherches/`. Quand le système réel contredit ce document, le système a raison et
ce document se corrige.

État au 2026-10-01 : les étapes 1 à 7 tournent chaque semaine, la CI et Gatus surveillent, la
page de vote est en service. L'antenne ne diffuse plus que `antenne/` depuis la bascule (§7.2).

## 1. But

AubeSonore est une webradio de découverte dans la couleur de Victor : des titres qu'il ne connaît
pas, qu'il aurait pu choisir, enchaînés selon le moment de la journée.

**Critères de réussite**

- **Goût.** Taux de « oui » à l'aveugle sur les titres retenus, mesuré avec son intervalle de
  Wilson. L'horizon est 90 %, mais Victor ne se répète lui-même qu'à 85 % [64–95 %] : c'est le
  plafond (`recherches/2026-09-30-modele-audio-seul.md`).
- **Antenne.** Le flux ne s'arrête jamais et joue la bibliothèque d'antenne, pas le secours.
- **Renouvellement.** Chaque semaine, des découvertes entrent à l'antenne.

## 2. Principes

- **Plex est la seule vérité du goût, en lecture seule.** Section `Musique`, racine
  `/media/plex/Musique`. Jamais « Musique second wave ». Jamais le disque de Maël
  (`/media/musique`), pas même un `find`.
- **AzuraCast fait autorité sur l'antenne.** La base du pipeline s'y réaligne. Un média inconnu
  du pipeline est signalé, jamais supprimé.
- **Rien d'inventé.** Un outil existant, maintenu et vérifié le jour du choix, plutôt que du code
  maison. Le code du pipeline n'est que la colle entre ces outils.
- **Un repli silencieux est pire qu'une panne.** Tout ce qui est sauté est compté et nommé dans
  le rapport de passe.
- **Tout se mesure.** Un signal ou un mécanisme qui ne prouve pas son utilité est retiré.
- **Aucun secret** dans les journaux, les exceptions, les tests ou les commits : jeton Plex, clés
  Last.fm, CallMeBot et Soulseek, URL d'extraits Deezer signées.

## 3. La chaîne

```
Plex ─► 1 bibliothèque ─► 2 découverte ─► 3 empreinte ─► 4 goût ─► 5 acquisition
                                                           ▲             │
                                              votes ───────┘             ▼
                                                            6 préparation ─► 7 antenne ─► AzuraCast
```

Une passe hebdomadaire enchaîne les étapes. Chacune écrit ses compteurs dans le rapport de passe
(§8.1) et s'arrête proprement si une source tombe : le travail fait est gardé et la passe
suivante reprend.

| Étape | Rôle | Outils | État |
|---|---|---|---|
| 1 Bibliothèque | Lire Plex, rapprocher chaque titre de Deezer (strict : artiste, titre, durée ±3 s) | python-plexapi, API Deezer | fait |
| 2 Découverte | 15 graines par semaine, tirées selon l'écoute ; voisins confirmés par Deezer `related` ET Last.fm `getSimilar` (`recherches/2026-09-24-sources-decouverte.md`) ; 10 titres par voisin | API Deezer, Last.fm | fait |
| 3 Empreinte | Empreinte Discogs-EffNet de l'extrait Deezer de 30 s | essentia-tensorflow, modèle MTG épinglé | fait |
| 4 Goût | Régression logistique sur l'empreinte ; chaque fournée est classée et son tiers le mieux noté est retenu | scikit-learn | fait |
| 5 Acquisition | Télécharger les retenus en MP3 et prouver l'identité de chaque fichier | Sockseek, ffprobe, fpcalc | en service |
| 6 Préparation | FLAC → V0, ReplayGain, balises | ffmpeg, rsgain | en service |
| 7 Antenne | Tenir la bibliothèque d'antenne et la publier sur AzuraCast | API AzuraCast | en service |
| 8 Enchaînement | Fil qui dérive selon une grille 7 × 24 h | — | plus tard (§7.3) |

## 4. Le goût (étapes 1 à 4)

- **Positifs.** Les titres de la bibliothèque, pondérés par l'écoute (`1 + log(1 + écoutes)`,
  plafonné à 4), et les « oui » de leçon.
- **Négatifs.** Les « non » de leçon, et les négatifs faibles de démarrage
  (`config/negatives.toml`, curation sourcée dans `recherches/2026-09-24-negatifs-curation.md`)
  au poids de 0,1.
- **Poids des classes.** Chacune pèse 1 au total. C = 0,1. Les réglages ont été fixés sur les
  159 votes du banc.
- **Signaux retirés.** Popularité, tags et proximité étaient au niveau du hasard (AUC 0,52 à 0,58).
  L'empreinte seule donne une AUC d'examen de 0,82, contre 0,76 pour l'ancien modèle empilé.
- **Rétention.** Pour chaque fournée, le tiers le mieux noté est retenu (`keep_fraction`).
- **Pistes écartées après mesure** : ressemblance kNN sur l'empreinte (AUC 0,67), filtre
  « couleur » à négatifs par catégories, têtes de style Essentia, modèle Jev (texte seul). Leurs
  recherches sont dans l'historique git (`git show f7d7081:docs/recherches/`).

**Votes.** Chaque semaine, 10 titres d'examen et 10 de leçon, présentés à l'aveugle.

- **Examen.** Tirage uniforme sur toute la fournée. Le verdict « retenu » au moment du tirage est
  gardé. Ces votes jugent le modèle et ne servent jamais à l'entraîner.
- **Leçon.** Les titres les plus proches de la coupure, un par artiste. Ces votes entraînent le
  modèle, avec un gain décroissant : AUC 0,76 sans vote, 0,79 avec 50, 0,82 avec 99.
- **Promotion.** Un nouveau modèle n'est mis en service que si son AUC d'examen égale au moins
  celle du modèle en service.

La page de vote (FastAPI derrière Cloudflare Access, rappel WhatsApp) est en service depuis le
2026-10-01 sur `votes.aubesonore.fr`. Chaque passe tire une nouvelle sélection après `train`.

## 5. Acquisition (étape 5)

Justification des choix : `recherches/2026-09-30-acquisition-publication-observabilite.md` §1 et
§2.

1. **Entrée.** Les titres retenus pas encore acquis, écrits en CSV (Artist, Title, Length).
2. **Sockseek 3.0.5** (binaire figé dans `~/.local/bin`, sha256 `d0a1e909…1b66` vérifié) sur un
   **compte Soulseek dédié à la radio** (`SOULSEEK_USER`, `SOULSEEK_PASSWORD`). Le compte de slskd est interdit : il éjecterait slskd et les deux Lidarr.
   - Options : `--format mp3,flac --pref-format mp3 --length-tol 3 --name-format {uri}`, avec
     l'id Deezer en colonne URI du CSV : chaque fichier porte l'id du titre demandé.
   - Le mot de passe passe par un fichier de config en 0600, supprimé après la passe, jamais par
     la ligne de commande.
   - Une recherche à la fois, au plus 10 recherches par 220 s.
   - Le pipeline lit `_index.csv` : les échecs sont comptés par raison et ne sont pas relancés
     avant la passe suivante.
3. **Contrôle de chaque fichier.** Il est rejeté, compté et supprimé s'il échoue à l'un de ces
   points :
   - `ffprobe` : codec MP3 ou FLAC, durée à ±3 s de Deezer, et pour un MP3 un débit moyen
     ≥ 200 kbit/s (un V0 tourne autour de 220–260 ; à revoir sur les premiers fichiers réels) ;
   - **Chromaprint** : `fpcalc -raw` sur le fichier et sur l'extrait Deezer. Le taux de bits
     identiques au meilleur décalage doit être ≥ 0,70. La mesure a donné 0 erreur sur 38 + 1 406
     paires ; la durée seule laissait passer un autre titre du même artiste pour 18 fichiers sur 38.
4. **Pas de YouTube.** Un titre introuvable reste un échec compté, et on retente à la passe
   suivante.
5. **Premier essai réel** (2026-09-30, 10 retenus, sans port ouvert sur la box) : 10 prêts, tous
   en MP3 320 kbit/s, identité Chromaprint de 0,925 à 0,982, durée à ±2 s. Le port d'écoute de
   Sockseek reste fermé tant qu'un taux d'échec ne justifie pas de l'ouvrir.

## 6. Préparation (étape 6)

- **Conversion.** Un FLAC passe en MP3 V0 :
  `ffmpeg -af aresample=resampler=soxr:osr=44100 -c:a libmp3lame -q:a 0`. Un MP3 n'est jamais
  réencodé.
- **ReplayGain.** `rsgain custom -s i -c p`, avec rsgain 3.8 en binaire figé, extrait de
  l'archive de release `rsgain-3.8-Linux.tar.xz`, dont la sha256 `4939de3b…65a0` a été
  vérifiée ; la CI installe la même. Sans ces balises,
  Liquidsoap recalcule le gain à chaque titre, ce qui coûte beaucoup de CPU (doc AzuraCast,
  « optimizing »).
- **Balises** (ffmpeg, qui remplace toutes les balises d'origine) : artiste et titre Deezer,
  commentaire `deezer:<id>`, album et pochette (`album.cover_xl`, 1000 × 1000) lus sur
  `/track/<id>` : l'id exact donne le bon album, là où la recherche native d'AzuraCast
  (MusicBrainz par artiste et titre) prend le premier venu. La pochette est un flux image
  intégré en APIC (ffmpeg-formats, muxer mp3) ; `-map 0:a:0` seul la perdait. Fichier prêt :
  `data/antenne/<id Deezer>.mp3`.
- **Repères.** Des titres de la bibliothèque Plex, copiés sans jamais y écrire, préparés de la
  même façon et étiquetés `repère` dans la base. Ils représentent au plus 20 % de l'antenne.
  Le chemin du fichier vient de Plex (`Media/Part`) ; un chemin hors de `/media/plex/Musique`
  n'est jamais lu.
- **Conversion.** Tout ce qui n'est pas du MP3 (FLAC, AAC, OGG…) passe en V0.

## 7. Antenne (étape 7)

### 7.1 Bibliothèque d'antenne

- **Taille.** Cible de 1 500 à 2 000 titres (`config/editorial.toml`).
- **Entrées.** Chaque passe publie tout ce qui a été acquis. Des repères sont ajoutés pour rester
  sous 20 %, tirés selon l'écoute.
- **Sorties.** Au-delà de la cible, chaque entrée retire le titre le moins bien noté parmi ceux
  qui sont à l'antenne depuis plus de 60 jours, repères exclus.
  - Le nombre de suppressions par passe est plafonné.
  - Le titre en cours et la file de l'AutoDJ sont toujours épargnés.
  - `radio remove` permet un retrait manuel.

### 7.2 Publication sur AzuraCast

Justification : `recherches/…-observabilite.md` §3.

- **Dépôt.** `POST /station/1/files` dans le dossier `antenne/`. L'`id` et l'`unique_id`
  renvoyés sont gardés en base avec l'origine du titre.
- **Diffusion.** Le dossier `antenne/` est rattaché à une seule playlist « AubeSonore », non
  programmée, en `shuffle` avec `avoid_duplicates`. AzuraCast y range lui-même les fichiers.
- **Retrait.** `PUT /station/1/files/batch` avec `do=delete`.
- **Interdit.** Jamais de `PUT /file/{id}` : il réécrit et supprime les balises.
- **Réalignement à chaque passe.** On compare la base au contenu de `antenne/` et on rapporte les
  écarts.

- **Interdit aussi.** `POST /station/1/art/{id}` : il finit par la même réécriture
  (`StationMediaRepository::updateAlbumArt` → `writeToFile`). La pochette est intégrée au fichier
  à la préparation (§6) ; redéposer un fichier sur le même chemin remplace le média en place
  (`MediaProcessor::processAndUpload`, `findByPath`).

**Bascule, faite le 2026-10-01** par appels directs, sans attendre 400 titres puisque la radio
n'avait pas encore d'auditeurs : sauvegarde des 8 anciennes playlists et de la liste des médias
dans `~/radio/archives/*-avant-bascule-2026-10-01.json`, création de la playlist « AubeSonore »
(id 10) rattachée à `antenne/`, désactivation des 8 anciennes, suppression des 369 anciens
titres. Les playlists se réactivent depuis la sauvegarde ; les fichiers supprimés sont perdus.

### 7.3 Enchaînement (plus tard)

Déjà décidé le 2026-09-23 :

- un fil qui dérive, chaque titre proche du précédent, tiré vers une grille cible 7 × 24 h
  (énergie, tempo, dansabilité) ;
- le vendredi et le samedi, une soirée plus dansante jusqu'à 03:00 ;
- publication en playlists horaires séquentielles, programmées, avec `loop_once` et sans
  `avoid_duplicates` ;
- la playlist « AubeSonore » devient alors le secours, puisque les playlists programmées passent
  devant.

L'analyse nécessaire (tempo, énergie) et la comparaison avec AudioMuse-AI feront l'objet d'une
étude à part.

## 8. Observabilité

Justification : `recherches/…-observabilite.md` §4.

### 8.1 Rapport de passe

Chaque étape écrit une ligne en base (`stage_reports`) avec ses compteurs, rattachée à la passe
par `$INVOCATION_ID` de systemd. `radio report` affiche le dernier rapport de chaque étape. Le rapport est aussi comparé à des seuils
(`editorial.toml`) :

- au moins un titre publié ;
- un taux d'acquisition au-dessus d'un plancher ;
- aucune étape en erreur.

Un seuil franchi fait échouer la passe.

### 8.2 Gatus

Gatus 5.37.0 est un conteneur dont la configuration YAML est versionnée dans `deploy/gatus/`. Il
est le seul outil de surveillance. Tableau de bord sur `127.0.0.1:8050` (tunnel SSH). Chaîne
d'alerte testée de bout en bout le 2026-09-30. Il alerte par WhatsApp (CallMeBot) après 3 échecs, avec un rappel au
plus toutes les 24 h et un message de retour à la normale.

| Sonde | Condition |
|---|---|
| `antenne` : `nowplaying` AzuraCast, chaque minute | HTTP 200 et `is_online == true` (en place) |
| `flux-public` : `radio.aubesonore.fr/listen/aubesonore/radio.mp3`, toutes les 5 min | HTTP 200 : vérifie aussi le tunnel Cloudflare (en place) |
| `passe-hebdo` (endpoint externe) | Poussée par `ExecStopPost=` avec `$SERVICE_RESULT` ; alerte au premier échec ou après 8 jours de silence (en place) |
| Playlist en cours ≠ secours | Après l'enchaînement (§7.3) |
| `page-de-vote` : `127.0.0.1:8040`, toutes les 5 min | HTTP 403 sans jeton Access : la page tourne (en place) |

### 8.3 Non-régression

- **CI GitHub Actions** : ruff, mypy strict et pytest à chaque push et à chaque PR, avec
  astral-sh/setup-uv. `main` est protégée : rien n'y entre sans CI verte.
- **Dependabot** pour `uv.lock`, les actions GitHub et l'image de Gatus. `essentia-tensorflow`
  en est exclu : ses versions récentes ne publient que des roues cp314, et le projet est en
  Python 3.12.
- Les tests tournent sans réseau (~12 s). Tout bug corrigé reçoit son test.

## 9. Ordre de réalisation

1. **Observabilité.** CI, Dependabot, Gatus sur l'antenne actuelle et battement de cœur de la
   passe. On voit ce qui marche avant d'ajouter quoi que ce soit.
2. **Acquisition** (§5), une fois le compte Soulseek créé.
3. **Préparation et antenne** (§6, §7.1, §7.2) : fait, bascule le 2026-10-01.
4. **Page de vote** (§4) : en service le 2026-10-01.
5. **Enchaînement** (§7.3).

## 10. Exploitation

| Quand | Unité systemd utilisateur | Ce qui se passe |
|---|---|---|
| dimanche 03:00 | `radio-weekly` | `library-sync`, `discover`, `signals`, `train`, `votes-select`, `acquire`, `antenne` ; bornée à 12 h, battement de cœur Gatus |
| dimanche 10:00 | `radio-remind` | rappel WhatsApp de vote |
| en continu | `radio-votes` | page de vote, `127.0.0.1:8040`, publiée sur `votes.aubesonore.fr` |

- État : `.venv/bin/radio report`.
- Journaux : `journalctl --user -u radio-weekly`.
- Un gros rattrapage de `signals` (environ 3 s par titre) se lance à la main, en `nice`.

**Réglages.** Les secrets et les URL sont dans `.env` (modèle : `.env.example`, jamais commité),
y compris `GATUS_TOKEN` pour le battement de cœur. Le reste est dans `config/editorial.toml`.
Gatus : `cd deploy/gatus && docker compose up -d` (son `.env` est un lien vers celui du dépôt).

**Installer les unités.**

```bash
for u in deploy/systemd/*; do systemctl --user link "$PWD/$u"; done
systemctl --user daemon-reload && systemctl --user enable --now radio-weekly.timer
```

Les liens pointent vers le dépôt : il faut les re-lier si le dépôt change de place.

**Publier la page de vote** (tableau de bord Cloudflare Zero Trust, dans cet ordre) :

1. Access → Applications → Self-hosted : le sous-domaine, et une politique « Allow » limitée à
   l'adresse de Victor. L'« AUD tag » va dans `CF_ACCESS_AUD`, et
   `<équipe>.cloudflareaccess.com` dans `CF_ACCESS_TEAM_DOMAIN`.
2. Networks → Tunnels → tunnel existant → Public hostname : même sous-domaine, `localhost:8040`.
3. Contrôles : `curl -sI https://<page>` doit rediriger vers Access, et
   `curl -s 127.0.0.1:8040/` doit renvoyer 403.

**Actions de Victor**

- Plus tard, si les mesures le justifient : ouvrir sur la box le port d'écoute de Sockseek
  (49998/TCP), ce qui demande aussi une règle `ufw` sur l'hôte.
- Vérifier que la box ne redirige pas le port 5030 : l'interface de slskd est publiée sur
  toutes les interfaces de la machine, et Docker contourne `ufw`.

## 11. Hors périmètre

- Le site d'écoute, qui a son propre dépôt.
- Les likes du site comme signal : cela coupleraient le site et le pipeline.
- La sauvegarde des médias de l'antenne.
