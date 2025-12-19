import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
  cleanupSpotdlFiles,
  checkSpotdlInstalled,
} from '../services/spotifyService';
import { auth } from '../lib/auth/index';


interface SpotifyVersionResponse {
  version: string | null;
}


export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  .resolve(async ({ error, request: { headers } }) => {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return error(401, 'Unauthorized');
    }
    return { user: session.user, session: session.session };
  })

  // 🎯 Scraper automatiquement plusieurs genres
  .get('/scrape', ({ user }) => createSSEStream((send: any) => handleSpotifyScrape(user, send)))

  // 🔁 Synchroniser toutes les playlists "OurMusic"
  .get('/sync', ({ user }) => createSSEStream((send: any) => handleSpotifySyncAll(user, send)))

  // 🎵 Synchroniser une playlist spécifique par ID
  .get('/sync/:id', ({ user, params }) => createSSEStream((send: any) => handleSpotifySyncById(user, send, params.id)))

  // 🔍 Vérifier que spotDL est installé
  .get('/spotdl/version', async (): Promise<SpotifyVersionResponse> => {
    const version = await checkSpotdlInstalled();
    return { version };
  })

  // 🧹 Nettoyer les fichiers .spotdl et .temp
  .get('/spotdl/cleanup', () => createSSEStream((send: any) => cleanupSpotdlFiles(send)));
