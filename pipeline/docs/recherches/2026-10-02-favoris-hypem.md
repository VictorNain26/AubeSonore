# Favoris Hype Machine comme signal de goût — 2026-10-02

Question (Victor, 2026-10-02) : ses favoris publics Hype Machine (`GhostRAvage`) améliorent-ils
le modèle de goût ?

## Données

- `GET https://api.hypem.com/v2/users/GhostRAvage/favorites?page=N&count=50` : même format que
  `/popular` (`artist`, `title`, `time`, `sitename`, plus `ts_loved`). 847 favoris (17 pages ;
  la page 18 répond 404, comme un utilisateur inconnu).
- Retrouvés sur Deezer par la règle stricte de la bibliothèque (artiste, titre, durée ±3 s) :
  601 sur 847, dont 88 déjà dans la bibliothèque Plex. 510 nouveaux, mesurés (empreinte EffNet
  de l'extrait, 504 réussies + 6 déjà mesurées), sur une copie de la base de production.

## Mesure 1 — favoris en exemples positifs

Régression logistique du modèle en service (C = 0,1), jeu d'examen courant (60 votes, 33 oui).
Favoris ajoutés comme positifs, catégorie bibliothèque, avec un poids fixe ; un favori qui serait
un titre d'examen (même clé de dédoublonnage) est écarté.

| Entraînement | AUC d'examen |
|---|---|
| sans favoris | 0,760 |
| favoris, poids 1 | 0,753 |
| favoris, poids 2 | 0,751 |
| favoris, poids 4 | 0,749 |

Aucun gain : l'AUC baisse légèrement, dans le bruit d'un examen de 60 votes. Les favoris
n'entrent pas à l'entraînement (« un signal qui ne prouve pas son utilité est retiré »).

## Mesure 2 — part des favoris que le modèle retiendrait

Modèle sans favoris, seuil du tiers retenu de la dernière fournée (873 candidats, seuil 0,694) :
**53 % des 510 favoris passent le seuil**, contre 33 % au hasard ; score médian 0,703 contre
0,628 pour les candidats. Le modèle reconnaît déjà le goût de Victor sur des titres qu'il n'a
jamais vus, ce qui explique l'absence de gain en mesure 1.

## Décision

- Un favori n'est plus une découverte : origine `favorite`, exclu des fournées et des nouveautés.
- La part des favoris retenus est publiée par `radio train` à chaque passe : une mesure de goût
  sur des centaines de titres, plus stable que les 60 votes d'examen. Elle ne décide jamais d'une
  promotion : seuls les votes d'examen jugent un modèle.
