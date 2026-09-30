# Modèle audio seul et classement par fournée — mesures du 2026-09-30

Décision de Victor le 2026-09-30, sur les mesures ci-dessous. Remplace, dans la spec v3, le §5.3
(quatre signaux), le §5.4 (empilement, ablation, λ, seuil de précision) et le §7.3 (garde-fou
bibliothèque ≥ 80 %).

## Votes disponibles

Banc d'écoute du 2026-09-24, votes arrêtés au 2026-09-27 :

| Série | Rôle | Votes | Oui | Non |
|---|---|---|---|---|
| s1 (stratifiée sur tous les scores v2) | examen | 60 | 28 (47 %) | 32 |
| s2 | leçon | 99 | 57 | 42 |

## Pourquoi l'empilement v3 ne pouvait pas être promu

Premier entraînement réel (`radio train`, empilement LR audio + HistGradientBoosting) :

- AUC de leçon hors pli : 0,645 ; AUC d'examen : 0,762.
- Pour viser une précision de 0,90 sur la leçon, le seuil monte à 1,000 : 1 vote de leçon accepté
  sur 99, et 8 % de la bibliothèque acceptée, contre 80 % exigés par le garde-fou.

Avec une AUC de cet ordre et un taux de base de 47 %, une précision de 90 % impose de ne retenir
que quelques pour cent des candidats. Le seuil de précision et le garde-fou bibliothèque ne
peuvent pas tenir ensemble : aucun modèle n'aurait jamais été promu.

## Ce qui porte le signal

Sur l'examen (60 votes), chaque signal pris seul :

| Signal | AUC |
|---|---|
| Empilement v3 complet | 0,762 |
| LR sur l'empreinte EffNet seule | 0,80–0,81 |
| Rang Deezer du titre | 0,57 |
| Popularité de l'artiste (fans Deezer, auditeurs Last.fm) | 0,52–0,57 |
| Culture (tags Last.fm) | 0,53 |
| Proximité (match Last.fm, sources) | 0,53–0,58 |

Les signaux de métadonnées sont au niveau du hasard ; l'ablation v3 n'avait que 99 votes pour en
juger (écart type d'une AUC ≈ 0,05). Règle de la spec (§2.4) : un signal qui n'aide pas est retiré.

## Réglages de la régression logistique

La validation croisée sur la leçon seule et l'examen seul se contredisaient sur les négatifs
faibles (leçon : ils aident, examen : ils nuisent), avec des écarts dans le bruit. Choix fait une
fois, sur les 159 votes regroupés, validation croisée à 5 plis groupés par artiste, 3 tirages :

| C | Poids des négatifs faibles | AUC | Oui dans le tiers le mieux noté |
|---|---|---|---|
| 0,01 | 0 | 0,684 | 74 % |
| 0,01 | 0,1 | 0,722 | 77 % |
| 0,01 | 1 | 0,724 | 72 % |
| 0,1 | 0 | 0,689 | 74 % |
| **0,1** | **0,1** | 0,727 | **79 %** |
| 0,1 | 1 | 0,740 | 76 % |

Retenu : C = 0,1, négatifs faibles à 0,1, vote à 4 (poids du titre le plus écouté), chaque classe
ramenée à un poids total de 1. Taux de base sur les 159 votes : 53 %.

Premier modèle réel avec ces réglages : AUC d'examen 0,816, et 15 oui sur les 20 titres d'examen
les mieux notés, soit 75 % [53–89 %]. L'examen ayant servi au choix des réglages, ce chiffre est
optimiste ; l'estimation propre est la validation croisée ci-dessus. Les votes d'examen de la page
(tirés sur toute la fournée) donneront la vraie mesure.

## Objectif

On retient le tiers le mieux noté de chaque fournée (`keep_fraction`). Le taux de oui des
retenus se suit avec son intervalle de Wilson. 90 % reste l'horizon, pas une barrière.

L'examen se tire uniformément sur toute la fournée. En revue, une simulation a montré le
problème du tirage parmi les seuls retenus du modèle en service : ses notes étaient tronquées,
et un challenger à qualité égale gagnait 71 % des comparaisons. Un challenger nettement moins
bon était même promu une fois sur deux. Le bulletin garde le verdict au moment du tirage
(`retained`), et le taux de oui des retenus se lit sur ce sous-ensemble, qui représente environ
un tiers de l'examen.

Il faut encore mesurer le plafond propre à Victor. Amatriain et al. (2009, « I like it... I like
it not ») mesurent un écart de RMSE de 0,56 à 0,82 sur une échelle de 1 à 5 entre deux notations
des mêmes films. Aucun modèle ne peut dépasser la cohérence de l'auditeur avec lui-même. Protocole
prévu : revote à l'aveugle d'une vingtaine de titres déjà votés.

## Outils existants examinés (2026-09-30)

Aucun ne couvre la notation par le goût d'une bibliothèque Plex :

- Explo et ListenBrainz (LB Radio, Troi) dépendent d'un historique scrobblé.
- Lidarr raisonne par album.
- Plex Sonic Analysis ne voit que les titres déjà en bibliothèque.

Deux pistes pour la suite de l'antenne :

- AudioMuse-AI (NeptuneHub, maintenu, Plex compatible) pour l'analyse et les chemins sonores ;
- les playlists séquentielles programmées d'AzuraCast pour la grille horaire.

À évaluer quand on y arrivera.
