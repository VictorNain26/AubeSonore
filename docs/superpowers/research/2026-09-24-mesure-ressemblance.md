# Ressemblance à la bibliothèque (kNN cosinus, Discogs-EffNet) vs classifieur actuel

Mesure hors ligne, 2026-09-24. Aucune écriture sous `data/` ni `models/`, aucun nouvel embedding, aucun appel réseau.
Scripts : `knn.py` (protocole), `diag.py` (diagnostics). Résultats bruts : `results.json`, `diag.json` (même dossier).

## Verdict

**Non.** Noter un titre par sa ressemblance kNN à la bibliothèque, seule, ne capte pas « ça ressemble à ce que j'écoute ». Sur les négatifs ciblés, l'AUC ne dépasse pas 0,67 (0,70 sur la partition de test), contre 0,985 pour le classifieur actuel. Au seuil posé à partir de la seule bibliothèque (10e percentile), la méthode accepte **79 à 86 % des négatifs**, contre 4 % pour le classifieur. La cause n'est pas le hubness : les corrections l'aggravent ou ne changent rien. L'information est pourtant présente dans l'embedding : un kNN *contrastif* (bibliothèque moins négatifs) atteint 0,974. Ce qui échoue, c'est la formulation à une seule classe. Sur une bibliothèque aussi éclectique, chaque genre-piège a des voisins légitimes dans la bibliothèque.

Je recommande de ne pas remplacer le classifieur. S'il faut garder une variante kNN, prenez k = 20, seuil au 10e percentile LOAO (cosinus 0,623), en indicateur secondaire seulement, jamais comme filtre.

## Données

- Bibliothèque : 2 852 extraits Deezer appariés, 658 artistes (groupe `plex:<clé>`). Négatifs : 1 569 extraits (commercial_fr 384, commercial_intl 396, metal 420, hard_techno 369). Tous ont un embedding `effnet-bs64-hop128` (1 280 dimensions), normalisé L2.
- Seules les clés `deezer:` du cache ont été lues. Les clés de fichiers complets n'ont pas été touchées.
- Candidats : les 336 de `candidates`, tous en cache. Ils viennent de 12 graines : 3070, A Trois Sur La Plage et ABRA n'ont rien donné. Aucun artiste candidat n'existe dans la bibliothèque sous le même nom.

## Protocole

- **Bibliothèque, leave-one-artist-out (LOAO)** : s_k = moyenne des k plus grands cosinus vers la bibliothèque, tous les titres du même artiste (même groupe, soi compris) exclus.
- **Négatifs** : les mêmes s_k, avec toute la bibliothèque comme voisins. **Centroïde** : cosinus à la moyenne normalisée de la bibliothèque, recalculée sans l'artiste pour les titres de la bibliothèque.
- **Seuils sans négatifs** : 5e et 10e percentiles des scores LOAO de la bibliothèque.
- **Comparaison stricte avec le classifieur** : même partition dev/test que `test_predictions.json` (883 items : 571 bibliothèque, 312 négatifs). Pour le kNN, la référence est la bibliothèque *dev* seule et le seuil vient du percentile des scores LOAO dev. Pour le classifieur, je lis les probabilités de test : au seuil de production (0,647 + garde de nouveauté), puis à acceptation bibliothèque égale (seuils au 5e/10e percentile des probabilités hors pli des titres dev de la bibliothèque, `dev_predictions.json`).

## 1. Protocole complet (LOAO sur toute la bibliothèque, 1 569 négatifs)

AUC bibliothèque contre négatifs, globale puis par catégorie :

| Variante | AUC | com_fr | com_intl | metal | hard_techno |
|---|---|---|---|---|---|
| kNN k=1 | 0,538 | 0,420 | 0,594 | 0,620 | 0,508 |
| kNN k=5 | 0,607 | 0,486 | 0,624 | 0,690 | 0,620 |
| kNN k=10 | 0,638 | 0,519 | 0,637 | 0,738 | 0,648 |
| kNN k=20 | 0,668 | 0,553 | 0,653 | 0,785 | 0,672 |
| Centroïde | 0,794 | 0,792 | 0,689 | 0,936 | 0,747 |

Acceptation aux seuils fixés par la seule bibliothèque (part des négatifs acceptés, globale puis par catégorie) :

| Variante | Seuil p5 | Biblio | Négatifs | fr / intl / metal / hard | Seuil p10 | Biblio | Négatifs | fr / intl / metal / hard |
|---|---|---|---|---|---|---|---|---|
| k=1 | 0,661 | 95 % | 92,3 % | 95 / 90 / 91 / 94 | 0,690 | 90 % | 86,2 % | 92 / 80 / 83 / 90 |
| k=5 | 0,634 | 95 % | 91,3 % | 95 / 89 / 91 / 91 | 0,664 | 90 % | 82,8 % | 91 / 78 / 81 / 82 |
| k=10 | 0,616 | 95 % | 91,1 % | 95 / 91 / 90 / 89 | 0,645 | 90 % | 81,5 % | 91 / 78 / 77 / 80 |
| k=20 | 0,597 | 95 % | 89,2 % | 95 / 89 / 86 / 88 | 0,623 | 90 % | 78,7 % | 90 / 78 / 70 / 79 |
| Centroïde | 0,498 | 95 % | 69,9 % | 81 / 90 / 24 / 89 | 0,533 | 90 % | 53,3 % | 55 / 79 / 15 / 68 |

Plus k grandit, mieux ça marche, mais les chiffres restent proches du hasard. Pour commercial_fr, k=1 et k=5 donnent même une AUC **inférieure à 0,5** : le rap FR commercial ressemble plus à la bibliothèque que la bibliothèque ne se ressemble à elle-même, d'un artiste à l'autre. Les médianes s_10 le confirment : bibliothèque 0,734, commercial_fr 0,730, hard_techno 0,702, commercial_intl 0,699, metal 0,684.

## 2. Comparaison stricte avec le classifieur (même test, 571 bibliothèque / 312 négatifs)

| Méthode | AUC | fr | intl | metal | hard | Biblio acceptée | Négatifs acceptés (fr / intl / metal / hard) |
|---|---|---|---|---|---|---|---|
| kNN k=1, p10 | 0,587 | 0,378 | 0,610 | 0,787 | 0,542 | 90,9 % | 81,1 % (97 / 80 / 62 / 88) |
| kNN k=5, p10 | 0,642 | 0,471 | 0,643 | 0,824 | 0,604 | 91,4 % | 78,5 % (97 / 78 / 58 / 84) |
| kNN k=10, p10 | 0,668 | 0,523 | 0,659 | 0,845 | 0,621 | 91,2 % | 75,3 % (95 / 78 / 48 / 84) |
| kNN k=20, p10 | 0,696 | 0,570 | 0,679 | 0,868 | 0,644 | 90,9 % | 72,4 % (91 / 78 / 42 / 82) |
| kNN k=20, p5 | idem | | | | | 95,3 % | 84,0 % (97 / 85 / 68 / 88) |
| **Classifieur, production** (0,647 + nouveauté) | **0,985** | 0,988 | 0,976 | 0,992 | 0,985 | 92,5 % | **4,2 %** (2,7 / 7,6 / 2,4 / 4,1) |
| Classifieur, seuil p10 dev (0,724) | | | | | | 92,3 % | 3,8 % (2,7 / 7,6 / 1,2 / 4,1) |
| Classifieur, seuil p5 dev (0,448) | | | | | | 95,3 % | 7,1 % (5,3 / 10,1 / 2,4 / 11,0) |

À acceptation bibliothèque égale (environ 91 à 95 %), le classifieur laisse passer 4 à 7 % des négatifs, le kNN 72 à 84 %. Sur le test, les titres de bibliothèque que chaque méthode rejette ne se recoupent presque pas : 50 rejets pour le kNN10, 43 pour le classifieur, 9 en commun. Le rang de Spearman entre les deux scores vaut 0,07 sur la bibliothèque et 0,30 sur tout le test. Les deux méthodes ne mesurent pas la même chose.

**Témoin, hors protocole (utilise les négatifs)** : un kNN contrastif, s_k(bibliothèque dev) − s_k(négatifs dev), atteint sur le même test une AUC de 0,972 (k=5), 0,974 (k=10) et 0,975 (k=20), soit fr 0,98, intl 0,96, metal 0,99, hard 0,97. L'embedding sépare donc bien les classes. C'est l'absence de contre-exemples qui tue le score « ressemblance seule ».

## 3. Hubness (graphe kNN LOAO de la bibliothèque, k = 10)

- Asymétrie de la k-occurrence : **2,01** (élevée). N_k maximal : 75, pour TOBACCO « The Black Album ». Suivent The Notwist (74), Brodinski (68), DIIV (67), Romane Santarelli (63). 153 anti-hubs (N_k = 0).
- Côté requêtes négatives, l'asymétrie monte à 7,7 : les négatifs retombent sur une poignée de titres. Le premier voisin des négatifs metal est Jinjer 185 fois sur 420. Pour hard_techno : Contrefaçon 137 fois, M83 114 fois sur 369. Pour commercial_fr : Almeria 129 fois sur 384.
- Corrections testées :
  - **Mise à l'échelle locale côté bibliothèque** (façon CSLS, cos − r_y) : AUC k=10 de 0,579, k=20 de 0,686 (au lieu de 0,668). L'asymétrie monte à 2,56. Aucun gain utile.
  - **Proximité mutuelle gaussienne** (Schnitzer 2012, des deux côtés) : l'asymétrie tombe à 0,69, mais l'AUC s'effondre (k=10 : 0,383 ; k=20 : 0,504). La MP normalise l'échelle propre de chaque requête et efface le signal absolu, alors que tout le signal est là.
  - **MP côté bibliothèque seul** : asymétrie 1,15, AUC k=10 de 0,517, k=20 de 0,644.
- Le hubness est réel, mais il n'explique pas l'échec : aucune correction n'approche le classifieur, et la plupart dégradent le résultat.

## 4. Les 336 candidats (meilleure variante kNN : k = 20, seuils LOAO p5 = 0,597, p10 = 0,623)

- **Acceptation** : 85,7 % au seuil p10, 92,9 % au seuil p5, contre 81,0 % pour l'ancien classifieur (272 acceptés, 63 rejetés couleur, 1 rejeté nouveauté).
- **Contre l'ancien verdict** : 96,8 % des 63 « rejected_colour » passent au seuil p10, contre 83,5 % des 272 « accepted ». Le kNN reprend presque tout ce que le classifieur rejetait (surtout le rap FR des graines 113 et Adrien Gallo) et rejette plutôt de la pop 80s bien notée par l'ancien modèle.
- **Corrélation avec la probabilité de l'ancien modèle** : Spearman −0,08 (k=20), −0,12 (k=10), −0,20 (k=1). Le centroïde donne +0,34. Aucun accord, voire un léger désaccord.
- **Distribution s_20** des candidats : min 0,49, P10 0,60, P25 0,65, médiane 0,70, P75 0,74, P90 0,77, max 0,83. Bibliothèque LOAO : P5 0,597, P10 0,624, médiane 0,672. Les candidats sont en moyenne *plus* proches de la bibliothèque que la bibliothèque d'elle-même en LOAO. Deux raisons : la graine de chaque candidat est dans la bibliothèque (l'artiste lui-même n'est pas exclu), et la découverte vise justement des voisins.
- Avec k = 10 : 86,6 % au seuil p10, 92,9 % au seuil p5.

### Les 15 meilleurs (k = 20)

| Artiste | Titre | Graine | Ancien verdict (proba) | s_20 |
|---|---|---|---|---|
| DJ Seinfeld | If U Like Me (Edit) | 1tbsp | accepted (0,936) | 0,827 |
| MEZERG | Welcome Theremin | Acid Arab | accepted (0,999) | 0,818 |
| DJ Seinfeld | Hopecore | 1tbsp | accepted (0,856) | 0,816 |
| Atrip | the one | 1tbsp | accepted (0,968) | 0,802 |
| Oliver Koletzki | Bones | Acid Pauli | accepted (0,948) | 0,799 |
| Kettama | It Gets Better (Forever Mix) | 1tbsp | rejected_colour (0,275) | 0,795 |
| Agoria | Scala (Vintage Culture Remix) | Acid Arab | accepted (0,955) | 0,795 |
| Skin On Skin | the floor (fred remix) | 1tbsp | accepted (0,869) | 0,794 |
| Husbands | Run Along, Son | Agar Agar | accepted (1,000) | 0,790 |
| The Crystal Method | Busy Child | Adam Freeland | accepted (0,998) | 0,789 |
| The Chemical Brothers | Hey Boy Hey Girl | Adam Freeland | accepted (0,993) | 0,788 |
| MEZERG | Blue Pink Jam | Acid Arab | accepted (0,999) | 0,788 |
| Psy 4 de la Rime | Le son des bandits (feat. Saleem) | 113 | rejected_colour (0,568) | 0,788 |
| Peggy Gou | Starry Night (Edit) | 1tbsp | accepted (0,991) | 0,787 |
| Mall Grab | Breathing | 1tbsp | accepted (0,952) | 0,785 |

### Les 15 moins bons (k = 20)

| Artiste | Titre | Graine | Ancien verdict (proba) | s_20 |
|---|---|---|---|---|
| Propaganda | Dream Within A Dream (Stephen Lipson's Digital Variation) | ABC | rejected_novelty (0,900) | 0,492 |
| Boney M. | Daddy Cool | ABBA | accepted (0,982) | 0,520 |
| Bonnie Tyler | Holding Out for a Hero (Single Version) | ABBA | accepted (0,804) | 0,550 |
| Cliff Richard | Move It (1958 Version) | ABBA | accepted (0,989) | 0,554 |
| Scritti Politti | The Word Girl | ABC | accepted (0,941) | 0,556 |
| Thomas Dolby | Airhead | ABC | accepted (0,838) | 0,556 |
| 23 Skidoo | Coup (12" 45 Version) | A Certain Ratio | accepted (1,000) | 0,558 |
| The Human League | Human (Remastered 2003) | ABC | accepted (0,935) | 0,561 |
| Cabaret Voltaire | Nag, Nag, Nag | A Certain Ratio | accepted (0,996) | 0,562 |
| Bee Gees | Night Fever (From "Saturday Night Fever" Soundtrack) | ABBA | accepted (0,884) | 0,569 |
| Thomas Dolby | She Blinded Me With Science (Extended Version) | ABC | accepted (0,994) | 0,571 |
| Wang Chung | Dance Hall Days (Re-Recorded) | ABC | accepted (0,934) | 0,573 |
| Gloria Gaynor | I Will Survive (Original 7" Version) | ABBA | accepted (0,884) | 0,574 |
| Au Pairs | It's Obvious | A Certain Ratio | accepted (0,999) | 0,576 |
| Boney M. | Rasputin | ABBA | accepted (0,943) | 0,578 |

Lecture : le haut du classement est dominé par la house et l'électro récentes, la zone la plus dense de la bibliothèque. Le bas l'est par la pop et le post-punk 70-80s, qui y sont peu représentés, alors même que ABBA, ABC et A Certain Ratio sont des graines de la bibliothèque. Le score kNN mesure la *densité locale* de la bibliothèque (époque, texture de production), pas le goût.

### Acceptation par graine (k = 20)

| Graine | n | Seuil p10 | Seuil p5 | Ancien modèle | Médiane s_20 |
|---|---|---|---|---|---|
| 1tbsp | 27 | 26 (96 %) | 27 | 17 (63 %) | 0,761 |
| Acid Pauli | 9 | 9 (100 %) | 9 | 9 | 0,754 |
| 113 | 42 | 42 (100 %) | 42 | 17 (40 %) | 0,740 |
| Acid Arab | 12 | 12 (100 %) | 12 | 12 | 0,730 |
| Agar Agar | 15 | 14 (93 %) | 14 | 15 | 0,728 |
| Ada Lea | 15 | 14 (93 %) | 15 | 13 | 0,725 |
| Adrien Gallo | 21 | 21 (100 %) | 21 | 7 (33 %) | 0,697 |
| Adult DVD | 39 | 37 (95 %) | 39 | 39 | 0,696 |
| A Certain Ratio | 42 | 31 (74 %) | 37 | 42 (100 %) | 0,689 |
| Adam Freeland | 27 | 23 (85 %) | 26 | 26 | 0,669 |
| ABBA | 39 | 24 (62 %) | 29 | 32 (82 %) | 0,657 |
| ABC | 48 | 35 (73 %) | 41 | 43 (90 %) | 0,651 |

### Doublons (même artiste + titre normalisé, identifiants Deezer différents)

12 groupes, 14 titres en trop, soit 4,2 % des 336. La normalisation retire les mentions remaster, version, edit, re-record, single, etc. Les remixes, eux, restent des titres distincts.

- Gloria Gaynor, I Will Survive : 975366 (Rerecorded), 10769094 (1981 Re-recording), 1421635422 (Original 7")
- Josef K, Sorry for Laughing : 78729622, 78729689, 78865882 (Crepuscule Single Version)
- Nik Kershaw, Wouldn't It Be Good : 1174769, 65200263
- Spandau Ballet, True : 3130319 (Single Edit, acceptée), 3159045 (2003 Remaster, **rejetée couleur**). L'ancien modèle se contredit sur le même morceau.
- Kajagoogoo, Too Shy : 3357587, 3518241 (Extended)
- FC Kahuna, Hayling : 9861456, 3783037642
- Cabaret Voltaire, I Want You : 71176637 (Remastered), 78334608 (7'')
- Heaven 17, Temptation : 79333905, 79333915 (Remastered 2006)
- Wang Chung, Dance Hall Days : 110858204 (Re-Recorded), 1091006062
- Bananarama, Venus : 420143322, 421388682
- Cirrus, Stop & Panic : 2043436247, 2043436257 (Edit)
- Killing Joke, Love Like Blood : 2217199357, 2374844145

Presque tout vient des graines ABC, ABBA et A Certain Ratio (catalogues 80s réédités). Il faut dédoublonner en amont du jugement, quelle que soit la méthode de score.

## 5. Limites, honnêtement

1. **Les artistes isolés de la bibliothèque sont pénalisés.** Au seuil p10 (k = 10), 286 titres de bibliothèque sont rejetés, répartis sur 178 artistes. 49 artistes voient au moins la moitié de leurs titres rejetés, et 9 les voient tous rejetés : Babatunde Olatunji, Cybotron, Manu Chao, Candy Flip, Men Without Hats, The Supremes, Nico, The Monks, une compilation. Ce sont les coins singuliers de la bibliothèque (percussions africaines, électro 80s, chanson métissée, soul 60s). Un kNN à une classe les juge « pas moi » simplement parce qu'ils sont rares, alors que la rareté fait partie du goût. La taille de l'artiste n'y change presque rien (Spearman 0,11 entre nombre de titres et score moyen).
2. **Les négatifs ne sont pas séparables avec un seuil tiré de la seule bibliothèque.** Au seuil p10, 79 à 86 % passent selon k (72 à 81 % sur le test strict). Commercial_fr est le pire cas (90 à 97 % acceptés). Ses voisins sont Almeria, Bagarre, Brodinski, Clipse et Teki Latex, tous légitimes dans la bibliothèque. De même, le metal tombe sur Jinjer (groupe de metal présent dans la bibliothèque) et le hard techno sur Contrefaçon et M83. Discogs-EffNet encode le style et le genre : la bibliothèque couvre ces genres, donc la ressemblance ne peut pas trancher. Seul un modèle qui voit des contre-exemples le peut (classifieur, ou kNN contrastif à 0,974).
3. **Biais de mesure en faveur des candidats.** L'artiste de la graine reste dans le voisinage d'un candidat, alors que l'artiste d'un titre de bibliothèque en est exclu (LOAO). Les taux d'acceptation des candidats (86 à 93 %) sont donc optimistes par construction.
4. **Les négatifs sont des pièges ciblés, pas un échantillon du monde.** Ils ont été choisis proches de la bibliothèque (voir `close_negatives` dans le rapport du jeu de données). C'est voulu, puisque ce sont les erreurs qui comptent, mais l'AUC mesurée ici est celle du cas difficile.
5. **Extraits de 30 s** des deux côtés, ce qui assure la cohérence du domaine. Le transfert vers les fichiers complets n'a pas été mesuré pour le kNN.
6. **Le centroïde fait mieux que le kNN** (AUC 0,79 ; au seuil p10 seulement 15 % du metal accepté). Il reste inutilisable sur commercial_intl (79 % acceptés) et hard_techno (68 %), et il écrase encore plus la diversité.

## Recommandation

Garder le classifieur binaire comme filtre de couleur. La ressemblance kNN à la bibliothèque seule n'apporte rien comme filtre. À k = 20 et au seuil LOAO p10 (0,623), elle garde 90 % de la bibliothèque et laisse passer 79 % des négatifs. Elle ne tient qu'un rôle : indicateur secondaire de « zone dense de ma bibliothèque », utile pour un tri, pas pour un verdict. Si l'on veut un score de ressemblance qui fonctionne, il faut une formulation contrastive (voisins dans la bibliothèque contre voisins négatifs). Cela revient à refaire un classifieur, et celui en place fait déjà mieux (0,985 contre 0,974).
