// --- Imports ---
import fs from 'fs';
import path from 'path';
import axios from 'axios';
const { mkdir, access, constants } = fs.promises;

// --- Variables d'environnement ---
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  PLAYLIST_PATH,
  COOKIE_FILE,
  PORT = '3000',
} = Bun.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID || !PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error('Les variables d\'environnement nécessaires ne sont pas définies.');
}

const port = Number(PORT);
const MAX_CONCURRENT_DOWNLOADS = 2;

// --- Variables globales ---
let cachedToken = null;
let tokenExpiry = 0;

// --- Fonctions Utilitaires ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getSafeName(name) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
}

async function runCommand(cmd, options = {}) {
  try {
    const proc = Bun.spawn(cmd, { ...options, stdout: 'pipe', stderr: 'pipe' });
    const exitCode = await proc.exited;
    const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : '';
    const stderrText = proc.stderr ? await new Response(proc.stderr).text() : '';

    if (exitCode !== 0 || stderrText.trim().length > 0) {
      throw new Error(stderrText.trim() || `Exit code: ${exitCode}`);
    }
    return stdoutText.trim();
  } catch (error) {
    throw new Error(`Erreur d'exécution: "${cmd.join(' ')}" -> ${error.message}`);
  }
}

async function getSpotifyAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    cachedToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (error) {
    console.error('Erreur lors de la demande du token Spotify:', error);
    throw new Error('Impossible de récupérer un token Spotify.');
  }
}

async function getOurMusicPlaylists(token) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data.items.filter((playlist) =>
      playlist.name.toLowerCase().includes('ourmusic')
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des playlists Spotify:', error);
    throw new Error('Impossible de récupérer les playlists Spotify.');
  }
}

async function createPlaylistDirectory(playlist) {
  const playlistDirPath = path.join(PLAYLIST_PATH, getSafeName(playlist.name));
  try {
    await access(playlistDirPath, constants.F_OK);
  } catch {
    await mkdir(playlistDirPath, { recursive: true });
  }
  return playlistDirPath;
}

async function createSyncFile(playlist, playlistDirPath) {
  const syncFilePath = path.join(playlistDirPath, `${getSafeName(playlist.name)}.sync.spotdl`);

  try {
    await access(syncFilePath, constants.F_OK);
  } catch {
    const cmd = [
      'spotdl',
      'sync',
      playlist.external_urls.spotify,
      '--save-file',
      syncFilePath,
      '--cookie-file',
      COOKIE_FILE,
    ];
    await runCommand(cmd);
  }
  return syncFilePath;
}

async function syncPlaylistFile(syncFilePath, playlistDirPath) {
  const cmd = ['spotdl', 'sync', syncFilePath, '--cookie-file', COOKIE_FILE];
  await runCommand(cmd, { cwd: playlistDirPath });
}

async function syncPlaylists() {
  try {
    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);
    if (playlists.length === 0) {
      console.log('Aucune playlist "ourmusic" trouvée.');
      return;
    }

    let activeDownloads = 0;
    for (const playlist of playlists) {
      while (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
        console.log('Attente de téléchargement en cours...');
        await delay(5000);
      }

      activeDownloads++;
      const playlistDirPath = await createPlaylistDirectory(playlist);
      const syncFilePath = await createSyncFile(playlist, playlistDirPath);
      await syncPlaylistFile(syncFilePath, playlistDirPath);
      activeDownloads--;
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation des playlists:', error);
  }
}

// --- Démarrage du serveur Bun ---
Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/playlists_sync') {
      syncPlaylists().catch(console.error);
      return new Response(JSON.stringify({ message: 'Synchronisation lancée.' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`✅ Serveur Bun en écoute sur le port ${port}`);
