import { handleSpotifySyncById } from '../services/spotifyService.js';

interface FakeAdmin {
  id: string;
  role: string;
  email: string;
}

interface LoggerPayload {
  message?: string;
  error?: string;
}

const fakeAdmin: FakeAdmin = { id: 'admin-script', role: 'admin', email: 'admin@ourmusic.fr' };

const playlistId: string | undefined = process.argv[2]; // récupère l'argument passé en CLI

if (!playlistId) {
  console.error('❌ Veuillez fournir un playlistId en argument');
  console.error('Exemple: bun run src/scripts/sync-by-id.ts 3Zhmnqlz2tqkzyoN2qJD3a');
  process.exit(1);
}

function consoleLogger(payload: LoggerPayload): void {
  if (payload.message) {
    console.log('ℹ️', payload.message);
  }
  if (payload.error) {
    console.error('❌', payload.error);
  }
}

(async (): Promise<void> => {
  try {
    await handleSpotifySyncById(fakeAdmin, consoleLogger, playlistId);

    console.log('✅ Synchronisation terminée pour la playlist', playlistId);
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur de synchronisation :', errorMessage);
    process.exit(1);
  }
})();
