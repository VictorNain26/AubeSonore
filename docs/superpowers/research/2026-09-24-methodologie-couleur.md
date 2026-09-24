# Filtre « couleur » : méthodologie avec positifs seuls et négatifs par catégories absentes

Recherche documentaire du 2026-09-24. Elle prépare la conception du filtre qui accepte ou rejette une découverte
(Soulseek ou YouTube) avant diffusion.

Règle suivie : chaque affirmation renvoie à une source de la table §0 : papier (auteurs, année, section), page
officielle ou page de dataset. Deux marqueurs complètent ces renvois :

- **[MES]** : comptage que j'ai fait moi-même sur un fichier publié par le dataset (fichier indiqué) ;
- **[INF]** : déduction de ma part, non écrite dans les sources.

**Non vérifié** signale ce que je n'ai pas pu confirmer. Aucune ligne de ce document n'est un conseil juridique.

Rappel du contexte, repris de la consigne :

- 2 800 extraits positifs environ, tirés de 700 artistes, embeddings Discogs-EffNet de 1 280 dimensions ;
- 3 catégories à refuser, absentes de la bibliothèque : « soupe commerciale », hard/métal, hard techno ;
- 2 échecs : AUC 0,59 en prenant les artistes non cochés comme négatifs, et AUC 0,855 avec 34 artistes exclus
  de la bibliothèque, cadre rejeté.

---

## 0. Sources (consultées le 2026-09-24)

### Méthodes (PU, one-class, anomalies)

| Réf. | Source |
|---|---|
| [EN08] | C. Elkan, K. Noto, *Learning Classifiers from Only Positive and Unlabeled Data*, KDD 2008. https://cseweb.ucsd.edu/~elkan/posonly.pdf |
| [BD20] | J. Bekker, J. Davis, *Learning from Positive and Unlabeled Data: A Survey*, Machine Learning 109, 2020, doi:10.1007/s10994-020-05877-5. Version lue : https://arxiv.org/pdf/1811.04820 |
| [KI17] | R. Kiryo, G. Niu, M. C. du Plessis, M. Sugiyama, *Positive-Unlabeled Learning with Non-Negative Risk Estimator*, NeurIPS 2017. https://arxiv.org/abs/1703.00593 |
| [HS19] | Y.-G. Hsieh, G. Niu, M. Sugiyama, *Classification from Positive, Unlabeled and Biased Negative Data*, ICML 2019 (PMLR 97). https://proceedings.mlr.press/v97/hsieh19c.html |
| [JA17] | S. Jain, M. White, P. Radivojac, *Recovering True Classifier Performance in Positive-Unlabeled Learning*, AAAI 2017. https://arxiv.org/abs/1702.00518 |
| [SHS05] | I. Steinwart, D. Hush, C. Scovel, *A Classification Framework for Anomaly Detection*, JMLR 6, 2005, p. 211-232. https://www.jmlr.org/papers/v6/steinwart05a.html |
| [TD01] | D. Tax, R. Duin, *Uniform Object Generation for Optimizing One-class Classifiers*, JMLR 2, 2001, p. 155-173. Contenu **non relu**, cité d'après la notice. |
| [KM14] | S. Khan, M. Madden, *One-Class Classification: Taxonomy of Study and Review of Techniques*, Knowledge Engineering Review, 2014. https://arxiv.org/abs/1312.0049 (**non relu en détail**) |
| [OE19] | D. Hendrycks, M. Mazeika, T. Dietterich, *Deep Anomaly Detection with Outlier Exposure*, ICLR 2019. https://arxiv.org/abs/1812.04606 |
| [SAD20] | L. Ruff et al., *Deep Semi-Supervised Anomaly Detection*, ICLR 2020. https://arxiv.org/abs/1906.02694 |
| [ESL] | T. Hastie, R. Tibshirani, J. Friedman, *The Elements of Statistical Learning*, 2e éd., §14.2.4 « Unsupervised as Supervised Learning ». **Non relu aujourd'hui** : le PDF officiel renvoie une erreur 404. Cité de mémoire. |

### Documentation logicielle

| Réf. | Source |
|---|---|
| [SK-OD] | scikit-learn 1.9.1, *Novelty and Outlier Detection*. https://scikit-learn.org/stable/modules/outlier_detection.html |
| [SK-EE] | scikit-learn, `EllipticEnvelope`. https://scikit-learn.org/stable/modules/generated/sklearn.covariance.EllipticEnvelope.html |
| [SK-OCSVM] | scikit-learn, `OneClassSVM`. https://scikit-learn.org/stable/modules/generated/sklearn.svm.OneClassSVM.html |
| [SK-TH] | scikit-learn 1.9.1, *Tuning the decision threshold* et `TunedThresholdClassifierCV` (ajouté en 1.5). https://scikit-learn.org/stable/modules/classification_threshold.html |
| [SK-SGKF] | scikit-learn, `StratifiedGroupKFold`. https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.StratifiedGroupKFold.html |
| [PUL] | `pulearn` : https://github.com/pulearn/pulearn ; PyPI 0.2.0 du 2026-03-14, dépend de `scikit-learn>=1.4.2,<2` (https://pypi.org/pypi/pulearn/json) |

### Biais de dataset et validité en MIR

| Réf. | Source |
|---|---|
| [ST14] | B. L. Sturm, *A Simple Method to Determine if a Music Information Retrieval System is a "Horse"*, IEEE Trans. Multimedia 16(6), 2014, p. 1636-1644. Résumé : https://vbn.aau.dk/en/publications/a-simple-method-to-determine-if-a-music-information-retrieval-sys/ |
| [RSD19] | F. Rodríguez-Algarra, B. L. Sturm, S. Dixon, *Characterising Confounding Effects in Music Classification Experiments through Interventions*, TISMIR 2(1), 2019, p. 52-66. https://transactions.ismir.net/articles/10.5334/tismir.24 |
| [FL07] | A. Flexer, *A Closer Look on Artist Filters for Musical Genre Classification*, ISMIR 2007. https://archives.ismir.net/ismir2007/paper/000341.pdf (d'après le résumé) |
| [TE11] | A. Torralba, A. Efros, *Unbiased Look at Dataset Bias*, CVPR 2011, p. 1521-1528. https://people.csail.mit.edu/torralba/publications/datasets_cvpr11.pdf (**non relu**, cité pour l'expérience « Name That Dataset ») |
| [UR14] | J. Urbano, D. Bogdanov, P. Herrera, E. Gómez, X. Serra, *What is the Effect of Audio Quality on the Robustness of MFCCs and Chroma Features?*, ISMIR 2014, p. 573-578. https://archives.ismir.net/ismir2014/paper/000326.pdf (**titre et objet seulement**) |
| [MIRREF] | C. Plachouras, P. Alonso-Jiménez, D. Bogdanov, *mir_ref: A Representation Evaluation Framework for MIR Tasks*, ML4Audio @ NeurIPS 2023, §3. https://arxiv.org/abs/2312.05994 |

### Datasets

| Réf. | Source |
|---|---|
| [JAM] | MTG-Jamendo : https://github.com/MTG/mtg-jamendo-dataset (README, et `stats/raw_30s_cleantags_50artists/genre.tsv`) |
| [FMA] | M. Defferrard, K. Benzi, P. Vandergheynst, X. Bresson, *FMA: A Dataset for Music Analysis*, ISMIR 2017 (https://archives.ismir.net/ismir2017/paper/000075.pdf) ; README https://github.com/mdeff/fma ; `fma_metadata/genres.csv` extrait de https://os.unil.cloud.switch.ch/fma/fma_metadata.zip |
| [AB] | AcousticBrainz : https://acousticbrainz.org/download ; annonce de fermeture https://blog.metabrainz.org/2022/02/16/acousticbrainz-making-a-hard-decision-to-end-the-project/ |
| [ABG] | D. Bogdanov, A. Porter, H. Schreiber, J. Urbano, S. Oramas, *The AcousticBrainz Genre Dataset*, ISMIR 2019, §2. https://archives.ismir.net/ismir2019/paper/000042.pdf ; https://mtg.github.io/acousticbrainz-genre-dataset/ |
| [AS] | AudioSet : https://research.google.com/audioset/download.html ; ontologie https://github.com/audioset/ontology ; CSV `balanced_train_segments`, `eval_segments`, `unbalanced_train_segments`, `qa_true_counts` sous http://storage.googleapis.com/us_audioset/youtube_corpus/v1/ |
| [MC] | MusicCaps : https://huggingface.co/datasets/google/MusicCaps |
| [MSD] | T. Bertin-Mahieux, D. Ellis, B. Whitman, P. Lamere, *The Million Song Dataset*, ISMIR 2011. https://www.ee.columbia.edu/~dpwe/pubs/BertEWL11-msd.pdf. Le site millionsongdataset.com refusait la connexion le 2026-09-24. |
| [M4O] | Music4All-Onion : https://zenodo.org/records/6609677 |
| [DVI] | Discogs-VI : https://mtg.github.io/discogs-vi-dataset/ ; https://zenodo.org/records/13983028 |
| [DDUMP] | Dumps Discogs : https://data.discogs.com/ |
| [P22] | P. Alonso-Jiménez, X. Serra, D. Bogdanov, *Music Representation Learning Based on Editorial Metadata from Discogs*, ISMIR 2022, §4.2-4.4 et tableau 3. https://archives.ismir.net/ismir2022/paper/000099.pdf |
| [G400] | `models/genre_discogs400-discogs-effnet-1.json` (local, identique à l'officiel d'après la recherche du 2026-09-23) |
| [EFF] | `docs/superpowers/research/2026-09-23-essentia-effnet.md` (recherche précédente : 16 kHz, têtes, licence) |

### Services et pratique industrielle

| Réf. | Source |
|---|---|
| [BO13] | D. Bogdanov, M. Haro, F. Fuhrmann, A. Xambó, E. Gómez, P. Herrera, *Semantic audio content-based music recommendation and visualization based on user preference examples*, Information Processing & Management 49(1), 2013, p. 13-33, §5. Préprint : https://annaxambo.me/pub/Bogdanov_et_al_2013_Semantic_audio_content_based_music_recommendation_PREPRINT.pdf |
| [MA06] | M. Mandel, G. Poliner, D. Ellis, *Support Vector Machine Active Learning for Music Retrieval*, Multimedia Systems 12, 2006, p. 3-13. https://www.ee.columbia.edu/~dpwe/pubs/MandPE06-svm.pdf (d'après le résumé) |
| [MEI24] | M. J. Mei, O. Bembom, A. F. Ehmann (SiriusXM Radio Inc.), *Negative Feedback for Music Personalization*, UMAP 2024. https://arxiv.org/abs/2406.04488 |
| [FM22] | T. Bontempelli et al. (Deezer), *Flow Moods: Recommending Music by Moods on Deezer*, RecSys 2022, §2.2. https://arxiv.org/abs/2207.11229 |
| [BR21] | L. Briand et al. (Deezer), *A Semi-Personalized System for User Cold Start Recommendation on Music Streaming Apps*, KDD 2021. https://arxiv.org/abs/2106.03819 (d'après le résumé) |
| [SPX] | Spotify Engineering, *Exclude from Your Taste Profile*, octobre 2023. https://engineering.atspotify.com/2023/10/exclude-from-your-taste-profile |
| [PAT] | W. Glaser, T. Westergren, J. Stearns, J. Kraft (Pandora), brevet US 7 003 515 B1, *Consumer item matching method and system*, délivré le 2006-02-21. https://patents.google.com/patent/US7003515B1/en |
| [MGP] | Pandora, *Music Genome Project*. https://www.pandora.com/about/mgp |
| [VDO13] | A. van den Oord, S. Dieleman, B. Schrauwen, *Deep content-based music recommendation*, NIPS 2013. https://proceedings.neurips.cc/paper/2013/hash/b3ba8f1bee1238a2f37603d90b58898d-Abstract.html |
| [PAN08] | R. Pan et al., *One-Class Collaborative Filtering*, ICDM 2008, p. 502-511 (d'après la notice) |
| [HKV08] | Y. Hu, Y. Koren, C. Volinsky, *Collaborative Filtering for Implicit Feedback Datasets*, ICDM 2008 (cité de mémoire) |

### Évaluation, seuil, droit

| Réf. | Source |
|---|---|
| [EL01] | C. Elkan, *The Foundations of Cost-Sensitive Learning*, IJCAI 2001, p. 973-978 (d'après la notice) |
| [SR15] | T. Saito, M. Rehmsmeier, *The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets*, PLoS ONE 10(3), 2015 (cité de mémoire) |
| [SA02] | M. Saerens, P. Latinne, C. Decaestecker, *Adjusting the Outputs of a Classifier to New a Priori Probabilities*, Neural Computation 14(1), 2002 (cité de mémoire) |
| [BE13] | C. Beleites et al., *Sample Size Planning for Classification Models*, Analytica Chimica Acta 760, 2013, p. 25-33. https://arxiv.org/abs/1211.1323 (d'après le résumé) |
| [HL83] | J. Hanley, A. Lippman-Hand, *If Nothing Goes Wrong, Is Everything All Right?*, JAMA 249(13), 1983 : « règle de trois » (cité de mémoire) |
| [CT10] | G. Cawley, N. Talbot, *On Over-fitting in Model Selection and Subsequent Selection Bias in Performance Evaluation*, JMLR 11, 2010 (cité de mémoire) |
| [CH70] | C. K. Chow, *On Optimum Recognition Error and Reject Tradeoff*, IEEE Trans. Information Theory 16(1), 1970 (cité de mémoire) |
| [ACI] | CJUE, 10 avril 2014, *ACI Adam*, C-435/12. https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62012CJ0435 (d'après les résumés) |
| [YT] | Conditions d'utilisation YouTube (FR), section « Autorisations et restrictions ». https://www.youtube.com/static?template=terms&gl=FR&hl=fr |
| [SNEP] | SNEP, pages des Tops. https://www.snepmusique.com/les-tops/le-top-de-la-semaine/top-albums/ |
| [RYM] | Conditions d'utilisation de Rate Your Music. https://rateyourmusic.com/tos : **403 à la lecture**, contenu connu par un résumé de moteur de recherche. |

---

## 1. Méthodologie : positifs seuls, négatifs définis par des catégories absentes

### 1.1 Quel problème, au sens de la littérature ?

Le cas d'AubeSonore ne rentre proprement dans aucune case. Il faut le dire avant de choisir une méthode.

- **PU learning** (positive-unlabeled). Des positifs étiquetés et un ensemble **non étiqueté** qui mélange
  positifs et négatifs [BD20 §1]. Presque toutes les méthodes reposent sur l'hypothèse **SCAR** : les positifs
  étiquetés sont un sous-ensemble uniforme de tous les positifs, `Pr(s=1|x,y=1) = Pr(s=1|y=1) = c` [BD20 §3.1.1 ;
  EN08 §2, équation 2]. La bibliothèque de Victor n'est pas un tirage uniforme de « tout ce qui lui plairait » :
  c'est une collection construite dans le temps. SCAR est donc **douteuse** ici [INF].
- **One-class / détection de nouveauté.** On ne dispose que de la classe cible. Le classifieur revient à séparer
  cette classe de « toutes les autres classes possibles » [BD20 §8.2 ; SK-OD]. Un modèle one-class rejette ce
  qui est **nouveau**, pas ce qui est **indésirable**. Un morceau de jazz ou de folk, absent de la bibliothèque sans
  être refusé, serait rejeté comme un morceau de métal [INF, conséquence directe de la définition].
- **Négatifs biaisés** : c'est le cadre le plus proche. Hsieh, Niu et Sugiyama [HS19] traitent le cas où
  « negative (N) data are too diverse to be fully labeled », mais où l'on peut facilement réunir « a
  non-representative N set that contains only a small portion of all possible N data ». Leur cadre **PUbN** combine
  positifs, non-étiquetés et négatifs biaisés. Le « bN » correspond exactement à « soupe, métal, hard techno » ;
  le « U » serait un échantillon du flux réel de découvertes [INF].

### 1.2 Pourquoi l'essai à AUC 0,59 a échoué (lecture PU)

Prendre les non-étiquetés comme négatifs, c'est ce que [BD20 §5.2] appelle *biased learning* : on traite U comme N
en sachant qu'il contient des positifs. Dans l'essai de Victor, les « négatifs » étaient des artistes **de sa
bibliothèque**, donc des positifs pour lui. Le problème n'était pas seulement bruité, il était vide :
aucun signal ne sépare deux tirages de la même distribution. Une AUC proche de 0,5 est donc le résultat attendu
[INF]. Le lemme d'Elkan et Noto rend le même diagnostic : le classifieur « labellisé contre non-labellisé » `g(x)`
vérifie `g ≤ c` partout, parce que les deux ensembles d'apprentissage « are samples from overlapping regions in x
space » [EN08 §2].

### 1.3 Les quatre familles de méthodes et ce qu'en dit la littérature

**(a) PU au sens strict : Elkan-Noto, uPU, nnPU, bagging PU**

- Elkan et Noto : sous SCAR, `p(y=1|x) = p(s=1|x) / c` (lemme 1). `c` s'estime par la moyenne de `g(x)` sur les
  positifs de validation (estimateur e1) [EN08 §2].
- Conséquence importante : `f` est une fonction croissante de `g`. **Pour classer, `g` suffit** : la correction ne
  change ni l'ordre ni l'AUC, elle change le seuil et la calibration [EN08 §2, « Several consequences… »].
- Deux scénarios, selon [EN08 §2] et [BD20 §2.4] :
  - *single-training-set* : P et U viennent d'un même tirage ;
  - *case-control* : P et U viennent de deux sources indépendantes, U étant un tirage i.i.d. de la population.

  Avec des positifs d'un côté (la bibliothèque) et un « univers » de l'autre, on est en case-control. Dans ce
  cas, « p(y = 1) cannot be identified » [EN08 §3, citant leur réf. 21] : on ne peut pas estimer, à partir des
  seules données, la proportion de découvertes acceptables dans l'univers.
- uPU et nnPU : l'estimateur de risque non biaisé devient négatif avec des modèles flexibles et sur-apprend. nnPU
  corrige ce défaut, en supposant la **proportion de positifs (class prior) connue** [KI17, résumé].
- Guide de choix de [BD20 §5.6] :
  - si la séparabilité tient, préférer les méthodes en deux étapes ;
  - si SCAR tient, les méthodes biaisées ou celles qui intègrent le prior ;
  - « Rebalancing and class prior incorporation methods are sensitive to the SCAR assumption. Ensemble methods
    provide more robustness ».
- **Limite pour AubeSonore** : la cible n'est pas « tout ce que Victor aimerait », c'est « rien des trois
  catégories ». Le PU pur apprend la première frontière, pas la seconde [INF].

**(b) One-class : OneClassSVM, IsolationForest, LOF, densité**

scikit-learn distingue *outlier detection* (données d'entraînement polluées) et *novelty detection* (données
propres, on juge des observations nouvelles). Le cas présent relève de la seconde [SK-OD]. Estimateurs disponibles
[SK-OD] : `OneClassSVM`, `SGDOneClassSVM`, `IsolationForest`, `LocalOutlierFactor(novelty=True)`,
`EllipticEnvelope`, plus `KernelDensity` et `GaussianMixture` pour l'estimation de densité. Limites documentées :

- `OneClassSVM` « is known to be sensitive to outliers ». `nu` est « an upper bound on the fraction of training
  errors and a lower bound of the fraction of support vectors ». Pas de `predict_proba`, seulement
  `decision_function` et `score_samples` [SK-OD ; SK-OCSVM].
- `LocalOutlierFactor(novelty=True)` : n'appeler `predict`, `decision_function` et `score_samples` que sur des
  données nouvelles, jamais sur l'entraînement [SK-OD].
- `EllipticEnvelope` : suppose des données gaussiennes, et « may break or not perform well in high-dimensional
  settings. In particular, one will always take care to work with `n_samples > n_features ** 2` » [SK-EE].
  Avec 1 280 dimensions, il faudrait plus de 1,6 million d'échantillons. Il faut donc réduire la dimension
  (ACP) d'abord [INF, calcul direct].
- **Choix des hyperparamètres sans négatifs.** C'est le point faible connu de la famille. Tax et Duin proposent
  de générer des objets aberrants uniformes pour optimiser un classifieur one-class [TD01, d'après le titre et la
  notice]. Steinwart et al. formalisent la détection d'anomalies comme une **classification contre une
  distribution de référence** et justifient ainsi la génération d'échantillons de fond étiquetés [SHS05, résumé].
- **Distribution multimodale.** Les positifs couvrent au moins 9 styles distincts (indie, post-punk… hip-hop
  alternatif). Un modèle à centre unique décrit mal une telle cible [INF]. [BO13 §5] compare trois modèles du goût
  construits sur les seuls exemples positifs d'un utilisateur : distance à la moyenne (SEM-MEAN), distance à
  l'ensemble, c'est-à-dire au plus proche voisin (SEM-ALL), et mélange gaussien (SEM-GMM). Sur 12 sujets, les taux
  de « hits » sont 31,3 %, 34,6 % et 30,0 %, et les « fails » 49,2 %, 42,5 % et 48,8 % (tableau du §5.2). Ces
  chiffres portent sur des descripteurs sémantiques de 2013, pas sur des embeddings EffNet. Ils ne sont pas
  transposables tels quels.

**(c) Classification contre un « univers » de fond**

- Les fondements théoriques sont [SHS05] et [ESL §14.2.4, cité de mémoire, non relu] : on apprend « données
  contre échantillon de référence », puis le rapport des probabilités donne la densité relative.
- Cette méthode coïncide avec le PU en scénario case-control si l'univers est un tirage de la population des
  découvertes [BD20 §2.4 ; INF].
- Elle hérite de la même limite : on apprend « ressemble à la bibliothèque plutôt qu'à l'univers », pas « n'est
  pas dans les trois catégories » [INF].
- Elle vaut aussi ce que vaut l'univers choisi. S'il vient d'une autre source que les positifs, le classifieur
  apprend la source (voir §2.6).

**(d) Négatifs ciblés par catégorie (outlier exposure, semi-supervisé)**

- *Outlier Exposure* : on entraîne le détecteur « against an auxiliary dataset of outliers » pour mieux
  généraliser aux anomalies non vues. Les auteurs soulignent que les caractéristiques du jeu auxiliaire pèsent
  fortement sur le résultat [OE19, résumé].
- Deep SAD : un petit nombre d'anomalies étiquetées améliore nettement la détection, « even when provided with
  only little labeled data » [SAD20, résumé].
- PUbN [HS19] est la version formalisée de « quelques négatifs non représentatifs, plus des positifs, plus des
  non-étiquetés ».
- **Limite** : un classifieur supervisé « bibliothèque contre trois catégories » n'a aucune raison de rejeter
  une quatrième catégorie indésirable non prévue. À l'inverse, il peut accepter trop largement tout ce qui ne
  ressemble à aucune des trois [INF].

### 1.4 Ce qui existe de façon robuste

| Besoin | Outil | État |
|---|---|---|
| Classifieur binaire calibré sur embeddings | `LogisticRegression`, `SVC`, `CalibratedClassifierCV` (scikit-learn) | standard |
| One-class / nouveauté | `OneClassSVM`, `SGDOneClassSVM`, `IsolationForest`, `LocalOutlierFactor(novelty=True)`, `EllipticEnvelope`, `GaussianMixture`, `KernelDensity` [SK-OD] | standard, limites ci-dessus |
| Réglage du seuil | `TunedThresholdClassifierCV`, `FixedThresholdClassifier` (≥ 1.5) [SK-TH] | standard |
| Validation groupée par artiste | `GroupKFold`, `StratifiedGroupKFold` [SK-SGKF] | standard |
| PU | `pulearn` [PUL] : Elkan-Noto (pondéré ou non), bagging PU (Mordelet et Vert), nnPU, variantes bayésiennes ; 264 étoiles, version 0.2.0 du 2026-03-14 | tiers, maintenu, **hors scikit-learn** |
| PUbN | code de recherche des auteurs [HS19] | **pas d'implémentation packagée trouvée** |

Il n'existe pas d'estimateur PU ou PUbN dans scikit-learn lui-même. Je n'en ai trouvé aucune mention dans
[SK-OD] ni [SK-TH].

### 1.5 Une voie sans apprentissage : la tête `genre_discogs400`

Le modèle déjà en place produit 400 styles Discogs [EFF §3.3]. Le fichier [G400] contient notamment :

- **métal et hard rock** : `Rock---Heavy Metal`, `Death Metal`, `Black Metal`, `Thrash`, `Metalcore`,
  `Nu Metal`, `Doom Metal`, `Grindcore`, `Hard Rock`, etc. ;
- **électro dure** : `Electronic---Hard Techno`, `Schranz`, `Gabber`, `Hardcore`, `Hardstyle`, `Speedcore`,
  `Happy Hardcore`, `Jumpstyle`, `Hard Trance`, `Hard House` ;
- **pop** : `Pop---Europop`, `Electronic---Dance-pop`, `Electronic---Eurodance`, `Hip Hop---Pop Rap`,
  `Pop---Ballad`, `Pop---Schlager`, `Pop---Bubblegum`.

Limites :

- Le modèle Discogs-EffNet évalué en transfert sur les 87 genres de MTG-Jamendo obtient ROC-AUC 87,7 et
  PR-AUC 19,9, en moyenne sur les étiquettes (ligne « Style tags » du tableau 3 de [P22]). La prédiction de style
  est donc bruitée étiquette par étiquette.
- Les étiquettes Discogs sont posées **au niveau de la sortie** (release), pas du morceau [P22 §4.1 ; ABG tableau 2,
  « Annotation level: Album »].
- **Aucun style Discogs ne s'appelle « commercial ».** Pour la soupe commerciale, cette voie ne donne que des
  indices indirects (`Dance-pop`, `Europop`…), et ces styles recoupent en partie la pop française et la synthpop
  de la bibliothèque [INF].

---

## 2. Sources de négatifs audio

### 2.1 Tableau de synthèse

| Source | Taille | Audio fourni ? | Licence / conditions | Étiquettes utiles | Métal | Hard techno | Commercial |
|---|---|---|---|---|---|---|---|
| **MTG-Jamendo** [JAM] | 55 525 pistes (splits) ; 87 genres, 40 instruments, 56 humeurs | oui, MP3 320 kb/s (508 Go) ou mono VBR (156 Go) ; mél-spectrogrammes (229 Go) ; descripteurs Essentia « AcousticBrainz » en JSON | audio sous licences CC variées (`audio_licenses.txt`) ; métadonnées CC BY-NC-SA 4.0 ; « made available solely for non-commercial research and academic use » | tags genre au niveau piste | `metal` 232 artistes / 1 435 pistes ; `heavymetal` 52 / 222 ; `hardrock` 108 / 490 [MES] | `techno` 346 / 2 179 ; `hard` 60 / 177 ; `trance` 267 / 1 528 ; aucun tag `hardcore` ou `gabber` au seuil de 50 artistes [MES] | `pop` 993 / 7 805, `dance` 464 / 2 827, `eurodance` 88 / 244 [MES], mais c'est de la pop Jamendo, sous licence libre, **pas des tubes** |
| **FMA** [FMA] | 106 574 pistes, 16 341 artistes, 161 genres (16 racines) | oui : small 8 000 × 30 s (7,2 Gio), medium 25 000 × 30 s (22 Gio), large 106 574 × 30 s (93 Gio), full 879 Gio | audio sous la licence de chaque artiste ; métadonnées CC BY 4.0 ; « meant for research purposes » | genres hiérarchiques ; `features.csv` (librosa) ; Echo Nest pour 13 129 pistes | `Metal` 1 498 pistes, `Loud-Rock` 2 469, `Death-Metal` 196, `Black-Metal` 152, `Grindcore` 314, `Thrash` 175, `Hardcore` (sous Punk) 1 419 [MES, `genres.csv`] | `Techno` 2 140, `Breakcore - Hard` 511, `Industrial` 2 230 [MES] | les auteurs l'écrivent : « it does not contain mainstream music and few commercially successful artists » [FMA §4] |
| **AcousticBrainz** [AB] | 29 460 584 soumissions (≈ 7 M enregistrements selon l'annonce) | **non** : descripteurs Essentia MusicExtractor, bas niveau et haut niveau, en JSON/CSV | CC0 [AB, annonce] | via l'AcousticBrainz Genre Dataset [ABG] : Discogs 1 290 489 enregistrements, 15 genres / 300 sous-genres ; AllMusic, Last.fm, Tagtraum | oui (taxonomies Discogs/Last.fm) | oui (Discogs) | oui : musique commerciale soumise par les utilisateurs ; biais vers pop, rock, électro [ABG §2.1] |
| **AudioSet** [AS] | 2 085 544 segments de 10 s, 527 classes | **non** : identifiants YouTube, plus des descripteurs VGGish de 128 dimensions à 1 Hz (PCA, quantifiés) | étiquettes CC BY 4.0, ontologie CC BY-SA 4.0 ; audio sous les conditions YouTube [YT] | classes `Heavy metal`, `Punk rock`, `Grunge`, `Techno`, `Pop music`, `Electronic dance music`, `Dubstep`… | `Heavy metal` : 60 (équilibré) / 69 (éval) / 6 330 (non équilibré) [MES] | `Techno` : 60 / 95 / 17 109 ; pas de classe « hard techno » [MES, ontologie] | `Pop music` : 63 / 89 / 8 661 [MES] |
| **MusicCaps** [MC] | 5 521 clips de 10 s (sous-ensemble ≈ 1 000 équilibré en genres) | non (identifiants YouTube) | CC BY-SA 4.0 | `aspect_list` libre (« pop, … ») et légende rédigée par des musiciens | marginal | marginal | marginal |
| **Million Song Dataset** [MSD] | ≈ 1 M morceaux, ≈ 44 000 artistes | **non** : descripteurs Echo Nest (timbre, chroma, segments) ; extraits 7digital de 30 s, **disponibilité actuelle non vérifiée** | conditions du site **non vérifiées** (site inaccessible) | tags Last.fm et Tagtraum en jeux compagnons (**non vérifiés aujourd'hui**) | oui (tags) | oui (tags) | oui : musique commerciale |
| **Music4All-Onion** [M4O] | 109 269 morceaux | non : BLF, i-vectors, MFCC, Essentia, ResNet, VGG19… | CC BY 4.0 | genres et tags en TF-IDF | oui (tags) | probable (tags), **non vérifié** | oui : catalogue de type Last.fm |

### 2.2 Existe-t-il des embeddings Discogs-EffNet pré-calculés pour ces datasets ?

**Je n'en ai trouvé aucun de publié.**

- MTG-Jamendo fournit mél-spectrogrammes et descripteurs Essentia statistiques, « no embeddings » [JAM].
- FMA fournit librosa et Echo Nest [FMA].
- AcousticBrainz fournit MusicExtractor [AB].
- AudioSet fournit VGGish en 128 dimensions [AS].
- Music4All-Onion fournit BLF, i-vectors, ResNet, VGG19… [M4O].
- Discogs-VI fournit des CQT, « available upon request for non-commercial scientific research purposes » [DVI].

Ces espaces de descripteurs sont **incompatibles** avec des embeddings EffNet de 1 280 dimensions. On ne peut pas
mélanger des positifs EffNet avec des négatifs VGGish ou MusicExtractor sans recalculer les deux côtés dans le
même espace [INF]. Recherche web faite le 2026-09-24 : une publication m'a peut-être échappé.

Une nuance utile : les **mél-spectrogrammes** de MTG-Jamendo (229 Go) ont les paramètres documentés dans
`scripts/melspectrograms.py` [JAM]. Rien n'indique qu'ils correspondent au format d'entrée d'EffNet : 96 bandes,
trames de 512 échantillons, pas de 256, 16 kHz [EFF §1.1]. Il faut les considérer comme **non réutilisables**
tant que ce n'est pas vérifié.

### 2.3 Ce que chaque source couvre vraiment

- **Métal** : bien couvert, en volume et en nombre d'artistes, par FMA (sous-genres métal) et MTG-Jamendo (`metal`,
  `heavymetal`, `hardrock`). Mais il s'agit de musique sous licence libre, souvent autoproduite [FMA §4].
- **Hard techno** : couverture **faible** partout. MTG-Jamendo n'a que `techno` (346 artistes, tous styles
  confondus) et `hard` (60 artistes, sans définition) [MES]. FMA a `Techno` et `Breakcore - Hard` [MES]. AudioSet n'a
  que `Techno` [MES]. Aucun ne distingue hard techno, schranz ou gabber de la techno en général, alors que la
  bibliothèque contient de la French touch et de l'électro. La frontière utile passe **à l'intérieur** de
  l'électronique [INF].
- **Soupe commerciale** : **aucun dataset libre ne la couvre**. Par construction, les datasets CC contiennent
  peu de musique commerciale [FMA §4]. Les datasets commerciaux (AcousticBrainz, MSD, Music4All-Onion) n'ont pas
  d'audio, ou pas dans l'espace EffNet. « Pop » n'est pas « commercial » : la pop Jamendo n'est pas du Top 50 [INF].

### 2.4 Licences, pour un usage personnel non commercial (non juridique)

- **MTG-Jamendo** restreint son usage à la recherche non commerciale et académique [JAM, section License]. Un
  filtre personnel de webradio n'est pas clairement de la recherche : **incertain**, à trancher par Victor.
- **FMA** : « meant for research purposes » [FMA README]. Même incertitude.
- **AcousticBrainz** : CC0, sans restriction [AB].
- **Dumps Discogs** : CC0 [DDUMP]. Ce sont des métadonnées (sorties, artistes, styles), pas de l'audio.
- **AudioSet et MusicCaps** : les étiquettes sont libres, mais l'audio vient de YouTube. Les conditions YouTube
  interdisent de « télécharger […] tout ou partie du Service ou du Contenu sauf : (a) tel que permis explicitement
  par le Service ; (b) avec autorisation écrite préalable de YouTube » [YT].
- **Copie privée** (droit de l'UE) : l'exception ne couvre pas les reproductions faites à partir d'une source
  illicite [ACI, d'après les résumés]. Cela concerne aussi les négatifs acquis via Soulseek ou yt-dlp.
- Les modèles MTG eux-mêmes sont sous CC BY-NC-SA 4.0 [EFF §6].

### 2.5 Acquérir soi-même des extraits à partir de listes

**Listes possibles**

- **Commercial** :
  - SNEP publie chaque semaine plusieurs Tops de 200 positions, dont Top Singles et Top Albums, avec la mention
    « Tous les droits de reproduction et de communication au public sont réservés à la SCPP » [SNEP] ;
  - Billboard Hot 100 (**non consulté**).
- **Métal** :
  - SNEP publie aussi un **Top Rock & Metal** [SNEP] ;
  - dumps Discogs filtrés sur les styles métal [DDUMP ; G400 pour les noms de styles].
- **Hard techno** : dumps Discogs filtrés sur `Hard Techno`, `Schranz`, `Gabber`, `Hardcore`, `Hardstyle`
  [DDUMP ; G400]. C'est la seule source structurée et libre de droits qui descende à ce niveau de détail.
- **Rate Your Music** : ses conditions interdiraient tout accès automatisé (« page-scrape », « robot »,
  « spider »…) [RYM, contenu connu par un résumé, la page renvoie 403]. À exclure d'un pipeline automatique.

**Avantages** [INF, sauf mention] :

- On couvre enfin la soupe commerciale et la hard techno, que les datasets libres ne couvrent pas (§2.3).
- On acquiert les négatifs **par le même canal que les découvertes** (Soulseek, yt-dlp), avec le même décodage et
  le même embedding. Cela neutralise une grande partie du biais de source (§2.6).
- Les dumps Discogs sont CC0 [DDUMP], et leurs styles suivent la même taxonomie que la sortie d'EffNet
  [P22 §4.1].

**Inconvénients** :

- Légalité de l'acquisition audio (§2.4).
- Les étiquettes Discogs sont posées par sortie, pas par morceau [ABG tableau 2]. Un artiste « métal » peut sortir
  une ballade acoustique : il faut donc l'écoute de Victor ou un filtrage [INF].
- Les listes de charts reflètent la popularité, pas le style. Un titre du Top peut être une sortie indie
  qu'aimerait Victor [INF].
- Coût : téléchargement et embedding à environ 8 à 15 s CPU par titre [EFF §5.2].

### 2.6 Le piège du biais de source (« horse », confusion)

- **Horse** : Sturm propose une méthode « to determine if a music information retrieval (MIR) system is using
  factors irrelevant to the task », par analogie avec le cheval Clever Hans. Il montre que trois systèmes de pointe
  de reconnaissance de genre et d'émotion « are relying on factors confounded with the "ground truth" labels of a
  dataset » [ST14, résumé]. Sa méthode applique des **transformations non pertinentes** (légère égalisation, par
  exemple) et observe si la décision bascule.
- **Confusion mesurée** : sur GTZAN, isoler l'effet artiste fait perdre environ 8,5 points de rappel moyen (19 en
  blues). Un simple passe-haut à 20 Hz fait perdre 41 à 57 % aux systèmes à scattering, preuve qu'ils exploitaient
  de l'infrason inaudible [RSD19]. Ils recommandent, pour détecter un horse, de « test on a completely separate
  collection than the one used for training » [RSD19].
- **Effet artiste et album** : avoir les mêmes artistes en apprentissage et en test « leads to over-optimistic
  accuracy and may favor some approaches » [FMA §2.7, citant FL07]. FMA applique un filtre artiste à ses splits
  [FMA §2.7]. L'AcousticBrainz Genre Dataset filtre par *release group* mais pas par artiste [ABG §2.3].
- **« Name That Dataset »** : un classifieur reconnaît de quel dataset vient une image. La provenance est
  apprenable [TE11, non relu].
- **Codec et niveau** : les représentations évaluées par mir_ref, dont EffNet-Discogs, « generally struggle with
  audio deformations like white noise and gain reduction, though they fare better with intense MP3 compression »
  [MIRREF §3]. La robustesse de la représentation n'empêche pas un classifieur en aval d'exploiter une signature de
  source [INF].
- **Atténuant propre à EffNet** : le modèle travaille à 16 kHz [EFF §1.1]. Tout le contenu au-dessus de 8 kHz
  (Nyquist) lui est invisible, dont les coupures hautes fréquences des codecs situées au-delà. Les autres
  signatures restent exploitables : niveau, compression de dynamique, mastering, artefacts sous 8 kHz [INF].

**Application à AubeSonore** [INF] :

- Positifs = bibliothèque (sorties commerciales masterisées, FLAC ou MP3) ; négatifs = Jamendo ou FMA
  (autoproduction sous licence libre, MP3 320 kb/s). Le classifieur risque d'apprendre « production amateur contre
  production pro », ou « Jamendo contre le reste », plutôt que le style.
- Les découvertes arrivent par Soulseek et YouTube : un troisième domaine.

**Parades documentées ou directement dérivées** :

1. acquérir positifs de test et négatifs **par le même canal** que les découvertes ;
2. faire le test de Sturm : ré-encoder des positifs via la chaîne YouTube ou Opus et vérifier que le score ne
   bouge pas [ST14] ;
3. tester sur une collection séparée : négatifs d'entraînement tirés de Jamendo, négatifs de test acquis via
   Soulseek [RSD19] ;
4. grouper par artiste (§3.1).

---

## 3. Validation

### 3.1 Protocole honnête

1. **Grouper par artiste**, dans toutes les classes, négatifs compris. Utiliser `GroupKFold` ou
   `StratifiedGroupKFold(groups=artiste)` : chaque groupe apparaît dans un seul pli de test [SK-SGKF].
   Raison : effet artiste [FL07 ; FMA §2.7 ; RSD19].
2. **Imbriquer la sélection de modèle** (hyperparamètres, seuil) dans la validation croisée. Sinon l'estimation
   de performance est biaisée à la hausse [CT10]. scikit-learn le dit aussi pour le seuil : ne jamais régler le
   seuil sur les données qui ont servi à entraîner le classifieur [SK-TH].
3. **Jeu de test final hors distribution d'entraînement** : un **échantillon aléatoire du flux réel de
   découvertes**, écouté et étiqueté par Victor (accepte / refuse, et catégorie si refus). C'est la seule mesure qui
   combine la bonne source (§2.6, [RSD19]) et la bonne proportion de négatifs (§3.3, [SA02]) [INF].
4. **Tests de horse** : transformations non pertinentes (ré-encodage, gain, EQ légère), puis mesure du
   basculement de décision [ST14].
5. **Si l'on entraîne en PU** : les ROC et courbes précision-rappel calculées sur « labellisé contre
   non-labellisé » sont **biaisées**. On peut les corriger si l'on connaît le prior de classe [JA17, résumé]. Sous
   SCAR, le rappel s'estime sur les seules données PU, pas la précision [BD20 §4.1].

### 3.2 Métriques

- **Courbe précision-rappel plutôt que ROC** quand les classes sont déséquilibrées [SR15]. Dans le flux réel, les
  indésirables peuvent être rares ou majoritaires selon la source de découverte (**inconnu**, à mesurer).
- **Métriques par catégorie** : taux de fausse acceptation séparé pour la soupe, le métal et la hard techno. Une
  AUC globale peut masquer une catégorie ratée, par exemple la hard techno, mal représentée dans les sources
  libres (§2.3) [INF].
- **Taux de faux rejet sur les positifs**, par grand style de la bibliothèque (indie, synthpop, French touch…),
  pour vérifier que le filtre ne sacrifie pas un pan de la couleur [INF].
- **Intervalles de confiance** : bootstrap par artiste, ou intervalle binomial.
  - Avec n négatifs de test et 0 fausse acceptation observée, la borne supérieure à 95 % du taux vaut environ
    **3/n** (règle de trois) [HL83]. Il faut donc 300 négatifs de test sans erreur pour affirmer « moins de 1 % ».
  - Beleites et al. : « 75-100 samples will usually be needed to test a good but not perfect classifier »
    [BE13, résumé].

### 3.3 Combien de négatifs par catégorie ?

**La littérature ne donne pas de nombre universel.** Repères disponibles :

| Repère | Valeur | Source |
|---|---|---|
| Têtes MTG sur embeddings EffNet (humeurs, danceability) | 230 à 446 titres **au total** (deux classes) ; précision normalisée en validation croisée à 5 plis de 0,87 à 0,98 | [EFF §3.3], d'après les `.json` des têtes |
| Seuil de maintien d'un tag dans MTG-Jamendo | ≥ 50 **artistes** distincts | [JAM] (`raw_30s_cleantags_50artists`) |
| Seuil de l'AcousticBrainz Genre Dataset | ≥ 40 enregistrements issus de ≥ 6 release groups en entraînement ; ≥ 20 issus de ≥ 3 en validation et en test | [ABG §2.3] |
| Test d'un bon classifieur | 75 à 100 échantillons de test | [BE13] |
| Borne « zéro erreur » | 3/n à 95 % | [HL83] |
| Nombre de négatifs aléatoires | gain puis plafond : « Too many random negatives leads to false negatives that limits the lift » | [MEI24, résumé] |

Lecture [INF] :

- **compter en artistes, pas en titres**, puisque la validation groupe par artiste. Quelques dizaines d'artistes
  par catégorie, avec plusieurs titres chacun, est l'ordre de grandeur de ces repères ;
- **tracer une courbe d'apprentissage** (performance selon le nombre d'artistes négatifs) pour savoir si l'ajout
  paie encore. C'est la démarche que [BE13] propose pour planifier la taille d'échantillon.

### 3.4 Fixer le seuil d'acceptation

- **Seuil fondé sur les coûts** [EL01]. On note :
  - `C_FA` : coût d'une fausse acceptation (un morceau de métal passe à l'antenne) ;
  - `C_FR` : coût d'un faux rejet (une vraie découverte perdue).

  Avec des probabilités calibrées, on accepte si `p(conforme | x) ≥ C_FA / (C_FA + C_FR)`. La formule générale de
  [EL01] est `p* = c10 / (c10 + c01)`. Si Victor juge qu'une fausse acceptation coûte 4 fois plus qu'un faux rejet,
  le seuil vaut 0,8 [calcul direct].
- **Il faut deux conditions** :
  1. des probabilités **calibrées** : `CalibratedClassifierCV` ; la régression logistique l'est souvent
     naturellement [EN08 §3] ;
  2. la **bonne proportion** de négatifs, celle du flux réel. Si elle diffère de l'entraînement, il faut réajuster
     les sorties [SA02]. Un seuil réglé sur un jeu équilibré ne vaut pas pour un flux où 80 % des candidats sont
     bons, ou 20 % [INF].
- **Contrainte « à la Neyman-Pearson »** : fixer un plafond de fausse acceptation par catégorie (par exemple
  ≤ 2 % du métal passe), puis maximiser le rappel des positifs sous cette contrainte. `TunedThresholdClassifierCV`
  accepte un score personnalisé via `make_scorer` [SK-TH]. Une contrainte par catégorie demande un score écrit à la
  main [INF].
- **Zone de doute (reject option)** : entre deux seuils, le titre part en révision humaine au lieu d'être tranché
  [CH70]. Deezer procède de façon proche, avec un seuil fixe sur les scores d'humeur et une liste de secours
  [FM22 §2.2.4].

---

## 4. Pratique des services existants

- **Pandora / SiriusXM.**
  - *Music Genome Project* : « hundreds of musical details for each song », analysés par des musicologues
    [MGP].
  - Le brevet décrit chaque morceau comme un vecteur d'environ 150 « gènes » notés de 0 à 5, comparés par une
    distance pondérée `Σ w(s−t)²`. Le vecteur de poids peut être « manipulated for each end user » [PAT].
  - Le goût d'une station y est donc une **pondération apprise** autour de graines positives, pas un classifieur
    appris sur des négatifs.
  - Recherche SiriusXM (propriétaire de Pandora) [MEI24] :
    - l'usage exclusif de positifs avec négatifs tirés au hasard est la norme des recommandeurs séquentiels ;
    - les vrais négatifs (pouce bas) réduisent le temps d'entraînement d'environ 60 % et augmentent la précision de
      test de 6 % ;
    - trop de négatifs aléatoires créent de faux négatifs ;
    - au sein d'une station, les morceaux sont « generally stylistically similar, and so it is harder to predict
      which songs from a given station a user may not like, as compared to other random songs that may be an
      entirely different genre » [MEI24 §1].

    C'est exactement la difficulté de la « soupe commerciale » face à la pop française de la bibliothèque [INF].
- **Deezer.**
  - *Flow Moods* : des curateurs ont étiqueté « thousands of "Chill" and "Not Chill" songs », c'est-à-dire des
    positifs **et** des négatifs explicites, pris dans le même catalogue.
  - Ensuite : embedding audio pré-entraîné de 256 dimensions (VGG de la bibliothèque musicnn), 6 forêts
    aléatoires binaires, et un seuil fixe pour filtrer les recommandations [FM22 §2.2].
  - Les auteurs se demandent eux-mêmes si un classifieur d'humeur n'apprend pas en fait un genre (« is the "You
    & Me" classifier essentially learning soul songs? ») [FM22 §3].
  - Côté utilisateur, Deezer traite le démarrage à froid par semi-personnalisation, en regroupant les
    utilisateurs [BR21, résumé].
- **Spotify.**
  - Le *taste profile* agrège écoutes récentes, titres et artistes favoris, embeddings utilisateur et
    interactions [SPX].
  - La fonction « Exclude from your Taste Profile » **retire** les écoutes exclues (« pretend those streams didn't
    happen ») : elle ne les réinjecte pas comme négatifs. Résultats publiés : « about 4% more music from
    recommendations » chez ses utilisateurs [SPX].
  - Recherche liée à Spotify, contenu audio : van den Oord, Dieleman et Schrauwen prédisent depuis l'audio les
    facteurs latents du filtrage collaboratif, pour les nouveautés sans historique [VDO13].
- **Filtrage collaboratif à retour implicite** : c'est le cadre « positifs seulement » historique. *One-class
  collaborative filtering* : pondération ou échantillonnage des non-observés comme négatifs faibles [PAN08]. Hu,
  Koren et Volinsky modélisent la confiance des observations implicites [HKV08, de mémoire].
- **Recherche MIR sur le goût d'un auditeur à partir de ses seuls positifs** :
  - [BO13] : modèles centroïde, plus proche voisin et GMM construits sur un « preference set » (voir §1.3 b) ;
  - [MA06] : SVM avec apprentissage actif sur quelques exemples choisis par l'utilisateur. L'apprentissage
    actif « requires half as many labeled examples to achieve the same accuracy » [MA06, résumé].

**Ce qui revient partout** [INF, synthèse des sources ci-dessus] :

- les services qui publient un **filtre** (Deezer) l'entraînent sur des **négatifs explicites du même
  catalogue** ;
- ceux qui modélisent le goût à partir de positifs (Pandora, Bogdanov) le font par **similarité ou densité**
  autour des positifs ;
- la recherche SiriusXM conclut que les vrais négatifs valent mieux que des négatifs aléatoires.

---

## 5. Options de conception, avec avantages et inconvénients sourcés

Présentées sans trancher. Elles peuvent se combiner, par exemple une règle catégorielle suivie d'un score de
couleur.

### Option A : règle sur la tête `genre_discogs400`, sans apprentissage

Rejeter si la somme des activations des styles « interdits » (métal, hard techno et apparentés, §1.5) dépasse un
seuil réglé sur un petit jeu étiqueté.

- **Pour** :
  - aucun négatif à acquérir ;
  - taxonomie fine, jusqu'à `Hard Techno`, `Schranz` et `Gabber` [G400] ;
  - coût marginal de 0,04 à 0,06 s par titre [EFF §3.4] ;
  - lisible : on sait pourquoi un titre est rejeté.
- **Contre** :
  - prédiction de style bruitée (PR-AUC moyenne 19,9 sur les genres Jamendo [P22 tableau 3]) ;
  - étiquettes d'origine par sortie [ABG tableau 2] ;
  - **aucun style « commercial »**, donc la soupe n'est pas couverte (§1.5) ;
  - le seuil demande malgré tout un jeu de validation étiqueté (§3.4).

### Option B : one-class sur la bibliothèque (densité ou nouveauté)

`LocalOutlierFactor(novelty=True)`, `OneClassSVM`, `GaussianMixture` ou `IsolationForest` sur les embeddings
(après ACP).

- **Pour** :
  - n'utilise que les positifs, sans biais de source côté négatifs ;
  - outils standard [SK-OD] ;
  - modèle multimodal possible (GMM, LOF), adapté aux 9 familles de styles ([BO13] : SEM-ALL et SEM-GMM).
- **Contre** :
  - rejette le **nouveau**, pas l'**indésirable** : une découverte hors des styles connus est refusée comme du
    métal [BD20 §8.2 ; INF] ;
  - hyperparamètres impossibles à régler sans négatifs, sauf en générant un fond artificiel [TD01 ; SHS05] ;
  - `EllipticEnvelope` inutilisable en 1 280 dimensions [SK-EE] ;
  - pas de probabilité calibrée pour `OneClassSVM` [SK-OCSVM], donc un seuil par coûts difficile (§3.4) ;
  - résultats modestes en étude utilisateur avec des descripteurs anciens : 42 à 49 % de « fails » [BO13 §5.2].

### Option C : positifs contre un univers de fond (PU case-control)

Univers = échantillon large et diversifié, par exemple les découvertes brutes déjà téléchargées, ou un dataset
libre.

- **Pour** :
  - cadre théorique établi [SHS05 ; EN08] ;
  - l'ordre de classement ne dépend pas de la correction d'Elkan-Noto, donc un classifieur standard suffit pour
    trier [EN08 §2] ;
  - `pulearn` disponible si l'on veut la correction [PUL] ;
  - si l'univers **est** le flux de découvertes, pas de biais de source [INF].
- **Contre** :
  - apprend « ressemble à la bibliothèque », pas « hors des trois catégories » [INF] ;
  - SCAR douteuse (§1.1), et les méthodes qui en dépendent y sont sensibles [BD20 §5.6] ;
  - en case-control, la proportion d'acceptables dans l'univers n'est pas identifiable [EN08 §3], alors que le seuil
    en dépend [SA02] ;
  - un univers tiré de Jamendo ou FMA fait apprendre la source [ST14 ; RSD19 ; FMA §4].

### Option D : négatifs ciblés par catégorie (supervisé, ou PUbN si l'on ajoute le flux non étiqueté)

Réunir quelques dizaines d'artistes par catégorie (§3.3), puis entraîner « bibliothèque contre négatifs ciblés »,
ou P + bN + U selon [HS19].

- **Pour** :
  - correspond à la définition de Victor (trois catégories nommées) ;
  - soutenu par la littérature sur les anomalies étiquetées [OE19 ; SAD20 ; HS19] et par la pratique Deezer
    (positifs et négatifs explicites, embedding figé, classifieur simple, seuil fixe) [FM22 §2.2] ;
  - probabilités calibrables, donc seuil par coûts possible [EL01] ;
  - métriques par catégorie (§3.2).
- **Contre** :
  - aveugle à une 4ᵉ catégorie indésirable non listée [INF] ;
  - la qualité dépend fortement du jeu auxiliaire [OE19] ;
  - **sources libres insuffisantes** pour la hard techno et la soupe (§2.3), donc acquisition par listes (§2.5),
    avec les questions de légalité (§2.4) ;
  - risque de horse si les négatifs viennent d'une autre source que les positifs et les découvertes (§2.6) ;
  - PUbN n'a pas d'implémentation packagée (§1.4).

  Variantes de source des négatifs :

  - **D1, datasets libres** (FMA ou Jamendo pour le métal, un peu de techno) :
    - pour : légal pour la recherche, gratuit, étiqueté par piste [JAM ; FMA] ;
    - contre : conditions « recherche » incertaines pour AubeSonore [JAM ; FMA], biais de production amateur
      [FMA §4], pas de soupe.
  - **D2, listes (dumps Discogs CC0, Tops SNEP), audio acquis par le canal des découvertes** :
    - pour : couvre les trois catégories, même canal que la production, donc moins de biais de source [INF], et
      taxonomie Discogs alignée sur EffNet [P22] ;
    - contre : légalité de l'acquisition audio [ACI ; YT], étiquette par sortie et non par titre [ABG], coût de
      calcul [EFF §5.2].

### Option E : boucle humaine (étiquetage du flux réel et apprentissage actif)

Victor écoute un échantillon des découvertes et accepte ou refuse. Ses refus deviennent des négatifs **du même
domaine** ; une zone de doute part en révision.

- **Pour** :
  - vrais négatifs du bon domaine, meilleurs que des négatifs aléatoires [MEI24] ;
  - donne aussi le jeu de test final honnête (§3.1) et la vraie proportion d'indésirables pour le seuil [SA02] ;
  - l'apprentissage actif divise environ par deux le nombre d'exemples nécessaires [MA06, résumé] ;
  - zone de doute formalisée [CH70].
- **Contre** :
  - coût d'écoute pour Victor ;
  - démarrage lent : il faut de l'ordre de 75 à 100 exemples par catégorie rien que pour **tester**
    [BE13 ; HL83] ;
  - les refus reflètent aussi l'humeur du moment, ce qui fait du bruit d'étiquette [INF].

### Points communs à toutes les options

- Validation groupée par artiste et imbriquée [SK-SGKF ; CT10 ; FL07].
- Test final sur un échantillon étiqueté du flux réel [RSD19 ; INF].
- Tests de horse par ré-encodage et gain [ST14 ; MIRREF].
- Seuil choisi par les coûts explicités par Victor et la proportion réelle d'indésirables [EL01 ; SA02].
- Métriques rapportées par catégorie [INF].
