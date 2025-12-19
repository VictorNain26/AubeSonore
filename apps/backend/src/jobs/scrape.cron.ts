import { handleSpotifyScrape } from '@/services/spotifyService.js';

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

export async function runScrapeCronJob(): Promise<void> {
  console.log('[CRON] 🔎 Début de la tâche de scraping HypeMachine');

  try {
    await handleSpotifyScrape(fakeAdmin, logger);
    console.log('[CRON] ✅ Scraping terminé avec succès.');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] ❌ Erreur pendant le scraping (non capturée dans logger) :', errorMessage);
  }
}
