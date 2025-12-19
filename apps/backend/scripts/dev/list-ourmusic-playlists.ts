import { getSpotifyAccessToken, getOurMusicPlaylists } from '../spotify.js';

// Interface pour une playlist Spotify
interface SpotifyPlaylist {
  id: string;
  name: string;
}

(async (): Promise<void> => {
  try {
    console.log('🚀 Récupération des playlists OurMusic...');

    const token: string = await getSpotifyAccessToken();
    const playlists: SpotifyPlaylist[] = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      console.log('❌ Aucune playlist "OurMusic" trouvée.');
      process.exit(1);
    }

    console.log(`🎵 ${playlists.length} playlists trouvées :\n`);

    playlists.forEach((playlist: SpotifyPlaylist) => {
      console.log(`- 📋 Nom : ${playlist.name}`);
      console.log(`  🆔 ID  : ${playlist.id}\n`);
    });

    console.log('✅ Liste complète affichée.');
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur lors de la récupération des playlists :', errorMessage);
    process.exit(1);
  }
})();
