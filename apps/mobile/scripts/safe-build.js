#!/usr/bin/env node
/**
 * Safe EAS Build Script - Prevents duplicate builds
 *
 * Best Practice 2025: Always check for existing builds before starting a new one
 * This prevents wasted money on duplicate/concurrent builds.
 *
 * Usage:
 *   node scripts/safe-build.js [profile] [platform]
 *   npm run build:safe -- preview android
 */

const { execFileSync, spawn } = require('child_process');

const PROFILE = process.argv[2] || 'preview';
const PLATFORM = process.argv[3] || 'android';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function getEasCommand() {
  // On Windows, we need to use eas.cmd
  return process.platform === 'win32' ? 'eas.cmd' : 'eas';
}

function getActiveBuilds() {
  const statuses = ['in-progress', 'in-queue', 'new'];
  let totalActive = 0;
  const activeBuilds = [];
  const easCmd = getEasCommand();

  for (const status of statuses) {
    try {
      const result = execFileSync(
        easCmd,
        [
          'build:list',
          `--status=${status}`,
          `--platform=${PLATFORM}`,
          '--limit=5',
          '--non-interactive',
          '--json',
        ],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const builds = JSON.parse(result);
      if (Array.isArray(builds) && builds.length > 0) {
        totalActive += builds.length;
        activeBuilds.push(
          ...builds.map((b) => ({
            id: b.id?.substring(0, 8) || 'unknown',
            status: b.status,
            profile: b.buildProfile,
            createdAt: b.createdAt,
          }))
        );
      }
    } catch {
      // Status might not have any builds, that's fine
    }
  }

  return { totalActive, activeBuilds };
}

function formatBuildInfo(build) {
  const date = build.createdAt ? new Date(build.createdAt).toLocaleString('fr-FR') : 'N/A';
  return `  • ${build.id}... | ${build.status} | ${build.profile} | ${date}`;
}

async function main() {
  log('🔍', 'Vérification des builds en cours...', colors.cyan);
  console.log('');

  const { totalActive, activeBuilds } = getActiveBuilds();

  if (totalActive > 0) {
    log('⚠️', `ATTENTION: ${totalActive} build(s) actif(s) détecté(s)!`, colors.yellow);
    console.log('');

    console.log(colors.yellow + 'Builds actifs:' + colors.reset);
    activeBuilds.forEach((build) => {
      console.log(formatBuildInfo(build));
    });

    console.log('');
    log('❌', 'Build annulé pour éviter des coûts supplémentaires.', colors.red);
    console.log('');
    console.log('Options:');
    console.log('  1. Attendre que le build actuel se termine');
    console.log('  2. Annuler le build existant:');
    console.log(`     ${colors.cyan}eas build:cancel${colors.reset}`);
    console.log('  3. Forcer un nouveau build (non recommandé):');
    console.log(
      `     ${colors.cyan}eas build --profile ${PROFILE} --platform ${PLATFORM}${colors.reset}`
    );
    console.log('');

    process.exit(1);
  }

  log('✅', 'Aucun build actif. Démarrage du build...', colors.green);
  console.log('');
  console.log(`Profile: ${colors.cyan}${PROFILE}${colors.reset}`);
  console.log(`Platform: ${colors.cyan}${PLATFORM}${colors.reset}`);
  console.log('');

  // Start the build with live output (no shell needed)
  const easCmd = getEasCommand();
  const buildProcess = spawn(
    easCmd,
    ['build', '--profile', PROFILE, '--platform', PLATFORM, '--non-interactive'],
    {
      stdio: 'inherit',
    }
  );

  buildProcess.on('close', (code) => {
    console.log('');
    if (code === 0) {
      log('🎉', 'Build lancé avec succès!', colors.green);
    } else {
      log('💥', `Build échoué avec le code ${code}`, colors.red);
    }
    process.exit(code);
  });

  buildProcess.on('error', (err) => {
    log('💥', `Erreur: ${err.message}`, colors.red);
    process.exit(1);
  });
}

main();
