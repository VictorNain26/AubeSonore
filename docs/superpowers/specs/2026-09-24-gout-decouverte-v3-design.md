# Goût et découverte v3 — conception

Date : 2026-09-24. Validé section par section par Victor le 2026-09-24 au soir.

> **Amendé le 2026-09-30** (décision de Victor, sur mesures :
> `docs/superpowers/research/2026-09-30-modele-audio-seul.md`). Le modèle est une régression
> logistique sur l'empreinte audio seule ; popularité, culture et proximité sont retirées (§5.3),
> tout comme l'empilement, l'ablation, la grille de λ et le seuil de précision (§5.4). Chaque
> fournée est classée et son tiers le mieux noté retenu ; la leçon tire les titres les plus
> proches de la coupure (§6.1). Les 90 % de oui deviennent un horizon suivi avec son intervalle,
> sans alerte, et le garde-fou bibliothèque ≥ 80 % disparaît (§2.2, §7.3, §8). Les sections
> ci-dessous gardent le texte d'origine.

Remplace, pour le goût et la découverte, les §4 (en partie), §5 et §14 (critères couleur)
de `2026-09-23-refonte-antenne-design.md`, ainsi que `2026-09-24-couleur-v2-design.md` et
le plan 2 découverte. Le reste de l'antenne (acquisition, analyse, fil, publication) fera
l'objet de specs ultérieures, écrites sur la même base propre.

## 1. Pourquoi une refonte

Le premier essai réel (2026-09-24, 15 graines, 336 titres) n'a pas satisfait Victor.

- **Cadrage faux.** Le filtre couleur apprenait « bibliothèque contre 4 catégories
  négatives » (soupe FR, soupe internationale, métal, hard techno). Victor avait cité ces
  catégories comme des *exemples*. Son AUC de 0,985 prouvait qu'il séparait la bibliothèque
  de ces exemples, pas qu'il collait au goût de Victor. Il acceptait 81 % des candidats,
  presque tous à 1,00.
- **Choix des titres par popularité.** Les 3 tops Deezer de chaque voisin : on obtenait des
  tubes (Uptown Girl, The Best).
- **Graines alphabétiques, pas de dédoublonnage.**
- **Ressemblance kNN réfutée par la mesure.** Elle laissait passer 79 % des négatifs, contre
  4 % pour le classifieur. La bibliothèque est éclectique : le goût se joue à l'intérieur
  d'un genre, et seules des étiquettes données par Victor le séparent. Voir
  `docs/superpowers/research/2026-09-24-mesure-ressemblance.md` et
  `2026-09-24-ressemblance.md`.

Ce qui a marché et qu'on garde comme **principe** (pas comme code) : graines tirées de la
bibliothèque, voisins directs confirmés par Deezer ET Last.fm, aucune dérive observée.

## 2. Décisions de Victor

1. **Page blanche totale.** Nouveau code de A à Z, y compris les clients Plex, Deezer et
   Last.fm ; les empreintes sont recalculées. **Étape 0 : nettoyage**, on n'implémente pas
   sur du déjà fait (§10).
2. **Critère de succès : au moins 90 % de « oui » à l'aveugle**, sur un échantillon tiré au
   hasard parmi les titres retenus, à chaque fournée.
3. **Environ 20 votes par semaine** après le démarrage.
4. **Le système le plus complet** : son, popularité, culture et proximité. Chaque signal doit
   prouver son utilité sur les votes, sinon il est retiré (§5.4).
5. **Canal de vote : une page servie par le pipeline**, derrière Cloudflare Access, avec un
   rappel WhatsApp hebdomadaire (§6).

## 3. Invariants

- **La bibliothèque Plex est la seule vérité, en lecture seule.** Jamais d'écriture dans Plex.
  Jamais de lecture, liste ou référence du disque « MUSIC MAËL » (`/media/musique`). Jamais
  la section Plex « Musique second wave ».
- **Un repli silencieux est pire qu'une panne.** Tout ce qui est sauté est compté et nommé
  dans le rapport de passe.
- **Aucun secret dans les journaux, exceptions, tests ou commits** : jeton Plex (jamais dans
  une URL journalisée), clé Last.fm (passée en paramètre de requête), URL d'extraits Deezer
  signées, clé CallMeBot.
- **Pas d'usine à gaz** : outils existants et robustes, rien de maison quand une
  bibliothèque le fait.
- **L'ancien pipeline de production (`~/radio/pipeline`) n'est jamais touché.**

## 4. Architecture

Python 3.12, uv, typer, pydantic / pydantic-settings, requests + stamina + pyrate-limiter,
sqlite3 (tables STRICT, migrations par `PRAGMA user_version`), scikit-learn,
essentia-tensorflow (Discogs-EffNet `discogs-effnet-bs64-1`, somme de contrôle épinglée),
FastAPI + uvicorn (page de vote uniquement).

```
radio/
  core/      config (.env + editorial.toml validés), db, http (hook de retry unique,
             qui ne journalise que nom, type d'exception et numéro d'essai), report
  sources/   plex.py, deezer.py, lastfm.py            # clients fins, endpoints utilisés
  library/   sync.py (Plex → morceaux, artistes, écoutes), match.py (→ Deezer, strict)
  discover/  seeds.py, neighbours.py, candidates.py
  signals/   audio.py, popularity.py, culture.py, proximity.py
  model/     train.py, evaluate.py, promote.py
  votes/     select.py, app.py (FastAPI), importer.py
  notify/    whatsapp.py (CallMeBot)
  cli.py     radio library-sync | discover | train | votes-select | votes-serve | report
```

Une responsabilité par module ; chaque module se teste sans réseau.

## 5. Le trajet d'un morceau

### 5.1 Bibliothèque

- `library-sync` lit les morceaux, artistes et compteurs d'écoute (`viewCount`) des sections
  Plex autorisées.
- Rapprochement Deezer **strict** (artiste et titre normalisés, durée à ±3 s). Un morceau
  non retrouvé avec certitude est écarté et compté, jamais deviné.
- Poids d'un morceau positif : `1 + log(1 + écoutes)`, plafonné à 4.
- Poids d'un artiste graine : somme de ses écoutes, même transformation.

### 5.2 Découverte des candidats

- **Graines.** Tirage pondéré sans remise parmi les artistes de la bibliothèque non utilisés
  comme graine depuis 30 jours ; poids `1 + log(1 + écoutes de l'artiste)`. Chaque artiste
  garde une chance minimale : les coins peu écoutés sont aussi explorés. Une graine n'est
  marquée « utilisée » que si la passe entière réussit.
- **Voisins.** Deezer `artist/{id}/related` ∩ Last.fm `artist.getSimilar`, moins les artistes
  de la bibliothèque. Un voisin n'est jamais un artiste de la bibliothèque, par construction.
- **Titres.** 10 titres par voisin (`artist/{id}/top?limit=10`). On garde ceux dont le voisin
  est l'artiste principal et qui ont un extrait.
- **Dédoublonnage dès l'entrée** : artiste et titre normalisés (parenthèses, « Remaster »,
  « Edit », « Version » retirés). On garde une seule référence Deezer.
- Un titre déjà jugé n'est pas rejugé. Le rejugement après délai est hors périmètre v3.

### 5.3 Les quatre signaux

Mesurés de la même façon pour les morceaux de la bibliothèque et pour les candidats. Sinon,
le modèle apprendrait « est-ce un morceau de la bibliothèque » plutôt que le goût.

| Signal | Mesure | Source |
|---|---|---|
| Son | empreinte EffNet 1280-d moyennée sur l'extrait Deezer de 30 s | Deezer preview + essentia |
| Popularité | `rank` du titre, `nb_fan` de l'artiste, auditeurs Last.fm de l'artiste (log) | Deezer, Last.fm `artist.getInfo` |
| Culture | vecteur des tags Last.fm de l'artiste : vocabulaire des 200 tags les plus fréquents sur bibliothèque et candidats, pondérés par leur compte normalisé | Last.fm `artist.getTopTags` |
| Proximité | pour un artiste : plus grand `match` Last.fm avec un artiste de la bibliothèque **autre que lui-même**, et nombre de sources (0, 1 ou 2) qui le relient à la bibliothèque | Last.fm, Deezer |

- La proximité se calcule en « artiste retiré », y compris pour les artistes de la
  bibliothèque. Sans ça, son absence trahirait la bibliothèque.
- Un signal manquant (artiste de niche sans tags) est une valeur absente explicite, pas une
  erreur. Le modèle la traite nativement, et sa fréquence figure au rapport.
- Les noms exacts des champs d'API sont vérifiés contre la documentation au moment du plan.

### 5.4 Le modèle (empilement)

1. **Note audio.** Régression logistique sur l'empreinte (standardisée). Pour l'entraînement
   du second étage, la note est calculée **hors pli** (`cross_val_predict`, groupes = artiste).
2. **Décision.** `HistGradientBoostingClassifier` (gère les valeurs absentes nativement) sur :
   note audio, popularité, culture, proximité.
3. **Exemples.**
   - Positifs : morceaux de la bibliothèque (poids d'écoute) et votes « oui ».
   - Négatifs : votes « non ».
   - Négatifs faibles de démarrage : les 4 catégories, avec un poids choisi par validation
     croisée sur les votes parmi {0 ; 0,1 ; 0,3}. 0 revient à les retirer.
   - « Passer » est ignoré.
4. **Validation croisée groupée par artiste** : un même artiste n'est jamais à la fois dans
   l'apprentissage et le contrôle.
5. **Seuil** choisi sur les votes de leçon (validation croisée) pour viser une précision
   ≥ 0,90.
6. **Ablation à chaque entraînement.** On retire tour à tour popularité, culture et proximité,
   et on mesure sur les votes (AUC, et précision au taux d'acceptation courant). Un signal qui
   n'améliore rien est désactivé dans la configuration. Le rapport le dit.

## 6. Les votes

### 6.1 Sélection hebdomadaire (`votes-select`)

20 titres par semaine, présentés mélangés et à l'aveugle (ni note, ni verdict, ni graine) :

- **10 d'examen** : tirage uniforme parmi les titres **retenus** de la semaine. Ils ne servent
  **jamais** à l'entraînement.
- **10 de leçon** : les titres les plus incertains (note la plus proche du seuil), au plus un
  par artiste. C'est l'échantillonnage par incertitude (Settles, *Active Learning Literature
  Survey*, 2009).

Reprise des votes du 2026-09-24 (banc d'écoute claude.ai, collection `votes`), par un import
JSON unique :
- **série 1 (60 titres) → examen** ;
- **série 2 (257 titres) → leçon**.

### 6.2 Page de vote (`votes-serve`)

- FastAPI, une seule page pensée pour le téléphone, service systemd utilisateur.
- Exposée par le tunnel Cloudflare existant, derrière une application Cloudflare Access
  limitée à Victor. La création de la règle Access est une action extérieure, **confirmée
  avec Victor** au moment de la faire.
- L'extrait se lit **dans la page**. Au chargement, le serveur demande à Deezer une URL fraîche
  de l'extrait (les URL sont signées et expirent) ; elle n'est jamais journalisée.
- Oui / Non / Passer, un geste par titre, enregistré tout de suite en SQLite.
- Rappel WhatsApp hebdomadaire (CallMeBot, canal existant) avec le lien et le nombre de
  titres en attente.

## 7. La preuve

1. **Seuls les votes d'examen jugent.**
2. **Taux de oui** sur la fenêtre des 60 derniers votes d'examen, avec intervalle de Wilson
   à 95 % affiché. Objectif : ≥ 90 %.
3. **Garde-fou de sévérité.**
   - Part des morceaux de la bibliothèque acceptés en « artiste retiré » : ≥ 80 %.
   - Taux d'acceptation des candidats de chaque fournée : suivi, et alerte s'il chute sous 10 %.
4. **Promotion d'un nouveau modèle.**
   - Il n'est mis en service que s'il fait au moins aussi bien que le modèle courant sur les
     votes d'examen (AUC et taux de oui au seuil) et respecte le garde-fou.
   - Sinon, l'ancien reste, et un message dit pourquoi.
   - Chaque entraînement est historisé (métriques, paramètres, date) pour permettre un retour
     arrière.
5. **Limite connue.** Les votes d'examen sont tirés parmi les titres retenus par le modèle
   *courant*. La comparaison entre modèles est donc biaisée en faveur de ses zones
   d'acceptation. La série 1, stratifiée sur tous les scores et rejets compris, reste l'examen
   neutre de référence.

## 8. Pannes

| Ce qui tombe | Réaction |
|---|---|
| Plex injoignable ou bibliothèque vide | Arrêt de la passe |
| Deezer ou Last.fm indisponible, ou quota | Arrêt ; reprise au même point, aucune graine marquée |
| Erreur définitive sur un artiste | Artiste sauté, compté, nommé |
| Extrait absent, empreinte ratée | Titre non jugé, compté |
| Signal manquant | Valeur absente, fréquence au rapport |
| Page de vote en panne ou semaine sans vote | Signalé dans le rappel ; pas de réentraînement ; date du dernier examen au rapport |
| Nouvel entraînement moins bon | Non promu, message |
| Taux de oui < 90 % | Alerte WhatsApp chiffrée ; aucune correction automatique |
| Trop peu de « non » | Négatifs faibles maintenus ; le rapport dit combien il en manque |

## 9. Tests

- Tests unitaires sans réseau (réponses Deezer, Last.fm et Plex simulées).
- Test de bout en bout sur une mini-bibliothèque.
- Tests garde-secrets : aucune clé ni URL signée dans les journaux ou exceptions capturés.
- Puis essai réel contrôlé : une fournée, votes d'examen de Victor, vérification des 90 %.

## 10. Étape 0 : nettoyage

On ne construit pas sur l'existant. L'archivage précède toute suppression ; toute suppression
de données est confirmée par Victor.

1. Étiquette locale `archive/antenne-v1` sur `refonte/antenne` (branche conservée, rien poussé).
2. Archive de `data/` et `models/` du worktree `pipeline-refonte` dans `~/radio/archives/`
   (tar compressé).
3. Nouvelle branche `refonte/gout-v3` depuis `main`, dans un nouveau worktree. On n'y
   rapporte que :
   - cette spec ;
   - les recherches `docs/superpowers/research/2026-09-2{3,4}-*.md` ;
   - `config/negatives.toml`, la liste des artistes négatifs de démarrage relue par Victor :
     c'est une donnée, pas du code.
   Aucun fichier de `radio/`, `tests_radio/`, `data/` ni `models/`.
4. Suppression de l'ancien worktree `pipeline-refonte` **après confirmation de Victor**.
5. Les fichiers de l'ancien pipeline (`config.py`, `scripts/`, `run.sh`, `tests/`) restent sur
   la branche jusqu'à la bascule, comme prévu par la spec antenne. Le nouveau code ne s'appuie
   sur aucun d'eux.

## 11. Hors périmètre v3

- Acquisition, analyse, fil et publication : specs suivantes.
- Rejugement des titres après délai.
- Tout signal au-delà des quatre.
