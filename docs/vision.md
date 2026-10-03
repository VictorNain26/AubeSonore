# AubeSonore — vision produit et architecture

Proposition du 2026-10-03, à valider par Victor. Validé, ce document fait autorité sur ce qui
traverse les pièces : le produit, qui possède quoi, comment les pièces se parlent. Chaque pièce
garde sa conception propre — `pipeline/docs/vision.md` (l'antenne),
`musilogy/docs/superpowers/specs/2026-10-02-frieze-lineage-design.md` (la frise),
`site/CLAUDE.md` (le site), `azuracast/RUNBOOK.md` (la diffusion) — et ne doit pas le contredire.
Quand le système réel le contredit, le système a raison et ce document se corrige.

## 1. Le produit

AubeSonore est une webradio de découverte dans la couleur de Victor : des titres qu'on ne
connaît pas, qu'il aurait pu choisir, enchaînés selon le moment de la journée. Elle a deux
publics :

- **l'auditeur**, sur le site public, en français et en anglais ;
- **Victor**, qui la nourrit : son goût (Plex) et ses votes (page de vote privée) décident de ce
  qui passe à l'antenne.

### 1.1 Le parcours de l'auditeur

Quatre gestes, chacun menant au suivant, et le dernier ramenant au premier :

| Geste | Question de l'auditeur | Surface | Ce qui y répond |
|---|---|---|---|
| **Écouter** | « Qu'est-ce qui passe ? » | accueil | le direct, ce qui vient de passer, les plus gardés |
| **Savoir** | « Qui est-ce ? » | page artiste | portrait, quelques faits, l'ouverture de Wikipédia, ce que l'antenne en a joué, où l'écouter |
| **Garder** | « Je ne veux pas le perdre » | bibliothèque, compte | aimer, retrouver, partager, être prévenu quand l'artiste repasse |
| **Explorer** | « D'où vient-il, qui jouait à côté ? » | frise | sa ligne de vie parmi les autres, ses inspirations, sa descendance, ses contemporains |

Explorer ramène à Écouter : chaque artiste de la frise mène à sa page quand l'antenne l'a joué,
et à une écoute ailleurs sinon. C'est ce qui distingue AubeSonore d'une radio qu'on subit et d'une
encyclopédie qu'on consulte : la radio donne l'envie, la frise donne le chemin.

### 1.2 Ce que le produit n'est pas

- **Pas un service à la demande.** On écoute le direct ; pour un titre précis, on va sur une
  plateforme, et le site y mène par un lien réel, jamais par une recherche déguisée.
- **Pas un classement.** La popularité ordonne ce qu'on voit d'abord sur la frise, elle n'exclut
  personne et ne choisit jamais ce qui passe à l'antenne.
- **Pas une recommandation par co-écoute.** Les liens montrés sont des faits sourcés
  (MusicBrainz, Wikidata, Wikipédia cité) ou des calculs nommés (contemporains), jamais « les
  gens qui écoutent X écoutent aussi Y ».
- **Pas une page pour n'importe quel nom.** Une page artiste n'existe que pour un artiste que
  l'antenne a joué ; la frise ne montre que ce que MusicBrainz porte, sous son identifiant.

## 2. Principes communs

1. **Le flux d'abord.** Rien — tâche lourde, déploiement, sauvegarde — ne doit couper l'antenne ;
   AzuraCast est prioritaire sur le CPU (`cpu_shares`), et chaque conteneur a un plafond de
   mémoire.
2. **Rien n'est affirmé sans source.** Une valeur dérivée voyage avec sa provenance, une absence
   reste une absence (`null`, jamais zéro), et le texte du site ne promet rien que le système ne
   fasse (pas « enchaînés avec soin » tant que l'enchaînement n'est pas mesuré).
3. **Une donnée, un propriétaire ; un fait, une source** (§3.1 et §3.5).
4. **Rien d'inventé.** Un outil existant, maintenu, vérifié le jour du choix ; le code maison est
   la colle. Un mécanisme qui ne prouve pas son utilité est retiré.
5. **Mesurer avant de décider**, et écrire la mesure là où la décision est prise.
6. **Un seul style**, sobre et doux, en français et en anglais ; aucune interface expliquée par
   une légende.

## 3. Architecture

### 3.1 Les pièces et ce qu'elles possèdent

| Pièce | Rôle | Possède (seule à écrire) | Lit |
|---|---|---|---|
| `azuracast/` | diffuser | l'antenne : médias, playlists, historique de diffusion | — |
| `pipeline/` | choisir ce qui passe | le goût (modèle, votes, candidats) et la bibliothèque d'antenne, qu'il publie par l'API d'AzuraCast | Plex (lecture seule), Deezer, Last.fm, Hype Machine, Soulseek |
| `site/` | l'expérience de l'auditeur | comptes, titres gardés, identité des artistes joués (`artist`), journal de diffusion (`radio_play`) | AzuraCast (lecture seule), Deezer, MusicBrainz, Wikipédia, le schéma `musilogy` |
| `musilogy/` | la carte du terrain musical | ses tables, produites hors ligne depuis des dumps épinglés, et le schéma `musilogy` de la base du site, qu'il remplace en bloc à chaque `musilogy load` | dumps MusicBrainz, relevé ListenBrainz |

### 3.2 Les flux

```
 Plex ──lecture──► pipeline ──API (dépôt, déplacement)──► AzuraCast ──flux MP3──► auditeur
                       ▲                                       │
         votes de Victor (page privée)                  now-playing, historique
                                                               ▼
 dumps MusicBrainz,                                          site ◄──── auditeur
 relevé ListenBrainz ──► musilogy ──musilogy load──► schéma `musilogy` (base du site)
```

### 3.3 Les contrats

Chaque frontière a un contrat écrit, et un seul :

| Entre | Contrat | Où il est écrit |
|---|---|---|
| pipeline → AzuraCast | API AzuraCast, dossier `antenne/`, jamais de réécriture de balises | `pipeline/docs/vision.md` §7.2 |
| site ← AzuraCast | now-playing statique et historique, en lecture | `site/CLAUDE.md` |
| site ← musilogy | les fonctions SQL de `musilogy/src/musilogy/pg/90_*.sql` : le site n'appelle qu'elles, jamais les tables, et elles sont testées contre Postgres côté musilogy | spec de la frise, « Intégration dans le site » |
| site ← Deezer, MusicBrainz, Wikipédia | à chaud, caché, chacun isolé et autorisé à tomber seul | `site/CLAUDE.md` |

**Couplages interdits**, et pourquoi :

- **pipeline ↔ site** : l'antenne ne dépend pas du site, le site ne pilote pas l'antenne ; tout
  passe par AzuraCast. Les titres gardés par les auditeurs ne deviennent pas un signal de goût :
  la radio est dans la couleur de Victor, pas dans celle de son audience.
- **site → musilogy à l'exécution** : le site lit une copie chargée, jamais le pipeline de
  données ; musilogy peut être en panne, en travaux ou absent sans que le site tombe.

### 3.4 L'identité d'un artiste

Un artiste a trois identités, et chacune a son rôle :

| Identité | Portée | Rôle |
|---|---|---|
| le texte crédité par AzuraCast | ce qui passe | ce que l'auditeur entend annoncer |
| `artist.id` (site) | les artistes joués | l'URL stable de la page artiste |
| le MBID (MusicBrainz) | 2,3 M d'artistes | **le pivot** : la clé de musilogy, donc de la frise, de la filiation et des contemporains |

Le site passe du texte à `artist.id` (`artistResolver`), puis de Deezer au MBID par le lien
Deezer que MusicBrainz déclare. **Ce MBID est enregistré dans `artist.mbid` dès qu'il est
trouvé** : c'est le pont entre l'antenne et la frise. Chaque artiste joué est résolu à son premier
passage, pas quand un auditeur ouvre sa page.

Quand musilogy extraira les relations URL (étape 4 de sa spec), le passage Deezer → MBID se fera
hors ligne, pour tous les artistes joués, sans appel à MusicBrainz.

### 3.5 Un fait, une source

| Fait | Source | Pourquoi |
|---|---|---|
| ce que l'antenne a joué | `radio_play` (site) | aucune source externe ne le sait |
| portrait | Deezer, à chaud, lié par un titre joué | l'image la plus juste pour un artiste joué |
| faits de la page artiste (type, lieu, années) | MusicBrainz, à chaud | à jour pour les nouveautés, que le dump épinglé ne connaît pas encore |
| ouverture de l'article | Wikipédia, à chaud, CC BY-SA | — |
| ligne de vie, genres, filiation, contemporains, popularité (frise) | musilogy, datés du dump et du relevé | reproductibles, avec leur provenance ; c'est ce qui se dessine |

La page artiste et la frise peuvent donc donner deux années de début différentes pour un même
artiste : la page montre la date déclarée aujourd'hui, la frise la ligne de vie du dump, avec sa
provenance (déclarée, ou déduite du premier album). Chaque surface affiche la source de ce
qu'elle montre ; aucune ne recopie l'autre.

### 3.6 L'exécution

Une seule machine, partagée avec d'autres services (victorserv, 16 Go). Faute de budget, c'est
un choix assumé, pas une étape provisoire, et il impose :

- **des plafonds de mémoire** sur chaque conteneur, `systemd-oomd` sur les tâches de
  l'utilisateur, un chien de garde matériel ;
- **les tâches lourdes plafonnées** (`systemd-run --scope`, `musilogy/CLAUDE.md`) ;
- **le déploiement par fusion sur `master`**, tiré par un timer, jamais pendant la passe
  hebdomadaire ;
- **des sauvegardes sur un disque distinct**, dont les médias de l'antenne (restic, quotidien) :
  ils ne se retéléchargent pas à l'identique, et les votes et l'historique y sont attachés ;
- **une surveillance par Gatus**, chaque tâche planifiée envoyant son battement de cœur.

Risques connus, acceptés tant que leur déclencheur ne s'est pas produit :

| Risque | Déclencheur de révision |
|---|---|
| le flux passe par Cloudflare Tunnel, contre ses conditions CDN (audio « disproportionné », conditions du 2026-09-28) | un avis de Cloudflare, ou le palier P1 de `site/docs/scaling-roadmap.md` |
| aucune copie hors de la maison | dès qu'un stockage gratuit (B2 ou R2, 10 Go) est ouvert |
| une seule machine : si elle tombe, la radio se tait | un budget d'hébergement (CX33 + Storage Box ≈ 12 € HT/mois au 2026-10-03) |

## 4. Les surfaces du site

| Surface | Route | Indexée | Rôle |
|---|---|---|---|
| Accueil | `/`, `/en` | oui, pré-rendue | Écouter |
| Page artiste | `/artist/:id/:slug` | oui | Savoir, pour un artiste joué ; section « filiation et contemporains » et lien « voir sur la frise » quand son MBID est connu |
| Frise | `/frieze`, `/en/frieze` (sur le modèle de `/artist`) | non tant qu'elle est un prototype | Explorer ; la fiche d'un artiste joué signale qu'il est passé à l'antenne et mène à sa page |
| Bibliothèque, compte | fenêtres de l'accueil | non | Garder |

La frise reste non listée tant que les seuils de zoom ne sont pas mesurés et que les trois
listes (inspirations, descendance, contemporains) n'ont pas été jugées sur des artistes connus.

## 5. Écarts actuels

Ce qui ne s'emboîte pas encore, mesuré le 2026-10-03 :

1. **Les alertes « artiste aimé » ne reconnaissent pas l'artiste comme le reste du site** : elles
   comparent le nom en minuscules brutes (`likedArtistWatcher`), là où l'identité utilise le nom
   normalisé (`normalizeArtistName`) ; « Beyoncé » aimé ne déclenche rien quand « Beyonce » passe.
2. **La frise n'a pas d'API côté site.** Les fonctions SQL sont prêtes (PR #257) ; l'API et le
   front restent à faire, sur des types partagés qui réutilisent la même référence d'artiste que
   la page artiste.
3. **Documents qui se contredisent** :
   - `pipeline/docs/vision.md` se titre « AubeSonore — vision » alors qu'il conçoit le pipeline ;
     son §11 dit que le site « a son propre dépôt » (faux depuis le monorepo) et que les médias
     ne se sauvegardent pas (faux depuis le 2026-10-03) ;
   - le `CLAUDE.md` racine dit que le contrôle avant push du site ne tourne que si `site/`
     change, alors qu'il a rejoué tout le CI du site sur un changement de `musilogy/` seul ;
   - `site/apps/backend/src/db/index.ts` justifie son réglage TLS par des hébergeurs gérés
     (Railway, Supabase) que le site n'utilise plus ;
   - `site/docs/scaling-roadmap.md` ne fait passer Cloudflare devant la radio qu'au palier P2,
     alors que le flux passe déjà par le Tunnel.
4. **Le README du site décrit un site qui n'existe plus** : liens par Songlink/Odesli (fermé le
   2026-07-31), « identité jour/nuit » et « fil-journée » (retirés au profit d'un seul style).
5. **La migration `0006_timestamptz` avale toute erreur** (`EXCEPTION WHEN OTHERS THEN NULL`) :
   déjà appliquée en production, elle ne refait rien, mais un échec y passerait inaperçu.
6. **La sauvegarde des médias de l'antenne vit hors du dépôt** (`~/mediaserver/backup-restic.sh`,
   unités dans `~/.config/systemd/user`) alors qu'elle ne sert qu'AubeSonore.
7. **Aucune copie hors de la maison** (§3.6).

## 6. Feuille de route

Dans cet ordre ; chaque étape est une PR courte, fusionnée avant la suivante.

1. **Ce document**, validé, et les écarts documentaires du §5.3 corrigés.
2. **Fonctions SQL de la frise** (PR #257), puis `musilogy load` en production.
3. **Le pont** : `artist.mbid` enregistré dès qu'il est trouvé, chaque artiste joué résolu à son
   premier passage, et les artistes déjà joués rattrapés.
4. **L'API** : `/api/frieze/*` (vue d'ensemble, fenêtre, fiche) et les types partagés, dont une
   référence d'artiste commune à la page artiste et à la frise.
5. **La page artiste** : section filiation et contemporains, lien vers la frise.
6. **La frise**, non listée : mesure des seuils de zoom, jugement des listes, puis lien depuis
   le site.
7. **musilogy, étape 4** : relations URL (Deezer → MBID hors ligne, liens d'écoute) et genres
   Discogs.
8. **musilogy, étapes 5 et 6** : graphe des genres, Wikidata, Wikipédia.

En parallèle, côté exploitation : copie hors site dès qu'un compte de stockage existe, et test
du disque de sauvegarde sur un port USB natif.
