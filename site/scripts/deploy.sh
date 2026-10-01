#!/usr/bin/env bash
# Promotes origin/master onto the running stack when it moves. Driven by
# aubesonore-deploy.timer; safe to run by hand.
#
# The repository is the whole radio (~/radio): site/, pipeline/ and azuracast/.
# Fast-forwarding it also deploys the pipeline code, which the weekly pass loads
# from this checkout; the site containers are only rebuilt when site/ changed.
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/radio}"
cd "$REPO_DIR"

# The weekly pass imports its code from pipeline/ at each step: never move the
# tree under it. The next timer run promotes once the pass is over.
if systemctl --user is-active --quiet radio-weekly.service; then
  echo "radio-weekly is running, deferring the deploy"
  exit 0
fi

current=$(git rev-parse HEAD)
target=$(git ls-remote origin refs/heads/master | cut -f1)

if [ -z "$target" ]; then
  echo "cannot reach origin, leaving $current in place"
  exit 1
fi

if [ "$current" = "$target" ]; then
  exit 0
fi

git fetch --quiet origin master
target=$(git rev-parse origin/master)

# Comparing SHAs is not enough: once HEAD carries an unpushed local commit it
# can never equal origin/master, so every run saw itself behind, `git merge
# --ff-only` answered "Already up to date." with exit 0, and `docker compose up
# --build` ran again every 2.5 minutes (103 useless deploys in three hours on
# 2026-08-19). The real question is whether origin/master is already in HEAD.
if git merge-base --is-ancestor "$target" HEAD; then
  echo "origin/master (${target:0:8}) already in HEAD (${current:0:8}), nothing to promote"
  exit 0
fi

echo "deploying ${current:0:8} -> ${target:0:8}"

# drizzle push is manual and can drop columns, so a schema change must not ride
# in on an unattended deploy: the new code would boot against the old tables.
# HEAD only moves once the gate opens, so diffing HEAD against the target would
# block forever: the operator records the schema.ts blob they pushed instead.
schema=site/apps/backend/src/db/schema.ts
running_schema=$(git rev-parse -q --verify "HEAD:$schema" || echo absent)
target_schema=$(git rev-parse -q --verify "$target:$schema" || echo absent)
applied_schema=$(git config --get aubesonore.appliedSchema || true)
if [ "$target_schema" != "$running_schema" ] && [ "$target_schema" != "$applied_schema" ]; then
  echo "schema.ts changed — apply 'bun db:push' by hand from ${target:0:8}, then:"
  echo "  git -C $REPO_DIR config aubesonore.appliedSchema $target_schema"
  echo "  systemctl --user start aubesonore-deploy"
  exit 1
fi

git merge --ff-only "$target"

if git diff --quiet "$current" "$target" -- site/; then
  echo "promoted ${target:0:8} (no change under site/, containers left as they are)"
  exit 0
fi

cd site
docker compose up -d --build --remove-orphans

deadline=$((SECONDS + 300))
while true; do
  pending=""
  for cid in $(docker compose ps -q); do
    health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid")
    [ -z "$health" ] && continue
    [ "$health" = "healthy" ] && continue
    pending="$pending $(docker inspect -f '{{.Name}}' "$cid")=$health"
  done

  if [ -z "$pending" ]; then
    echo "deployed ${target:0:8}, all healthchecks green"
    break
  fi

  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "deployed ${target:0:8} but unhealthy after 300s:$pending"
    exit 1
  fi

  sleep 5
done

docker image prune -f --filter "until=72h" >/dev/null
