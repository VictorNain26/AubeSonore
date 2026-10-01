# CLAUDE.md — AubeSonore (~/radio)

## What this repository is

One self-hosted webradio, AubeSonore, in a single repository cloned at `~/radio`
(GitHub `VictorNain26/AubeSonore`, branch `master`). Three pieces run side by side on one machine:

| Directory    | Role                                        | Stack                          |
| ------------ | ------------------------------------------- | ------------------------------ |
| `site/`      | Web app (listener site + API)               | pnpm, Turbo, Bun, React        |
| `pipeline/`  | Taste model, discovery, acquisition, antenne | Python 3.12, uv                |
| `azuracast/` | Broadcast server runtime                    | Docker — **config only** here  |

Until 2026-10-01 they were three repositories; the standalone `radio-pipeline` repository is
archived, its history kept under `pipeline/` (git subtree).

**Each piece has its own `CLAUDE.md`, and it is the authority for that piece**: commands,
conventions, invariants. Read it before touching anything there. This file covers only what spans
all three. `azuracast/RUNBOOK.md` covers rebuilding the whole system from nothing.

## Working in the repository

- One branch, one PR per change; a PR stays inside one piece unless the change truly spans them.
- **CI**: `.github/workflows/site.yml` and `pipeline.yml` run on every PR, with no path filter:
  their jobs are required checks on `master`.
- **Dependencies**: Renovate (`renovate.json`) covers pnpm, uv, GitHub Actions and Docker images.
- **Hooks**: husky lives in `site/.husky` (`prepare` runs `cd .. && husky site/.husky`). The
  commit message is checked by commitlint (Conventional Commits, English) for every commit,
  whatever the piece; the pre-push gate of the site only runs when `site/` changed.
- **Deploying is merging to `master`.** `aubesonore-deploy.timer` fast-forwards `~/radio`; it
  rebuilds the site containers only when `site/` changed, and never moves the tree while the
  radio's weekly pass (`radio-weekly.service`) runs, since that pass loads `pipeline/` code.
- Develop in a git worktree, never in `~/radio` itself: it is the production checkout.

## How the three fit together

AzuraCast is the hub. The other two never talk to each other.

```
   pipeline/ ──── uploads tracks into antenne/ (API) ────────► ┌───────────┐
                                                              │ AzuraCast │
                                                              └───────────┘
                                                                    ▲
                         site/ ──reads now-playing, history (never writes)
```

- The pipeline **owns the library**. Since the 2026-09 rewrite (v3) it reads Plex, finds
  candidates (neighbours of Victor's artists, plus fresh picks from Hype Machine and Deezer
  editors), learns from Victor's votes, downloads the retained tracks and publishes them to the
  `antenne/` folder of AzuraCast. Since the cutover of 2026-10-01 the station plays only the
  "AubeSonore" playlist bound to that folder. Sequencing is not built yet.
- The web app **owns the listener experience**: likes, multi-platform links, auth, push. It is a
  read-only consumer of the station and must stay that way.
- Any change that seems to need pipeline↔app coupling is a design smell — route it through
  AzuraCast, or reconsider.

## Documentation drifts faster than the system

Several docs in these repos predate a migration (AzuraCast used to run on a remote host, and both
repos moved under `~/radio`). Never trust a hostname, IP, port, or absolute path read from a
`.md` file or a script default. Confirm against the runtime before acting on it:

```bash
docker ps                      # what actually runs, and where
grep -E '^AZURACAST|^VITE_|^DATABASE' */.env */*/.env 2>/dev/null
systemctl --user list-timers   # what is actually scheduled
```

When this file disagrees with the running system, the system is right — correct the doc.

## Cross-cutting

- **Shared machine.** Many unrelated services run here. Before binding a port, scheduling heavy
  work, or moving data, check what else is running — the broadcast container is CPU-weighted to
  win against batch workloads for a reason.
- **Scheduling is systemd *user* timers**, not cron, and depends on lingering being enabled.
  Deploying AubeSonore is merging to `master`: `aubesonore-deploy.timer` promotes it.
- **Secrets are untracked `.env` files in all three pieces** (plus `azuracast/azuracast.env`), and the broadcast runtime also
  holds listener access logs. Keep all of it out of diffs, pastes, and issue reports.
- **Language**: commits are English Conventional Commits everywhere (commitlint). Documentation
  follows the piece: the pipeline and azuracast document in French, the site in English.
