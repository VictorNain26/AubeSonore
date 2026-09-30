# Audit : le modèle Jev de TypeSafe AI peut-il servir au goût + découverte v3 ?

Date : 2026-09-25. Demande de Victor : « peux-tu auditer et voir si on ne peut pas utiliser le
modèle IA JEV pour notre besoin ? », précisée en « jev le model de de typesafe ia ».

## Verdict

**Ne pas adopter. Pas de spike non plus.** Jev ne prend **que du texte** : il ne peut ni remplacer
ni compléter l'empreinte EffNet du signal « Son ». Ailleurs dans le pipeline, il ne ferait que
relire en texte des données qu'on a déjà sous forme structurée. De plus, c'est un service cloud
fermé, en accès anticipé depuis dix jours, dont les versions et les limites de débit bougent
encore. Un seul fait changerait ce verdict : l'arrivée d'une entrée audio chez Jev (§6).

## 1. Identification

**Identifié avec certitude.** « JEV » est **Jev**, le premier modèle de **TypeSafe AI**, un labo de
San Francisco. TypeSafe AI est sorti de l'ombre le 15 septembre 2026 avec 40 M$ de financement
d'amorçage, levés auprès de DCVC. Il a été fondé par Diogo Almeida, ancien chercheur d'OpenAI et
co-auteur d'InstructGPT, avec Erik Gafni et Sasha Sheng.
- Communiqué : https://www.financialcontent.com/article/bizwire-2026-9-15-typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai
- Reprise presse : https://www.hpcwire.com/aiwire/2026/09/16/typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai/
- The Register : https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711
- Annonce officielle : https://typesafe.ai/blog/introducing-system-one-models-and-jev

La correspondance est sans ambiguïté : Victor a cité le nom du modèle et celui de l'éditeur, et les
deux coïncident. Cloudflare distribue aussi ce modèle sous l'intitulé « Jev (typesafe) » :
https://developers.cloudflare.com/ai/models/typesafe/jev/.

J'ai écarté deux homonymes :
- **JEPA** (architectures prédictives d'embeddings) : famille de méthodes sans lien avec TypeSafe.
- **Dépôts « Open-Jev » sur Hugging Face** : reproductions communautaires non officielles. Par
  exemple, `ZefanCai/Open-Jev-9B` est un adaptateur LoRA sur Qwen3.5-9B, texte seul, et sa fiche
  demande un GPU ([fiche](https://huggingface.co/ZefanCai/Open-Jev-9B)).
- **L'organisation Hugging Face `TypeSafeAI`** n'est pas vérifiée et ne contient aucun Jev. Elle
  héberge un reconditionnement de StepFun Step-5
  ([API HF](https://huggingface.co/api/organizations/TypeSafeAI/overview),
  [dépôt](https://huggingface.co/TypeSafeAI/Step-5-Preview-BF16)).

## 2. Ce que fait Jev

- **Un modèle de décision, pas de génération.** TypeSafe l'appelle modèle « System One ». Il reçoit
  un `state` (du texte ou du JSON) et des questions typées. Il renvoie des réponses typées avec des
  probabilités calibrées ([System One](https://docs.typesafe.ai/concepts/system-one.md)). Il ne
  génère pas de texte ([coding agents](https://docs.typesafe.ai/introduction/coding-agents.md)).
- **Trois types de question** ([primitives](https://docs.typesafe.ai/primitives.md),
  [API](https://docs.typesafe.ai/api.md)) :
  - `Choice` : une option parmi 255 au plus ;
  - `Score` : un niveau sur une échelle ordonnée ;
  - `Noul` : la probabilité d'un « oui ».
- **Entrée : texte seulement.** La page Models l'écrit en toutes lettres : « Text only. String, JSON
  object, or array of text values. **No image, audio, or video input.** ». Elle ajoute : « Pre-process
  non-text inputs (images, audio, video, binaries) into text or structured fields »
  ([Models](https://docs.typesafe.ai/models.md)). La page State le confirme : « Images, audio, and
  video are not supported (yet) » ([State](https://docs.typesafe.ai/concepts/state.md)).
- **Sortie : pas d'embedding.** Jev renvoie seulement des choix, des scores et des probabilités. La
  documentation ne décrit aucun vecteur de représentation ([réponses du
  SDK](https://docs.typesafe.ai/sdk/python/api/types/responses.md),
  [quick start](https://docs.typesafe.ai/introduction/quickstart.md)).
- **Pas d'adaptation au client.** « Jev is not fine-tuned or LoRA-adapted with customer data […]
  the same weights serve every account. » On ne l'oriente que par le texte de la requête
  ([Models § Customizing](https://docs.typesafe.ai/models.md)).
- **Faiblesses reconnues par l'éditeur** dans la version 1.13 : lecture littérale, nombres,
  comptage, dates, questions indirectes. La précision baisse aussi quand l'état grossit
  ([jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)). La langue principale est
  l'anglais ([Models § Language](https://docs.typesafe.ai/models.md)).

## 3. Licence, disponibilité, prix

| Point | Fait | Source |
|---|---|---|
| Poids | Fermés, aucun téléchargement. Pas d'auto-hébergement documenté. | [The Register](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711), [Models](https://docs.typesafe.ai/models.md) |
| Accès | API `POST https://api.typesafe.ai/v1/systemone` et clé de console, en accès anticipé | [quick start](https://docs.typesafe.ai/introduction/quickstart.md), [typesafe.ai](https://typesafe.ai/), [blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) |
| Prix | 0,042 $ par million de jetons d'entrée ; la sortie est gratuite | [Models](https://docs.typesafe.ai/models.md) |
| Débit | 250 000 jetons/s et 1 200 requêtes/min, « can change without notice » | [Models](https://docs.typesafe.ai/models.md) |
| Contexte | 64 000 jetons par requête, dont 32 000 pour l'état plus la plus longue question | [Models](https://docs.typesafe.ai/models.md) |
| Données | Pas d'entraînement sur les requêtes des clients. La non-rétention (ZDR) est réservée aux clients entreprise. | [Legal](https://docs.typesafe.ai/legal.md) |
| SDK Python | `typesafe-sdk` 0.7.1, licence MIT, Python ≥ 3.10. Premier dépôt le 2026-09-04. | [PyPI](https://pypi.org/pypi/typesafe-sdk/json), [GitHub](https://github.com/typesafe-ai/typesafe-sdk-python) |

## 4. Peut-il servir notre besoin ? Signal par signal (spec v3 §5.3–5.4)

| Brique v3 | Jev possible ? | Pourquoi |
|---|---|---|
| **Son** : EffNet 1280-d sur l'extrait de 30 s | **Non** | Jev refuse l'audio et ne produit pas d'embedding ([Models](https://docs.typesafe.ai/models.md)). Il faudrait d'abord transcrire le son en texte, c'est-à-dire avec EffNet ou ses têtes. Jev n'ajouterait alors rien. |
| **Popularité** : `rank`, `nb_fan`, auditeurs | Non | Ce sont des nombres. L'éditeur écrit « Keep the arithmetic in code » ([jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)). |
| **Culture** : vecteur des tags Last.fm | Techniquement oui, sans intérêt | Le livre de recettes « feature discovery » transforme du texte libre en colonnes numériques pour un modèle classique ([cookbook](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md)). Mais nos tags sont déjà un vecteur structuré, que HistGradientBoosting lit directement. Faire relire ces mêmes tags par Jev n'ajoute aucune information. Ce qui en ajouterait, comme la biographie Last.fm, serait un 5ᵉ signal, hors périmètre v3 (spec §11 : « Tout signal au-delà des quatre »). |
| **Proximité** : `match` Last.fm, nombre de sources | Non | Ce sont des nombres et des comptes, qui relèvent du code. |
| **Modèle** : régression logistique puis HGB | Non | On ne peut pas entraîner Jev sur les votes de Victor ([Models § Customizing](https://docs.typesafe.ai/models.md)). Or la spec §1 établit, mesure à l'appui, que « le goût se joue à l'intérieur d'un genre, et seules des étiquettes données par Victor le séparent ». Un juge de « bon sens » générique, aux poids communs à tous les comptes, ne peut pas apprendre ces étiquettes. |

**Qualité musicale.** TypeSafe ne publie aucune évaluation musicale ou audio. Ses seuls comparatifs
sont des « workflow evals » internes face à des LLM
([blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). Aucun benchmark audio
comme MARBLE (https://arxiv.org/abs/2306.10548) ne peut donc s'appliquer. En face, Discogs-EffNet est un modèle publié, entraîné sur
les métadonnées éditoriales Discogs (Alonso-Jiménez, Serra, Bogdanov, ISMIR 2022,
https://archives.ismir.net/ismir2022/paper/000099.pdf). Nous l'avons déjà mesuré sur notre machine
(`2026-09-23-essentia-effnet.md`).

**Coût, à titre d'ordre de grandeur.** Il n'y a aucun coût CPU local : c'est un appel réseau. Si on
posait une dizaine de questions par artiste, avec des tags en entrée, on compterait environ
800 jetons par artiste. Pour 20 000 artistes, cela ferait environ 16 M de jetons, donc environ
0,70 $ au tarif public ([Models](https://docs.typesafe.ai/models.md)). Ces volumes sont mon
hypothèse, pas une mesure. Le coût n'est pas l'obstacle : l'obstacle, c'est que Jev n'apporte
aucun signal nouveau.

## 5. Intégration et risques

Le code serait simple : `uv add typesafe-sdk`, puis un appel `system_one(state, questions)`
([SDK](https://docs.typesafe.ai/sdk/python.md)). Les risques, eux, sont réels.

- **Jeunesse du service.**
  - Le SDK en est à sa 3ᵉ version publique en une semaine.
  - Deux versions ont cassé la compatibilité : la 0.6.0 le 2026-09-15 et la 0.7.0 le 2026-09-18
    ([changelog](https://docs.typesafe.ai/sdk/python/changelog.md)).
  - Le modèle en est à la 1.13, et l'alias `jev-latest` évolue sans préavis
    ([Models § Aliases](https://docs.typesafe.ai/models.md)).
- **Dépendance cloud.** Il faut une clé et un compte en accès anticipé, avec des limites
  « adjusting dynamically » ([Models](https://docs.typesafe.ai/models.md)). Cela va contre le
  principe de la spec v3 §3 : « outils existants et robustes ». Et le système entier est
  auto-hébergé.
- **Données.** On enverrait des extraits de la bibliothèque Plex à un service américain. Sans
  contrat entreprise, la non-rétention n'est pas garantie ([Legal](https://docs.typesafe.ai/legal.md)).
- **Reproductions ouvertes.** Les « Open-Jev » ne sont ni officielles ni utilisables ici. Elles
  exigent un GPU et prennent elles aussi du texte seul
  ([Open-Jev-9B](https://huggingface.co/ZefanCai/Open-Jev-9B)).

## 6. Recommandation

**Ne pas adopter Jev, et ne pas lancer de spike.** Aucun point de la chaîne v3 ne gagnerait à
l'utiliser :
- le signal « Son », le cœur du besoin, lui est inaccessible ;
- les trois autres signaux sont des nombres ou des tags déjà structurés ;
- et le goût de Victor s'apprend de ses votes, ce que Jev ne sait pas faire.

On garde Discogs-EffNet sur CPU, comme la spec le prévoit.

**Condition de réexamen, une seule :** que TypeSafe documente une entrée audio. La doc écrit
aujourd'hui « not supported (yet) » ([State](https://docs.typesafe.ai/concepts/state.md)). Ce
jour-là, un spike aurait un sens : comparer Jev à la note audio EffNet, à l'AUC, en validation
croisée groupée par artiste, sur les votes existants (séries 1 et 2).
