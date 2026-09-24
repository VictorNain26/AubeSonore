# Contre-exemples AubeSonore : rapport de curation

Date de constitution : 24 septembre 2026. Fichier produit : `negatives.toml` (324 artistes).

| Catégorie | Effectif | Source principale |
|---|---|---|
| `commercial_fr` | 80 | SNEP Top Singles et SNEP Top Radio (Yacast), 2025-2026 |
| `commercial_intl` | 81 | Billboard Hot 100 (2025-2026), SNEP Top Radio/Top Singles pour les étrangers classés en France |
| `metal` | 85 | Discogs, styles des sorties de l'artiste (API publique) |
| `hard_techno` | 78 | Discogs, styles des sorties de l'artiste (API publique) |

Chaque entrée du TOML porte une source datée et précise : le classement, la semaine, le rang, le titre et l'URL pour le commercial ; le style Discogs, sa fréquence et une sortie d'exemple avec son URL pour le métal et la hard techno.

## 1. Sources consultées

Toutes les pages ont été consultées le 24/09/2026.

### Classements commerciaux
- **SNEP Top Singles (hebdomadaire)**, toutes les semaines de 2025 (S02 à S52) et de 2026 (S01 à S38, la dernière étant la semaine du 18 septembre 2026). URL type : `https://snepmusique.com/les-tops/le-top-de-la-semaine/top-albums/?categorie=Top%20Singles&annee=2026&semaine=38`
- **SNEP Top Radio (Yacast, 60 titres)**, toutes les semaines de 2025 (S01 à S52) et de 2026 (S01 à S38). URL type : `https://snepmusique.com/classement-radio/?annee=2026&semaine=38`. Ce classement sert de source « playlist radio ». Il agrège les diffusions de NRJ, Chérie FM, RFM et des autres radios.
- **SNEP Top Albums**, semaines 04, 20 et 38 de 2026, en appoint.
- **SNEP Top Rock & Metal**, semaine 38 de 2026, consulté pour repère et non utilisé comme source.
- **Billboard Hot 100**, 13 semaines : 2025-06-21, 2025-08-23, 2025-10-25, 2025-12-20, 2026-01-24, 2026-02-21, 2026-03-21, 2026-04-25, 2026-05-23, 2026-06-20, 2026-07-25, 2026-08-22 et 2026-09-19. URL type : `https://www.billboard.com/charts/hot-100/2026-09-19/`
- Sites des radios : NRJ et Chérie FM (`/titres-diffuses`) refusent l'accès automatisé (HTTP 403). RFM (`https://www.rfm.fr/cetait-quoi-ce-titre`) n'affiche que les 10 derniers titres, ce qui est trop peu pour servir de source. Le SNEP Top Radio les remplace.
- Règle de choix de la source commerciale : on retient d'abord une entrée du Top 50, puis la plus récente, puis le meilleur rang. Les titres collaboratifs sont conservés tels que crédités par le classement.

### Styles musicaux
- **API Discogs** `https://api.discogs.com/database/search?artist=<nom>&type=release&per_page=100` (accès public). Pour chaque artiste, on compte les styles sur ses 100 premières sorties indexées. Seules les sorties dont l'artiste crédité correspond au nom sont retenues ; le suffixe d'homonymie « (n) » est ignoré.
  - Cette analyse porte sur les 699 artistes de la bibliothèque et sur les 238 candidats métal et hard techno.
  - La source indiquée dans le TOML donne le style, sa fréquence et une sortie d'exemple (URL `https://www.discogs.com/release/...`).
- **MusicBrainz** (`https://musicbrainz.org/ws/2/artist/?query=...`) : tags communautaires des 699 artistes de la bibliothèque, pour recouper Discogs.
- **API Deezer** (`/search/artist`, `/artist/<id>`, `/artist/<id>/top?limit=5`) : identifiants, nombre de fans, previews et contributeurs des titres les plus écoutés.
- Rate Your Music n'a pas été consulté.

## 2. Artistes de la bibliothèque proches d'une catégorie exclue, et sous-styles gardés

Règle appliquée : un style est considéré comme présent chez un artiste de la bibliothèque s'il couvre environ 10 % ou plus de ses sorties Discogs, ou s'il ressort clairement des tags MusicBrainz. Les occurrences isolées dues à des homonymes ou à des remixes signés par d'autres ont été vérifiées à la main (par exemple « Burial », « Goat », « Blod » ou « Decius », dont les styles death et black viennent d'homonymes).

### Métal, rock dur et hardcore
| Artiste de la bibliothèque | Styles constatés (Discogs, sauf mention) | Sous-styles gardés, donc exclus des négatifs |
|---|---|---|
| Jinjer | Progressive Metal 72 %, Metalcore 61 %, Groove Metal 32 %, **Heavy Metal 22 %**, Funk Metal 4 %, Death Metal 3 % | Metalcore, métal progressif, groove metal, funk metal ; par extension deathcore et djent |
| Rage Against the Machine | Funk Metal 41 %, Hard Rock 34 %, Nu Metal 16 %, Rap Metal (MusicBrainz) | Nu metal, rap metal, métal alternatif, hard rock |
| XXXTENTACION | Nu Metal 10 %, trap metal (MusicBrainz) | Nu metal, trap metal |
| Denzel Curry | trap metal (MusicBrainz), Funk Metal | Trap metal |
| MC5 | Hard Rock 37 % | Hard rock |
| Journey | Hard Rock 14 %, AOR, Arena Rock | Hard rock, AOR |
| The Who, Babe Ruth, Patti Smith, Lou Reed | Hard Rock (Discogs et MusicBrainz) | Hard rock |
| The Smashing Pumpkins | métal alternatif et rock industriel (MusicBrainz) | Métal alternatif, métal industriel |
| Skegss, Karkara | Stoner Rock 10 % (Skegss) ; stoner et heavy rock (MusicBrainz, Karkara) | Stoner rock ; par prudence doom et sludge |
| Soul Glo | Hardcore 53 %, Post-Hardcore 30 %, Crust 13 %, screamo (MusicBrainz) | Hardcore punk, post-hardcore, crust, screamo |
| Beastie Boys, The Notwist, Amyl and the Sniffers | hardcore punk (MusicBrainz), Hardcore 4 à 6 % | Hardcore punk |
| IDLES, Pixies, Dry Cleaning | post-hardcore, noise rock | Post-hardcore, noise rock |
| Ramones, The Spits, Bikini Kill, Downtown Boys, Snõõper, Autobahns | Punk | Punk sous toutes ses formes |
| Sigur Rós | post-metal (MusicBrainz) | Post-metal |

**Conséquence pour le métal** : sont exclus tout le hard rock, le heavy metal classique et la NWOBHM, qui chevauchent le hard rock sur Discogs (voir la section 3). Sont exclus aussi le nu metal, le métal alternatif et industriel, le metalcore, le deathcore, le métal progressif, le groove metal, le stoner, le doom et le sludge. Ne restent que le thrash et le speed, le death et le mélodeath, le black, le power et le symphonique, le folk et le viking.

Filtre appliqué à chaque candidat métal : son style principal est l'un des styles extrêmes ci-dessus, avec au moins 30 % de ses sorties, et aucun style gardé ne dépasse environ 5 à 10 % de ses sorties.

### Techno dure et électronique dure
| Artiste de la bibliothèque | Styles constatés | Sous-styles gardés, donc exclus des négatifs |
|---|---|---|
| Gesaffelstein, MSTRKRFT | Techno, EBM, Industrial ; industrial techno (MusicBrainz) | Techno industrielle, EBM |
| Dame Area, Kontravoid, Sextile, Black Strobe, Sally Dige | Industrial jusqu'à 93 %, EBM jusqu'à 73 % | Indus, EBM, dark electro |
| clipping. | Noise 74 %, Industrial 37 %, Breakcore 7 %, Power Electronics | Noise, breakcore, power electronics |
| Benny Benassi | Hard House 10 %, Hard Trance 1 %, Hardstyle 2 % (remixes) | **Hard house** |
| Moby | Hard Trance 6 %, Happy Hardcore 1 %, Hardcore 1 % (période rave du début des années 1990) | **Hard trance**, écartée par prudence |
| Johannes Heil, Kevin Saunderson, DJ Hell, Irène Drésel, Kompromat, Acid Arab… | Techno, Acid, Minimal | Techno, acid |
| LFO | Hardcore 2 %, Hard Techno 1 % (bleep et rave de 1990) | Proportion inférieure au seuil : non gardé |

**Conséquence pour la hard techno** : la hard trance, la hard house et le happy hardcore à dominante trance sont exclus, tout comme Scooter. La techno dite « industrielle » est exclue aussi : Sara Landry, Dax J, 999999999, Chris Liebing, et DJ Rush ont une dominante Techno ou Acid supérieure à 60 % sur Discogs, Klangkuenstler une dominante Tech House (46 %) et Techno (39 %). Ne restent que :
- le hardstyle et le rawstyle ;
- le hardcore gabber et le frenchcore ;
- la hard techno et le schranz, pour les seuls artistes où ces styles couvrent au moins 30 à 40 % des sorties.

## 3. Cas limites écartés, et pourquoi

### Commercial français
- **Théodora** (bibliothèque) enchaîne les duos avec le Top 50 rap : Disiz (« Melodrama »), PLK, Guy2Bezbar, Meryl, et même Jul (« Zou Bisou »). Ont donc été écartés Disiz, PLK, Guy2Bezbar et Meryl, dont le top Deezer contient un titre de Théodora.
  - **Jul** est conservé, puisque c'est l'exemple explicite de Victor. Un de ses 5 titres les plus écoutés (« Zou Bisou ») est toutefois avec Théodora.
- Claudio Capéo est écarté : son top Deezer contient un titre avec Bigflo & Oli, qui sont dans la bibliothèque.
- Rim'K (membre de 113), Akhenaton et Shurik'n (IAM) ne sont pas proposés.
- Sont écartés parce que Victor pourrait les aimer (pop d'auteur, cold wave, cloud rap, nouvelle chanson) :
  - Angèle, Clara Luciani, Juliette Armanet, Zaho de Sagazan, Pomme, Santa, Adèle Castillon (ex-Videoclub), Charlotte Cardin, Pierre de Maere, Julien Doré ;
  - Stromae, Orelsan, PNL, Damso, Hamza, Booba, Freeze Corleone, Kaaris ;
  - Indochine, Mylène Farmer, Vanessa Paradis ;
  - Francis Cabrel et Jean-Jacques Goldman, pour leur proximité avec Daniel Balavoine ;
  - Bénabar et Vincent Delerm, pour leur proximité avec Cali, Olivia Ruiz et La Grande Sophie ;
  - Superbus, Kyo et Zazie, pop-rock radio d'époque proche de Mickey 3D et de La Grande Sophie.
- Sont écartés parce que la French touch et la house sont au cœur de la bibliothèque : David Guetta, DJ Snake, Hugel, Ofenbach, Bleu Soleil et Sound of Legend.
- Black M, Keen'V, Jenifer, Nolwenn Leroy, Patrick Bruel, Calogero et Tal sont écartés faute d'entrée dans les classements SNEP de 2025-2026 : pas de source récente vérifiable.
- Luiza (homonymie sur Deezer) et Wixo (moins de 3 previews) sont écartés.

### Commercial international
- **HUNTR/X, EJAE et le « KPop Demon Hunters Cast »** sont écartés : Audrey Nuna, qui chante dans « Golden », est dans la bibliothèque.
- JENNIE est écartée : son titre le plus écouté est « Dracula » de Tame Impala, qui est dans la bibliothèque.
- BTS et TINI sont écartés : leur top Deezer contient un titre avec Coldplay, qui est dans la bibliothèque.
- Tiësto est écarté : son top contient un titre de Dido, qui est dans la bibliothèque.
- Jelly Roll est écarté : son top contient un titre avec Dr. Dre, qui est dans la bibliothèque.
- HARDY est écarté : son top contient un titre de Falling in Reverse (post-hardcore et metalcore, sous-styles gardés).
- Sont écartés parce qu'ils sont ambigus, entre indie et tube ou proches du goût de Victor :
  - Billie Eilish, Dua Lipa, The Weeknd, Lady Gaga, SZA, Chappell Roan, Olivia Rodrigo, Lola Young, Gracie Abrams, sombr, Noah Kahan, Hozier, RAYE, Tyla, Burna Boy, Rosalía, PinkPantheress, Olivia Dean ;
  - Kendrick Lamar, Travis Scott, Drake, Post Malone, Nicki Minaj, Doja Cat, Macklemore ;
  - Imagine Dragons, OneRepublic et Maroon 5, à cause de Coldplay dans la bibliothèque ;
  - Harry Styles, Damiano David, Bon Jovi (qui touche au hard rock) et Andrea Bocelli (à cause de Ludovico Einaudi).
- Sam Martin et Jax Jones sont écartés, faute de classement récent ou à cause de previews mal attribuées.

### Métal
- Sont écartés à cause de la part de Hard Rock sur Discogs : Metallica (14 %, plus l'album « Lulu » avec Lou Reed, qui est dans la bibliothèque), Judas Priest (13 %), Accept (10 %), Saxon (37 %), Dio (25 %) et Six Feet Under (9 %).
- **Heavy metal pur** : Iron Maiden, Manowar, Running Wild, Grave Digger et Sortilège sont écartés. Jinjer porte le style « Heavy Metal » sur 22 % de ses sorties Discogs, et ces groupes n'ont pas de sous-style extrême dominant.
  - Ce style a été toléré seulement comme style secondaire chez des groupes power ou thrash (Helloween, Sabaton, HammerFall…).
- Sont écartés pour leur part de styles gardés :
  - Sepultura : groove metal et nu metal ;
  - Pestilence (15 %), Death (7 %), Wintersun et Omnium Gatherum : métal progressif ;
  - Equilibrium : metalcore ;
  - Cryptopsy : deathcore ;
  - Beast in Black : métal industriel à 19 % ;
  - Asphyx et Therion : doom à 10 % ;
  - Autopsy : hardcore à 9 %.
- Arch Enemy est écarté : mélodeath à chant féminin, très proche du public de Jinjer.
- Gojira est écarté (death, groove et progressif).
- Grindcore, crossover thrash (Municipal Waste, Suicidal Tendencies) et blackgaze (Alcest, Deafheaven) sont écartés, à cause de Soul Glo, de Slowdive et de My Bloody Valentine.
- Metal gothique, métal industriel et Neue Deutsche Härte sont écartés (Type O Negative, Rammstein, Ministry) : goth et indus sont dans la bibliothèque.
- Motörhead et Black Sabbath sont écartés : proto-punk et stoner, proches d'Amyl and the Sniffers et de Ty Segall.
- Dark Angel est écarté : l'homonyme Deezer est un producteur house. Vio-lence, Heathen, Monstrosity, Vomitory, Hate Eternal, Kalmah, Taake, 1349, Carpathian Forest et Avantasia (Discogs vide) ont été écartés pour ramener l'effectif sous 90.

### Hard techno
- Sont écartés pour leur part de hard trance, de trance ou de hard house, styles gardés à cause de Moby et de Benny Benassi :
  - Technoboy (18 %), Blutonium Boy (12 %), Charly Lownoise (25 %), Mental Theo (trance 21 %), Darren Styles, Gammer, Kutski, Scooter ;
  - tous les artistes de hard trance : Yoji Biomehanika, DJ Scot Project, Kai Tracid, DJ Wag, Commander Tom, Trym, Alignment.
- Sont écartés pour leur dominante techno, acid ou indus : Marc Acardipane (techno 40 %), N-Vitral (techno 12 %), The Outside Agency (acid 15 %), Tuneboy (techno 9 %), Chris Liebing, DJ Rush, Sara Landry, Dax J, 999999999, Klangkuenstler, Felix Kröcher, Frank Kvitta, Somewhen et Charlie Sparks.
- I Hate Models et Amelie Lens n'ont pas été proposés : trop ambigus par rapport aux goûts techno de Victor.
- Sont écartés faute de source ou d'identifiant fiable :
  - Clara Cuvé, DJ Amok (moins de 3 previews) ;
  - Fantasm (top Deezer attribué à d'autres) ;
  - The Darkraver, DJ Buzz Fuzz, A.Paul (aucune sortie Discogs correspondant au nom) ;
  - Mad Dog, Lenny Dee (homonymie Discogs) ;
  - Paul Elstak (nom Deezer « DJ Paul Elstak ») ;
  - Onlynumbers (3 sorties seulement).

## 4. Contrôle par script (`verify.py`, exécuté le 24/09/2026)

```
Effectifs : commercial_fr=80, commercial_intl=81, metal=85, hard_techno=78 (total 324)
Doublons de nom : 0 []
Doublons d'id : 0 []
Noms présents dans la bibliothèque (égalité normalisée) : 0 []
Inclusions partielles nom/bibliothèque (à examiner) : [('Helena', 'helena deland'), ('Luke Combs', 'luke'), ('Luke Bryan', 'luke'), ('ROSÉ', 'minitel rose'), ('Nico Moreno', 'nico')]
Nom Deezer différent du nom TOML : []
Artistes avec moins de 3 previews dans le top 5 : []
Top 5 Deezer contenant un artiste de la bibliothèque (artiste ou contributeur) : [('Jul', 'ZOU BISOU', 'Theodora')]
```

- Normalisation des noms : NFKD, suppression des accents, casefold, ponctuation remplacée par des espaces. La comparaison porte sur les 699 lignes de `library_artists.txt`.
- Les inclusions partielles sont de simples coïncidences de mots : Helena (Star Academy) n'est pas Helena Deland, et Luke Combs n'est pas Luke. Il n'y a aucun doublon réel.
- Pour chaque artiste, les 5 titres les plus écoutés sur Deezer ont été récupérés à nouveau : au moins 3 previews non vides pour les 324 artistes (seuil exigé ; aucun échec).
- L'identifiant Deezer renvoie bien le nom attendu. Pour les homonymes, le nombre de fans et les titres ont été vérifiés : Death Angel, Grave, Nile, Immortal, Helena, Marine, Carla, Eva, R2…
- Le fichier TOML se charge sans erreur (`tomllib`).

## 5. Points d'attention

1. **Poids du rap dans `commercial_fr`** : environ la moitié des 80 artistes sont des rappeurs ou des artistes afro/shatta du Top SNEP actuel, ce qui reflète le classement réel.
   - Risque : le modèle pourrait associer « rap FR » à « négatif », alors que IAM, 113 et Bigflo & Oli sont dans la bibliothèque.
   - À surveiller sur les rappeurs FR de la bibliothèque. Il est possible de retirer une partie des rappeurs de second rang : Chily, Landy, Zola, Cheu-B, Lagui.
2. **Genres présents dans la bibliothèque en proportion marginale, mais pas gardés** :
   - Gabber : Björk (« Fossora », 2 % de ses sorties) et Froid Dub (bande originale « Fotogenico », 2024, qui contient un titre « Gabber 01 ») ;
   - Death Metal : Jinjer, 3 % de ses sorties ;
   - Hardcore électronique et hard techno : LFO, 1 à 2 % de ses sorties.

   Ces styles restent dans les négatifs parce que Victor les exclut nommément. Si la règle absolue doit s'appliquer dès une seule sortie, il faut retirer les 31 artistes gabber, hardcore et frenchcore de `hard_techno`, et l'effectif passe sous 70.
3. **« Heavy Metal » sur Discogs** : Jinjer porte ce style sur 22 % de ses sorties. Les groupes de heavy pur en ont été exclus, mais il subsiste comme style secondaire chez les groupes power et thrash retenus.
4. **Ce qui fait foi dans le TOML** : les sources Discogs citent une sortie d'exemple (souvent une édition japonaise, dont le titre est bilingue) et la fréquence du style sur les 100 premières sorties indexées. La fréquence fait foi, pas l'exemple seul.
