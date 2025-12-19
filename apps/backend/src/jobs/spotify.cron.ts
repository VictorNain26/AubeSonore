import { handleSpotifySyncAll } from '@/services/spotifyService.js';

interface FakeAdmin {
  id: string;
  role: string;
  email: string;
}

interface LoggerPayload {
  message?: string;
  error?: string;
}

const fakeAdmin: FakeAdmin = { id: 'admin-cron', role: 'admin', email: 'admin@ourmusic.fr' };

const logger = (payload: LoggerPayload): void => {
  if (payload.message) {
    console.log('ℹ️', payload.message);
  }
  if (payload.error) {
    console.error('❌', payload.error);
  }
};

export async function runSpotifyCronSync(): Promise<void> {
  console.log('[CRON] 🔁 Début de la tâche de synchronisation Spotify');

  try {
    await handleSpotifySyncAll(fakeAdmin, logger);
    console.log('[CRON] ✅ Synchronisation terminée avec succès.');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      '[CRON] ❌ Erreur pendant la synchronisation (non capturée dans logger) :',
      errorMessage,
    );
  }
}
