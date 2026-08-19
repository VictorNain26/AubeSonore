# Runbook — remonter la radio depuis zéro

Ordre de remontage : **AzuraCast → pipeline → application web**. Les deux derniers
consomment le premier ; l'inverse n'est jamais vrai.

Ce fichier vit ici parce qu'AzuraCast est la seule brique qui ne sache pas se
reconstruire seule depuis un dépôt public.

## Ce qu'il faut avoir sauvegardé

| Élément | Où il vit | Versionné | Sans lui |
|---|---|---|---|
| `docker-compose.yml`, `.env.example` | ce dépôt | oui | rien ne redémarre |
| `azuracast.env` (dont `MYSQL_PASSWORD`) | hors git | non — sauvegarde | base inaccessible |
| `.env` | hors git | non — voir `.env.example` | ports par défaut, collisions |
| `stations/` (média, config station) | disque local | non — sauvegarde | catalogue perdu |
| Base MariaDB | volume Docker | non — sauvegarde AzuraCast | métadonnées, comptes, playlists |

`scripts/backup-config.sh` copie les fichiers de configuration (dont les secrets)
hors du NVMe. Les médias et la base ont leurs propres sauvegardes.

## 1. AzuraCast

```bash
cd ~/radio/azuracast
cp .env.example .env                  # ajuster les ports si la machine a changé
# restaurer azuracast.env depuis la sauvegarde (il contient MYSQL_PASSWORD)
# restaurer stations/ depuis la sauvegarde (média + config station)
docker compose up -d
```

Vérifier : l'UI répond sur le port `AZURACAST_HTTP_PORT`, la station diffuse.
Restaurer ensuite la base via l'outil de restauration d'AzuraCast, puis
régénérer une clé d'API — les clés ne survivent pas à une restauration partielle.

Points à ne pas rejouer de travers :
- `stations/` doit appartenir à `AZURACAST_PUID:AZURACAST_PGID`, sinon le
  pipeline ne peut plus lire ce que le conteneur écrit.
- Le média reste sur SSD. Sur disque mécanique, les rattrapages de latence
  Liquidsoap produisent des coupures audibles.
- `AUTO_ASSIGN_PORT_MAX` (dans `azuracast.env`) doit rester cohérent avec la
  plage réellement publiée par `docker-compose.yml`.

## 2. Pipeline

```bash
git clone <dépôt pipeline> ~/radio/pipeline && cd ~/radio/pipeline
./scripts/setup.sh                    # dépendances système + Python + modèles
cp .env.example .env                  # y remettre la clé d'API AzuraCast régénérée
python3 scripts/setup_playlists.py    # recrée les playlists de zones
./scripts/setup_systemd.sh            # installe et active les timers
```

Le pipeline se réaligne seul sur AzuraCast au premier run : sa base SQLite n'est
qu'un cache, AzuraCast fait autorité sur ce qui existe réellement à l'antenne.

## 3. Application web

```bash
git clone <dépôt aubesonore> ~/radio/aubesonore && cd ~/radio/aubesonore
cp .env.example .env                  # secrets d'auth, SMTP, VAPID, base
docker compose up -d --build
# installer les timers de déploiement et de sauvegarde (voir scripts/systemd/)
```

Restaurer PostgreSQL depuis le dump le plus récent **dans une base jetable
d'abord** — vérifier qu'il se lit avant de le passer sur la production.

## Vérifier que tout est remonté

```bash
docker ps                                   # azuracast, aubesonore-{db,backend,frontend}
systemctl --user list-timers                # 4 timers attendus, aucun doublon
cd ~/radio/pipeline && python3 -m pytest tests/ -q
```

Le vrai test de bout en bout reste un run de pipeline complet : il touche
l'API AzuraCast, le disque média et la base SQLite d'un seul coup.
