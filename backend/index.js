import * as fs from "fs/promises";
import path from "path";
import axios from "axios";

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  PLAYLIST_PATH,
  COOKIE_FILE,
  PORT,
  FIREFOX_FOLDER = "/app/mozilla/firefox",
  FIREFOX_PROFILE = "jixmpje9.default",
  RATE_LIMIT_MS = "5000",
} = Bun.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID) {
  throw new Error(
    "Les variables d'environnement Spotify doivent être définies. Vérifiez SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET et SPOTIFY_USER_ID."
  );
}

if (!PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error("Les variables d'environnement PLAYLIST_PATH et COOKIE_FILE doivent être définies.");
}

const port = Number(PORT) || 3000;
let cachedToken = null;
let tokenExpiry = 0;

function getCorsHeaders(req) {
  const origin = req.headers.get("Origin") || "https://ourmusic.fr";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath, fs.constants.F_OK);
    await fs.chmod(dirPath, 0o777);
  } catch {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o777 });
    console.log(`Dossier créé : ${dirPath}`);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(cmd, options = {}) {
  const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
  await proc.exited;
  const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
  const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";
  if (stderrText.trim()) {
    console.error(stderrText.trim());
    throw new Error(stderrText.trim());
  }
  return stdoutText.trim();
}

async function getSpotifyAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    cachedToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (error) {
    console.error("Erreur lors de l'obtention du token Spotify:", error);
    throw new Error("Impossible de récupérer un token Spotify.");
  }
}

async function getOurMusicPlaylists(token) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.data.items) throw new Error("Structure inattendue des données de Spotify.");
    return response.data.items.filter((playlist) =>
      playlist.name.toLowerCase().includes("ourmusic")
    );
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(
        `Utilisateur Spotify non trouvé ou playlists privées. Vérifiez SPOTIFY_USER_ID (${SPOTIFY_USER_ID}) et assurez-vous que les playlists sont publiques.`
      );
    }
    console.error("Erreur lors de la récupération des playlists Spotify:", error);
    throw new Error("Impossible de récupérer les playlists Spotify.");
  }
}

async function createPlaylistDirectory(playlist) {
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  const playlistDirPath = path.join(PLAYLIST_PATH, safeName);
  await ensureDirectoryExists(playlistDirPath);
  return playlistDirPath;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createSyncFile(playlist, playlistDirPath, sendEvent) {
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);
  const cmd = [
    "spotdl",
    "sync",
    playlist.external_urls.spotify,
    "--save-file",
    syncFilePath,
    "--output",
    playlistDirPath,
    "--cookie-file",
    COOKIE_FILE
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Fichier de synchronisation créé pour '${playlist.name}' : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la création du fichier de synchronisation pour '${playlist.name}' : ${err.message}` });
  }
  return syncFilePath;
}

// Fonction de synchronisation d'une playlist à partir d'un fichier de synchronisation existant
async function syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent) {
  const cmd = [
    "spotdl",
    "sync",
    syncFilePath,
    "--output",
    playlistDirPath,
    "--cookie-file",
    COOKIE_FILE
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Synchronisation réussie pour '${syncFilePath}' : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la synchronisation du fichier '${syncFilePath}' : ${err.message}` });
  }
}

// Fonction de création du cookie (inchangée)
async function createCookieFile(sendEvent) {
  const cookieAgeLimit = 24 * 60 * 60 * 1000; // 24h en ms
  try {
    const fileStats = await fs.stat(COOKIE_FILE);
    const age = Date.now() - fileStats.mtimeMs;
    if (age < cookieAgeLimit) {
      sendEvent({ message: "Le cookie est récent (< 24h), mise à jour non nécessaire." });
      return;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      sendEvent({ error: `Erreur lors de la vérification du cookie : ${error.message}` });
      throw error;
    }
  }
  const cookiesFromBrowserArg = `firefox:${FIREFOX_FOLDER}/${FIREFOX_PROFILE}`;
  const cmd = [
    "yt-dlp",
    "--cookies-from-browser",
    cookiesFromBrowserArg,
    "--cookies",
    COOKIE_FILE,
    "--skip-download",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ"
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Cookie créé avec succès : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la création du cookie : ${err.message}` });
  }
}

// Fonction principale de synchronisation avec rate limiting
async function syncEverything(sendEvent) {
  sendEvent({ message: "Début de la synchronisation" });
  
  // Création du cookie
  await createCookieFile(sendEvent);
  await ensureDirectoryExists("/root/.spotdl/temp");
  
  const token = await getSpotifyAccessToken();
  const playlists = await getOurMusicPlaylists(token);
  const total = playlists.length;
  if (total === 0) {
    sendEvent({ message: "Aucune playlist 'ourmusic' trouvée. Vérifiez l'ID utilisateur Spotify et la visibilité des playlists." });
    return;
  }
  let count = 0;
  for (const playlist of playlists) {
    const playlistDirPath = await createPlaylistDirectory(playlist);
    const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);
    
    if (await fileExists(syncFilePath)) {
      sendEvent({ message: `Le fichier de synchronisation pour '${playlist.name}' existe déjà. Lancement de la synchronisation.` });
      await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
    } else {
      sendEvent({ message: `Création du fichier de synchronisation pour '${playlist.name}'.` });
      await createSyncFile(playlist, playlistDirPath, sendEvent);
      await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
    }
    
    count++;
    sendEvent({ message: `Traitement de la playlist '${playlist.name}' terminé (${count}/${total}).` });
    // Délai entre chaque synchronisation pour limiter le débit
    await delay(Number(RATE_LIMIT_MS));
  }
  
  try {
    await runCommand(["chmod", "-R", "777", PLAYLIST_PATH]);
    sendEvent({ message: `Permissions 777 appliquées récursivement sur ${PLAYLIST_PATH}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de l'application des permissions : ${err.message}` });
  }
  sendEvent({ message: "Toutes les playlists ont été synchronisées avec succès !" });
}

Bun.serve({
  port,
  idleTimeout: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Endpoint SSE pour la synchronisation des playlists Spotify
    if (url.pathname === "/api/live/spotify/sse") {
      const headers = {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      };

      const stream = new ReadableStream({
        async start(controller) {
          // Envoi initial de connexion
          controller.enqueue(
            `data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`
          );
          const enqueue = controller.enqueue.bind(controller);
          // Heartbeat toutes les 30 secondes
          const heartbeat = setInterval(() => {
            enqueue(`data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`);
          }, 30000);

          function sendEvent(data) {
            controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);
          }

          try {
            await syncEverything(sendEvent);
          } catch (error) {
            sendEvent({ error: error.message });
          } finally {
            clearInterval(heartbeat);
            controller.close();
          }
        },
      });
      return new Response(stream, { headers });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});

console.log(`Serveur Bun démarré sur le port ${port}`);
