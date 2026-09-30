# « Ça ressemble à ma bibliothèque » : quel score, quelles preuves

Recherche du 2026-09-24. Question : remplacer la régression logistique « bibliothèque contre 4 catégories de
négatifs » (81 % d'acceptation, probabilités saturées à 1,00) par un score de similarité kNN candidat → bibliothèque
dans l'espace Discogs-EffNet, avec un seuil tiré de la bibliothèque elle-même.

Règle suivie : chaque affirmation renvoie à une source consultée le 2026-09-24. Le niveau de vérification est indiqué
pour chaque source : **[TXT]** texte intégral lu, **[ABS]** résumé ou page officielle lus, **[META]** seules les
métadonnées sont vérifiées. Ce que je n'ai trouvé nulle part porte la mention **non trouvé**. Ce qui relève de mon
raisonnement, sans source, porte la mention **(raisonnement)**.

## 0. Sources

| Réf. | Source | Vérif. |
|---|---|---|
| [ELKAN08] | C. Elkan, K. Noto, *Learning Classifiers from Only Positive and Unlabeled Data*, KDD 2008, p. 213-220. https://doi.org/10.1145/1401890.1401920 | TXT |
| [BEKKER20] | J. Bekker, J. Davis, *Learning from positive and unlabeled data: a survey*, Machine Learning 109(4):719-760, 2020. https://doi.org/10.1007/s10994-020-05877-5 | TXT |
| [LEE03] | W. S. Lee, B. Liu, *Learning with Positive and Unlabeled Examples Using Weighted Logistic Regression*, ICML 2003, p. 448-455. https://www.aaai.org/Papers/ICML/2003/ICML03-060.pdf | ABS |
| [JAIN17] | S. Jain, M. White, P. Radivojac, *Recovering True Classifier Performance in Positive-Unlabeled Learning*, AAAI 2017. https://arxiv.org/abs/1702.00518 | TXT |
| [SKL] | scikit-learn 1.9.1, *Novelty and Outlier Detection*. https://scikit-learn.org/stable/modules/outlier_detection.html | ABS |
| [GOLD16] | M. Goldstein, S. Uchida, *A Comparative Evaluation of Unsupervised Anomaly Detection Algorithms for Multivariate Data*, PLOS ONE 11(4):e0152173, 2016. https://doi.org/10.1371/journal.pone.0152173 | ABS |
| [BERG20] | L. Bergman, N. Cohen, Y. Hoshen, *Deep Nearest Neighbor Anomaly Detection*, arXiv:2002.10445, 2020 (préprint, pas de version publiée vérifiée). https://arxiv.org/abs/2002.10445 | ABS |
| [BATES23] | S. Bates, E. Candès, L. Lei, Y. Romano, M. Sesia, *Testing for Outliers with Conformal p-values*, Annals of Statistics 51(1):149-178, 2023. https://arxiv.org/abs/2104.08279 | ABS |
| [P22] | P. Alonso-Jiménez, X. Serra, D. Bogdanov, *Music Representation Learning Based on Editorial Metadata from Discogs*, ISMIR 2022. https://archives.ismir.net/ismir2022/paper/000099.pdf | TXT |
| [P23] | P. Alonso-Jiménez, X. Favory, H. Foroughmand, G. Bourdalas, X. Serra, T. Lidy, D. Bogdanov, *Pre-Training Strategies Using Contrastive Learning and Playlist Information for Music Classification and Similarity*, ICASSP 2023. https://arxiv.org/abs/2304.12257 | TXT |
| [MODELS] | Essentia, page des modèles, section Discogs-EffNet. https://essentia.upf.edu/models.html ; métadonnées `discogs-effnet-bs64-1.json`, `discogs_artist_embeddings-effnet-bs64-1.json`, `discogs_multi_embeddings-effnet-bs64-1.json` sous https://essentia.upf.edu/models/feature-extractors/discogs-effnet/ | TXT |
| [ALGO] | Essentia, `TensorflowPredictEffnetDiscogs`. https://essentia.upf.edu/reference/std_TensorflowPredictEffnetDiscogs.html | ABS |
| [BATLLE24] | R. Batlle-Roca, W.-H. Liao, X. Serra, Y. Mitsufuji, E. Gómez, *Towards Assessing Data Replication in Music Generation with Music Similarity Metrics on Raw Audio*, ISMIR 2024. https://arxiv.org/abs/2407.14364 | TXT (§ métriques) |
| [RADO10] | M. Radovanović, A. Nanopoulos, M. Ivanović, *Hubs in Space: Popular Nearest Neighbors in High-Dimensional Data*, JMLR 11:2487-2531, 2010. https://jmlr.org/papers/v11/radovanovic10a.html | ABS |
| [SCHN12] | D. Schnitzer, A. Flexer, M. Schedl, G. Widmer, *Local and Global Scaling Reduce Hubs in Space*, JMLR 13:2871-2902, 2012. https://jmlr.org/papers/v13/schnitzer12a.html | TXT |
| [FELD19] | R. Feldbauer, A. Flexer, *A comprehensive empirical comparison of hubness reduction in high-dimensional spaces*, Knowledge and Information Systems 59:137-166, 2019. https://doi.org/10.1007/s10115-018-1205-y | ABS |
| [SUZUKI13] | I. Suzuki, K. Hara, M. Shimbo, M. Saerens, K. Fukumizu, *Centering Similarity Measures to Reduce Hubs*, EMNLP 2013, p. 613-623. https://aclanthology.org/D13-1058/ | ABS |
| [CONNEAU18] | A. Conneau, G. Lample, M. Ranzato, L. Denoyer, H. Jégou, *Word Translation Without Parallel Data*, ICLR 2018 (définition de CSLS, §2.3). https://arxiv.org/abs/1710.04087 | TXT (§2.3) |
| [AUCOU08] | J.-J. Aucouturier, F. Pachet, *A scale-free distribution of false positives for a large class of audio similarity measures*, Pattern Recognition 41(1):272-284, 2008. https://doi.org/10.1016/j.patcog.2007.04.012 | META |
| [FLEX07] | A. Flexer, *A Closer Look on Artist Filters for Musical Genre Classification*, ISMIR 2007. https://archives.ismir.net/ismir2007/paper/000341.pdf | ABS |
| [FLEX10] | A. Flexer, D. Schnitzer, *Effects of Album and Artist Filters in Audio Similarity Computed for Very Large Music Databases*, Computer Music Journal 34(3):20-28, 2010. Version rapport technique OFAI : https://ofai.at/papers/oefai-tr-2010-01.pdf | TXT (rapport technique) |
| [PAMP05] | E. Pampalk, A. Flexer, G. Widmer, *Improvements of Audio-Based Music Similarity and Genre Classification*, ISMIR 2005 | META (cité par [FLEX10]) |
| [BOGD13] | D. Bogdanov, M. Haro, F. Fuhrmann, A. Xambó, E. Gómez, P. Herrera, *Semantic audio content-based music recommendation and visualization based on user preference examples*, Information Processing & Management 49(1):13-33, 2013. https://doi.org/10.1016/j.ipm.2012.06.004 | TXT |
| [WESTON13] | J. Weston, R. J. Weiss, H. Yee, *Nonlinear Latent Factorization by Embedding Multiple User Interests*, RecSys 2013, p. 65-68. https://www.ee.columbia.edu/~ronw/pubs/recsys2013-usermax.pdf | ABS |
| [PAL20] | A. Pal et al., *PinnerSage: Multi-Modal User Embedding Framework for Recommendations at Pinterest*, KDD 2020, p. 2311-2320. https://arxiv.org/abs/2007.03634 | ABS |

Pour [AUCOU08] le résumé de l'éditeur n'était pas accessible. L'affirmation reprise au §3 (les « hubs » sont des
faux positifs récurrents) vient d'une notice secondaire (Semantic Scholar). Je la donne comme **non vérifiée à la
source**.

## 1. Seulement des positifs : kNN, one-class, PU ou classifieur ?

**Le classifieur actuel ne relève d'aucun des deux cadres prévus pour ce cas.** C'est un classifieur binaire
positifs/négatifs dont les négatifs ont été choisis à la main. [BEKKER20] (§8.1) rappelle que la classe négative
« often has a large variety, for which it is difficult to label a representative sample ». Le modèle apprend donc la
frontière avec ces 4 catégories, pas l'enveloppe du goût. C'est exactement ce que montrent les 81 % d'acceptation.
Une probabilité saturée à 1,00 est le comportement attendu d'une régression logistique sur des classes presque
séparables en 1 280 dimensions **(raisonnement)**.

**Deux cadres existent, et ils ne répondent pas à la même question :**

- **One-class / détection de nouveauté.** On n'a que des positifs, et on demande si un nouvel exemple appartient à
  leur distribution. scikit-learn l'appelle *novelty detection* : l'entraînement est « not polluted by outliers » et
  l'on juge une observation **nouvelle** [SKL]. C'est notre cas au sens strict : la bibliothèque est la seule vérité.
- **PU learning.** Il faut des positifs et un échantillon **non étiqueté représentatif de la population**.
  [ELKAN08] (lemme 1) montre que sous l'hypothèse SCAR (positifs étiquetés tirés au hasard parmi tous les positifs),
  un classifieur « étiquetés contre non-étiquetés » g(x) vérifie p(y=1|x) = g(x)/c. Pour classer, g suffit, car f est
  une fonction croissante de g. [BEKKER20] (§8.2) oppose les deux cadres : en one-class, « the negative class consists
  of all other possible classes », alors qu'en PU « the domain of interest is defined by the unlabeled data ».

**Lequel pour AubeSonore.** Le pool de candidats de chaque passe *est* un échantillon non étiqueté, donc le PU
serait applicable. Mais l'hypothèse SCAR n'y tient pas : la bibliothèque n'est pas un tirage au hasard parmi « tout
ce qu'il aimerait », et le pool change à chaque passe selon les sources de découverte **(raisonnement)**. Le choix
textbook est donc :

- **scorer** en one-class (similarité à la bibliothèque) ;
- **évaluer** avec les outils du PU (§4), qui justement fonctionnent sans négatifs.

**Parmi les détecteurs one-class, le kNN est le choix défendable.**

- [GOLD16] (19 algorithmes, 10 jeux de données) : « nearest-neighbor based algorithms perform better in most cases
  when compared to clustering algorithms ». Les auteurs recommandent le k-NN global. Pour les one-class SVM, le
  verdict est « not outstanding », avec des résultats « average ».
- [SKL] : le One-Class SVM « requires fine-tuning of its hyperparameter nu », et « outlier detection in
  high-dimension […] is very challenging ».
- [BERG20] : un simple kNN sur des embeddings **pré-entraînés** bat les méthodes profondes auto-supervisées plus
  complexes. Le cadre est l'image, pas la musique.
- Isolation Forest : aucune source trouvée sur son comportement avec des embeddings denses de 1 280 dimensions
  (**non trouvé**). Ses coupes aléatoires sur une seule coordonnée conviennent mal à un espace où l'information est
  portée par des directions, pas par des axes **(raisonnement)**.

## 2. Discogs-EffNet : pour quoi il a été entraîné, et vaut-il pour la similarité ?

**Ce qu'est `discogs-effnet-bs64-1`.** C'est le modèle **classifieur de styles**. Il est entraîné en multi-label sur
les 400 styles Discogs les plus fréquents (3,3 M de pistes). La couche d'embedding est la sortie aplatie du dernier
bloc convolutif, en 1 280 unités, d'un EfficientNet-B0. L'entrée est constituée de patches de mel-spectrogramme de
96 bandes [P22 §4.1-4.2]. La page Essentia et le JSON le confirment : « trained with a multi-label classification
objective targeting 400 Discogs styles », sortie `PartitionedCall:1` = embeddings de forme [64, 1280] [MODELS].

**Les variantes contrastives sont celles qu'Essentia présente comme « similarité ».** [MODELS] : « The contrastive
learning models were trained to capture music similarity by attracting audio tracks coming from the same artist,
label (record label), release (album), or segments of the same track itself ». Ce sont `discogs_artist_embeddings`,
`_label_`, `_release_`, `_track_` et `_multi_`. Elles ont la même sortie `PartitionedCall:1` en 1 280 dimensions
[MODELS].

**Ce que [P22] mesure, et ce qu'il ne mesure pas.**

- Il évalue les embeddings **uniquement en classification** (MTG-Jamendo, MTAT, FMA), par transfert gelé plus un MLP.
- Le modèle Style tags y est très compétitif : ROC-AUC 87,7 sur Genre, à égalité avec Artist [P22 tab. 3]. Avec
  Artist, ce sont les deux représentations présentes dans les 5 meilleures combinaisons [P22 §4.7].
- **Aucune évaluation de similarité** n'y figure.

**Correction du cadrage de la question sur [P23].** L'article ICASSP 2023 **ne porte pas sur Discogs-EffNet**. Il
pré-entraîne des ResNet50 et VGGish sur les co-occurrences du Million Playlist Dataset (1,78 M de pistes) [P23 §4.1,
§4.4]. Son intérêt pour nous tient à sa méthode et à sa conclusion de principe :

- la similarité est évaluée sur **dim-sim** (879 triplets jugés par des humains), avec des embeddings **gelés** et la
  **distance cosinus** [P23 §4.3] ;
- les modèles supervisés par métadonnées (artiste, playlist) s'alignent mieux sur le jugement humain que
  l'auto-supervisé SimCLR : précision triplets 0,819 à 0,852 contre 0,672 à 0,699 [P23 tab. 3] ;
- les auteurs observent qu'un espace plus discriminant peut être « weaker for similarity » [P23 §5] ;
- un classifieur de styles n'y est **pas** évalué en similarité.

**Aucune évaluation publiée de `discogs-effnet-bs64-1` (classifieur de styles) en similarité musicale n'a été
trouvée (non trouvé).** Indice indirect : quand le MTG lui-même mesure une similarité audio avec EffNet, il prend la
variante contrastive `discogs_track_embeddings-effnet-bs64-1` et la distance cosinus [BATLLE24 §3]. Ce travail porte
sur la détection de réplication, pas sur le goût.

**Couche, distance, agrégation.**

- **Couche.** `PartitionedCall:1` (1 280 dimensions) est la sortie documentée « embeddings » [MODELS]. Aucune autre
  couche n'est recommandée pour la similarité (**non trouvé**).
- **Distance.** Le cosinus est la convention de l'évaluation MTG [P23 §4.3] [BATLLE24]. Sur des vecteurs
  L2-normalisés, cosinus et euclidienne donnent le même classement, puisque ‖a−b‖² = 2 − 2 cos(a,b) **(raisonnement)**.
- **Agrégation.** La moyenne des patches est la pratique MTG : « averaged over the activations from the
  half-overlapped patches » [P22 §4.4], « we average the activations from non-overlapping patches » [P23 §4.2]. Par
  défaut Essentia prend `patchSize` = 128 trames et `patchHopSize` = 62, soit un recouvrement d'environ ½ [ALGO]. La
  moyenne sur l'extrait Deezer de 30 s est donc conforme.

**Conséquence.** L'espace actuel est un espace de *styles Discogs*. Un kNN y mesure « même famille de styles et même
son », ce qui est plausible pour « ça ressemble à ». Mais c'est **non prouvé** pour la similarité perçue. La variante
`discogs_artist_embeddings` (ou `multi`) est celle que la doc destine à la similarité. C'est l'alternative à tester si
le protocole du §4 échoue (voir le Verdict).

## 3. Pièges du kNN en grande dimension

**Hubness.**

- Quand la dimension (intrinsèque) augmente, la distribution des k-occurrences N_k devient très asymétrique. Des
  « hubs » deviennent voisins d'un grand nombre de points, et des anti-hubs ne le sont de personne [RADO10].
- En musique, Aucouturier & Pachet décrivent des faux positifs qui reviennent quelle que soit la requête [AUCOU08,
  **non vérifié à la source**].
- Mesure de référence : la hubness S_k, asymétrie (skewness) de N_k [SCHN12 §4.1.3].
- Conséquence pour nous **(raisonnement)** : un titre de bibliothèque qui est un hub attire beaucoup de candidats. Il
  gonfle leur score et donc l'acceptation.

**Corrections, par ordre de preuve.**

- **Mutual Proximity (MP)**, mise à l'échelle globale. La distance d(x,y) devient la probabilité que y soit proche de
  x *et* x proche de y, estimée d'après la distribution des distances de chaque point [SCHN12 déf. 2]. La version
  gaussienne à indépendance, MP_I = P(X > d_xy) · P(Y > d_yx), « does not affect the results in an adverse way »
  [SCHN12 éq. 3, §3.2.2]. Elle coûte une moyenne et un écart-type par titre.
- **Mise à l'échelle locale** (NICDM : d_xy / √(μ_x μ_y), μ étant la distance moyenne aux k voisins) [SCHN12 §3.1].
  C'est la même famille que CSLS : 2cos − r_T(x) − r_S(y) avec K = 10, performances « essentially the same for K =
  5, 10 and 50 » [CONNEAU18 §2.3, §3].
- **Quand ça sert.** Sur 30 jeux de données, le gain est notable au-dessus de **S_{k=5} ≈ 1,4**, et il n'y a pas de
  changement significatif en dessous [SCHN12 §4]. Sur le recommandeur musical FM4 Soundpark, MP fait passer S_5 de
  5,65 à 2,32 et la part de titres atteignables de 72,6 % à 86,2 % [SCHN12 §5.3].
- **Comparaison exhaustive** [FELD19] : « Scaling and density gradient flattening methods improve […] hubness and
  classification accuracy consistently », alors que « centering approaches achieve the same only under specific
  settings ». Le centrage (soustraire le centroïde avant le produit scalaire ou le cosinus) est proposé par
  [SUZUKI13].
- **Outillage.** `scikit-hubness` n'a plus été publié sur PyPI depuis 0.21.2 (janvier 2020) (vérifié sur PyPI). MP_I
  gaussienne tient en quelques lignes de numpy.

**Adaptation au cas « candidat → bibliothèque » (raisonnement).** Ici on ne cherche pas des voisins symétriques. On
compare un point à un ensemble. Le terme « côté candidat » de CSLS ou de NICDM (r_T(x), μ_x) annulerait justement ce
qu'on veut mesurer, c'est-à-dire la proximité absolue du candidat à la bibliothèque. Seule la correction **côté
bibliothèque** a du sens : pénaliser les titres de bibliothèque « hubs ».

**Effet artiste et effet album.**

- Sans filtre artiste, les évaluations de similarité et de genre sont trop optimistes. Chez [PAMP05], cité par
  [FLEX10], une collection passe de 71 % à 27 %.
- Le filtre artiste « selectively favours particular classification approaches » : il change aussi le classement des
  méthodes [FLEX07].
- Sur plus de 250 000 titres, l'effet album est relativement plus fort que l'effet artiste. Avec des descripteurs
  spectraux, environ 1/3 des premières recommandations viennent du même album et 1/3 d'autres albums du même artiste
  [FLEX10, conclusion].
- Conséquence : toute évaluation doit sortir l'artiste **entier** (ce qui exclut aussi ses albums) du jeu de
  référence.

**Biais de popularité.** Aucune source trouvée qui le quantifie pour un kNN audio sur une bibliothèque personnelle
(**non trouvé**). Ici il se manifeste surtout par les hubs et par le poids des artistes très représentés.

## 4. Évaluer et fixer le seuil sans négatifs

**Leave-one-artist-out (LOAO).** Pour chaque titre t de la bibliothèque, calculer son score contre la bibliothèque
privée de **tout** l'artiste de t. C'est le filtre artiste appliqué à notre cas [FLEX07] [FLEX10]. Cela simule la
situation réelle de découverte : un artiste nouveau mais dans le goût. Avec 2 850 titres et 658 artistes, cela fait
658 exclusions de la matrice de similarité, ce qui ne coûte rien.

**Métriques calculables sans négatifs.**

- **Rappel à seuil fixé.** Sous SCAR, le rappel « can be estimated from PU data: r = Pr(ŷ=1|s=1) » [BEKKER20 §4.1],
  c'est-à-dire le taux d'acceptation des titres de bibliothèque tenus à l'écart par LOAO.
- **Critère de Lee & Liu** : r² / Pr(ŷ=1), avec Pr(ŷ=1) le taux d'acceptation sur le pool de candidats. Il est
  « proportional to the product of precision and recall » [LEE03, résumé] [BEKKER20 éq. 10]. Il sert à choisir k, la
  variante et le seuil.
- **AUC_pu** : AUC « titres de bibliothèque tenus à l'écart (LOAO) contre pool de candidats ». [JAIN17] établit, pour
  des positifs sans bruit, AUC = (AUC_pu − α/2)/(1 − α), où α est la part de positifs dans le non-étiqueté. À pool
  fixé, AUC_pu est donc une fonction **croissante** de la vraie AUC **(déduction de la formule)**. Comparer les
  configurations sur AUC_pu et sur le **même** pool donne le même classement que la vraie AUC, sans connaître α.
- **Limite commune.** Toutes ces métriques reposent sur SCAR (§1). Elles classent les variantes de façon fiable. Elles
  ne donnent pas une précision absolue. Seule une écoute par le propriétaire en donne une (voir le Verdict).

**Seuil sans négatifs : un quantile des scores LOAO.** La justification formelle vient des p-values conformes
[BATES23]. On compare le score d'un nouvel exemple aux scores d'un jeu de calibration issu de la distribution de
référence. Rejeter quand p ≤ α contrôle le taux de faux rejets à α. Cette garantie est marginale et suppose
l'échangeabilité [BATES23, résumé]. En pratique, le seuil vaut le α-quantile des scores LOAO. C'est aussi la
convention one-class de fixer la fraction de cibles rejetées (voir `fracrej` dans dd_tools de Tax, **non vérifié à la
source**). Les titres d'un même artiste ne sont pas échangeables. Calibrer en LOAO, et pondérer chaque titre par
1/(nombre de titres de son artiste), rapproche la calibration du cas « nouvel artiste » **(raisonnement, à valider au
§Verdict)**.

## 5. kNN par titre, centroïde, one-class SVM : preuves spécifiques au goût musical

- **[BOGD13] (MTG).** C'est la seule étude trouvée qui compare, sur des préférences musicales données **uniquement en
  positifs**, trois façons de modéliser l'ensemble :
  - SEM-MEAN, distance au centroïde ;
  - SEM-ALL, distance minimale à un titre quelconque de l'ensemble, donc un 1-NN ;
  - SEM-GMM, densité par mélange de gaussiennes.

  Résultats sur 12 sujets en écoute, avec filtre artiste [BOGD13 §5.2, tab. 3] :

  | Méthode | Échecs | Hits |
  |---|---|---|
  | SEM-ALL | 42,5 % | 34,6 % |
  | SEM-MEAN | 49,2 % | 31,3 % |
  | SEM-GMM | 48,8 % | 30,0 % |

  Le test de Tukey range pourtant les trois SEM-* **dans le même groupe** [BOGD13 §5.2.4]. La tendance favorise le kNN
  par titre, mais **l'écart n'est pas significatif**. Les descripteurs étaient sémantiques (sorties de classifieurs),
  pas des embeddings profonds.
- **Recommandation à grande échelle (collaboratif, pas audio).** Un vecteur unique décrit mal un utilisateur aux goûts
  multiples :
  - [WESTON13] : « a user is a much more complicated entity than any single item ». Le score maximal sur plusieurs
    vecteurs d'intérêt bat le vecteur unique, sur YouTube et Google Music ;
  - [PAL20] : plusieurs embeddings par utilisateur « significantly outperforms single embedding methods », hors ligne
    et en A/B.

  C'est l'argument structurel contre le centroïde pour une bibliothèque de 658 artistes.
- **One-class SVM et Isolation Forest sur le goût musical.** Aucune comparaison directe trouvée (**non trouvé**). Les
  seules preuves sont génériques (§1 : [GOLD16], [SKL], [BERG20]).

## Verdict pour AubeSonore

**Méthode recommandée : un score kNN « candidat → bibliothèque » dans l'espace EffNet actuel, avec un seuil au
quantile LOAO, et la régression logistique gardée seulement comme veto.**

1. **Espace.** L'embedding `discogs-effnet-bs64-1` / `PartitionedCall:1` actuel, moyenné sur les patches (conforme,
   §2). On soustrait la moyenne de la bibliothèque (centrage [SUZUKI13]), puis on normalise en L2. Le centrage n'est
   gardé que s'il augmente AUC_pu ([FELD19] : utile « only under specific settings »).
2. **Score.** s(x) = moyenne des **k = 5** plus grandes similarités cosinus entre x et les titres de la bibliothèque.
   Grille à tester : k ∈ {1, 3, 5, 10, 20}. k = 1 correspond au SEM-ALL de [BOGD13] ; au-delà de 10, on pénalise les
   artistes rares de la bibliothèque **(raisonnement)**. Pas de centroïde.
3. **Hubness : mesurer d'abord, corriger ensuite.** Calculer S_{k=5} sur le graphe kNN de la bibliothèque. Si
   S_5 > 1,4 [SCHN12], appliquer MP_I gaussienne côté bibliothèque (moyenne et écart-type des distances de chaque
   titre à la bibliothèque). La correction n'est gardée que si AUC_pu augmente. Sinon, pas de correction.
4. **Seuil.** τ = **quantile α = 0,20** des scores LOAO, pondérés à 1/(nombre de titres de l'artiste). Le rappel visé
   est d'environ 80 % sur un « nouvel artiste dans le goût ». α est ensuite choisi dans {0,1 ; 0,2 ; 0,3} en
   maximisant r²/Pr(accept) [LEE03].
5. **Veto.** La régression logistique ne sert qu'à rejeter, jamais à accepter. Le nombre de candidats acceptés par le
   kNN puis tués par le veto est journalisé. Si ce nombre est élevé, c'est le veto qui fait le tri, et il faut le
   savoir.
6. **Protocole de validation.**
   - GroupKFold à 5 plis par artiste : τ est calibré sur 4 plis, le rappel est mesuré sur le 5ᵉ.
   - AUC_pu est calculée contre le pool de candidats réel, **le même pool pour toutes les variantes** : kNN k = 1…20,
     cosine-au-centroïde, score actuel de la régression logistique.
   - Écoute à l'aveugle par le propriétaire : 20 candidats juste au-dessus de τ et 20 juste en dessous, mélangés.

**Ce qui réfuterait ce choix.**

- L'AUC_pu du kNN n'est pas supérieure à celle du cosinus au centroïde, ni à celle du score actuel de la régression
  logistique, sur le même pool. Le kNN n'apporte alors rien, contrairement à [BOGD13], [WESTON13] et [PAL20].
- L'AUC_pu est proche de 0,5 pour toutes les variantes. L'espace « styles Discogs » ne distingue alors pas la
  bibliothèque du pool. Dans ce cas, refaire le même protocole avec `discogs_artist_embeddings-effnet-bs64-1` ou
  `multi`, que la doc destine à la similarité [MODELS]. Cela demande une 2ᵉ passe d'inférence.
- Le rappel mesuré sur le pli tenu à l'écart s'écarte de plus de 10 points de 1 − α. La calibration LOAO ne
  généralise alors pas, et la pondération par artiste ou l'hypothèse d'échangeabilité est en cause.
- À l'écoute à l'aveugle, la part de titres aimés au-dessus de τ n'est pas nettement supérieure à celle en dessous. Le
  score ne capte alors pas le goût, quel que soit le chiffre d'AUC_pu.
- Signal d'alerte (pas une réfutation) : l'acceptation reste ≥ 70 % avec α = 0,2. Le pool est alors déjà très proche
  de la bibliothèque en amont. Le problème se situe dans les sources de découverte, pas dans le score.
