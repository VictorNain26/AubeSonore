# OurMusic Backend

OurMusic Backend is an API built with [Elysia](https://elysiajs.com/) and runs on [Bun](https://bun.sh/). It exposes various routes that connect the OurMusic application to Spotify and manage the tracks liked by users.

## Features

- Authentication via [BetterAuth](https://www.npmjs.com/package/better-auth)
- Manage track "likes" (add, remove, list)
- Synchronisation with Spotify playlists
- Scraping titles from HypeMachine
- Optional CRON jobs to automatically synchronise playlists and start scraping sessions
- SSE streams to follow the progress of long-running tasks

## Requirements

- [Bun](https://bun.sh/) installed locally
- Access to a PostgreSQL database
- A Spotify developer account to obtain API credentials

## Installation

```bash
bun install
```

Copy `.env.example` to `.env` and fill in all necessary environment variables:

```bash
cp .env.example .env
```

Important variables include:

- `DATABASE_URL` – PostgreSQL connection URL
- `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` – BetterAuth configuration
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_USER_ID`, `SPOTIFY_REFRESH_TOKEN`
- `PLAYLIST_PATH` and `COOKIE_FILE` for `spotdl`
- SMTP settings for sending emails
- `ENABLE_CRON` to activate scheduled tasks

## Running in development

```bash
bun run db:push   # run migrations
bun run start
```

A health endpoint is available at [http://localhost:3000/health](http://localhost:3000/health).

## Docker usage

A Docker image is provided:

```bash
docker build -t ourmusic-backend .
docker run --env-file .env -p 3000:3000 ourmusic-backend
```

Migrations are launched automatically via `entrypoint.sh` when the container starts.

## Helpful scripts

- `bun run seed:admin` – create an administrator account
- `bun run reset:all` – fully reset the database and spotDL files
- `bun run lint` – run ESLint over the entire project

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys the `master` branch to the configured VPS.

---

## License

This project is licensed under the [MIT License](LICENSE).
