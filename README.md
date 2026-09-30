# AubeSonore — goût et découverte

Pipeline de découverte de la webradio [AubeSonore](https://radio.aubesonore.fr) : trouver des
titres dans la couleur de la bibliothèque Plex de Victor.

```
Plex (bibliothèque) ──► rapprochement Deezer ──► graines
                                                   │
             Deezer related ∩ Last.fm similar ◄────┘
                          │
                 titres des voisins (extraits 30 s)
                          │
        empreinte Discogs-EffNet ──► régression logistique ──► tiers retenu
                                           ▲
                   bibliothèque + votes de Victor (page de vote)
```

- **Goût.** Positifs : les titres de la bibliothèque et les « oui » ; négatifs : les « non » et
  quelques artistes de démarrage (`config/negatives.toml`), sous-pondérés.
- **Découverte.** 15 graines par semaine, tirées selon l'écoute ; un voisin doit être confirmé
  par Deezer et par Last.fm.
- **Mesure.** 20 votes par semaine : 10 d'examen tirés au hasard parmi les retenus, qui jugent
  le modèle, et 10 de leçon, près de la coupure, qui l'entraînent.

Réglages : `config/editorial.toml`. Exploitation : `docs/exploitation.md`. Conception :
`docs/superpowers/specs/`, mesures et décisions : `docs/superpowers/research/`.

Modèle d'empreinte : [Discogs-EffNet](https://essentia.upf.edu/models.html) (MTG, Universitat
Pompeu Fabra), licence CC BY-NC-SA 4.0 ; AubeSonore est non commerciale.
