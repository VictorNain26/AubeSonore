# Runbook — remonter la radio depuis zéro

Ordre de remontage : **AzuraCast → pipeline → application web**. Les deux derniers
consomment le premier ; l'inverse n'est jamais vrai. Les trois vivent dans un seul
dépôt, cloné une fois :

```bash
git clone https://github.com/VictorNain26/aubesonore.git ~/aubesonore
loginctl enable-linger                # les unités systemd tournent sans session ouverte
```

Ce fichier vit ici parce qu'AzuraCast est la seule brique qui ne sache pas se
reconstruire seule depuis un dépôt public.

## Ce qu'il faut avoir sauvegardé

| Élément | Où il vit | Versionné | Sans lui |
|---|---|---|---|
| `docker-compose.yml`, `.env.example` | ce dépôt | oui | rien ne redémarre |
| `azuracast.env` (dont `MYSQL_PASSWORD`) | hors git | non — sauvegarde | base inaccessible |
| `.env` | hors git | non — voir `.env.example` | ports par défaut, collisions |
| `stations/` (média) | NVMe uniquement | **aucune sauvegarde** | catalogue perdu, sans recours |
| `stations/*/config/` | NVMe | inclus dans la sauvegarde AzuraCast | station à reconfigurer |
| Base MariaDB | volume Docker | sauvegarde AzuraCast quotidienne | métadonnées, comptes, playlists |

`scripts/backup-config.sh` copie la configuration et les secrets hors du NVMe.
La base a sa propre sauvegarde quotidienne (~2 Mo, sur un disque distinct).

**Les médias n'ont délibérément aucune sauvegarde** (décision d'août 2026). La
perte du NVMe signifie donc : la base se restaure, mais elle référencera des
fichiers qui n'existent plus. Le rattrapage consiste à laisser le pipeline
reconstituer une bibliothèque — ce ne seront pas les mêmes morceaux. Si cet
arbitrage change, la sauvegarde à écrire est une copie de `stations/*/media`
vers un disque distinct ; sans elle, ce tableau reste la vérité.

## 1. AzuraCast

```bash
cd ~/aubesonore/azuracast
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
cd ~/aubesonore/pipeline
uv sync
# sockseek et rsgain : binaires figés dans ~/.local/bin (versions et sha256 : docs/vision.md)
# ffmpeg et fpcalc (libchromaprint-tools) : apt ; modèle EffNet dans models/ (radio/signals/audio.py)
cp .env.example .env                  # y remettre la clé d'API AzuraCast régénérée
for u in deploy/systemd/*; do systemctl --user link "$PWD/$u"; done
systemctl --user daemon-reload
systemctl --user enable --now radio-weekly.timer radio-remind.timer radio-backup.timer radio-grille.timer radio-votes.service
cd deploy/gatus && ln -s ../../.env .env && docker compose up -d
```

Restaurer `data/radio.db` et `data/models/` depuis la copie la plus récente de
`/media/plex/.backups/radio` (`radio-backup`) : la base porte les votes, qui
n'existent nulle part ailleurs.

## 3. Application web

```bash
cd ~/aubesonore/site
cp .env.example .env                  # secrets d'auth, SMTP, VAPID, base
docker compose up -d --build
ln -s ~/aubesonore/site/scripts/systemd/* ~/.config/systemd/user/
systemctl --user enable --now aubesonore-deploy.timer aubesonore-backup.timer
```

Restaurer PostgreSQL depuis le dump le plus récent de `/media/plex/.backups/aubesonore`
**dans une base jetable d'abord** — vérifier qu'il se lit avant de le passer sur la
production.

## Vérifier que tout est remonté

```bash
docker ps                                   # azuracast, gatus, aubesonore-{db,backend,frontend}
systemctl --user list-timers                # 6 timers : aubesonore-{backup,deploy}, radio-{backup,grille,remind,weekly}
systemctl --user is-active radio-votes      # page de vote ; 127.0.0.1:8040 répond 403 sans Cloudflare Access
cd ~/aubesonore/pipeline && .venv/bin/pytest -q -W error && .venv/bin/radio report
```

Le vrai test de bout en bout reste une passe `radio-weekly` complète : elle touche
l'API AzuraCast, le disque média et la base SQLite d'un seul coup.
