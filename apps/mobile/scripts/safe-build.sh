#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Safe EAS Build Script - Prevents duplicate builds
# Best Practice 2025: Always check for existing builds first
# ─────────────────────────────────────────────────────────────

set -e

PROFILE="${1:-preview}"
PLATFORM="${2:-android}"

echo "🔍 Checking for existing builds..."

# Check for builds in progress or queued
IN_PROGRESS=$(eas build:list --status=in-progress --platform="$PLATFORM" --limit=1 --non-interactive --json 2>/dev/null | grep -c '"id"' || echo "0")
IN_QUEUE=$(eas build:list --status=in-queue --platform="$PLATFORM" --limit=1 --non-interactive --json 2>/dev/null | grep -c '"id"' || echo "0")
NEW_BUILDS=$(eas build:list --status=new --platform="$PLATFORM" --limit=1 --non-interactive --json 2>/dev/null | grep -c '"id"' || echo "0")

TOTAL_ACTIVE=$((IN_PROGRESS + IN_QUEUE + NEW_BUILDS))

if [ "$TOTAL_ACTIVE" -gt 0 ]; then
  echo ""
  echo "⚠️  ATTENTION: Il y a déjà $TOTAL_ACTIVE build(s) en cours ou en attente!"
  echo ""
  eas build:list --platform="$PLATFORM" --limit=3 --non-interactive
  echo ""
  echo "❌ Build annulé pour éviter des coûts supplémentaires."
  echo ""
  echo "Options:"
  echo "  1. Attendre que le build actuel se termine"
  echo "  2. Annuler le build existant: eas build:cancel"
  echo "  3. Forcer un nouveau build: eas build --profile $PROFILE --platform $PLATFORM"
  exit 1
fi

echo "✅ Aucun build actif trouvé. Démarrage du build..."
echo ""

# Start the build
eas build --profile "$PROFILE" --platform "$PLATFORM" --non-interactive

echo ""
echo "🎉 Build lancé avec succès!"
