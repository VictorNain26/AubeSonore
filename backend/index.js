import { mkdir, access, constants, chmod } from "fs/promises";
import path from "path";
import axios from "axios";

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  PLAYLIST_PATH,
  COOKIE_FILE,
  PORT,
} = Bun.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID) {
  throw new Error("Les variables d'environnement Spotify doivent être définies.");
}

if (!PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error("Les variables d'environnement PLAYLIST_PATH et COOKIE_FILE doivent être définies.");
}

const port = Number(PORT) || 3000;
let cachedToken = null;
let tokenExpiry = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ourmusic.fr",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

async function ensureDirectoryExists(dirPath) {
  try {
    await access(dirPath, constants.F_OK);
    await chmod(dirPath, 0o777);
  } catch {
    await mkdir(dirPath, { recursive: true, mode: 0o777 });
    console.log(`Dossier créé : ${dirPath}`);
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
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
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }
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
    if (!response.data.items) {
      throw new Error("Structure inattendue des données de Spotify.");
    }
    return response.data.items.filter((playlist) =>
      playlist.name.toLowerCase().includes("ourmusic")
    );
  } catch (error) {
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
    COOKIE_FILE,
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent(`Fichier de synchronisation créé pour '${playlist.name}': ${output}`);
  } catch (err) {
    sendEvent(`Erreur lors de la création du fichier de synchronisation pour '${playlist.name}': ${err.message}`);
  }
  return syncFilePath;
}

async function syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent) {
  const cmd = [
    "spotdl",
    "sync",
    syncFilePath,
    "--output",
    playlistDirPath,
    "--cookie-file",
    COOKIE_FILE,
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent(`Synchronisation réussie pour '${syncFilePath}': ${output}`);
  } catch (err) {
    sendEvent(`Erreur lors de la synchronisation du fichier '${syncFilePath}': ${err.message}`);
  }
}

async function syncEverything(sendEvent) {
  sendEvent("Début de la synchronisation");
  await ensureDirectoryExists("/root/.spotdl/temp");

  const token = await getSpotifyAccessToken();
  const playlists = await getOurMusicPlaylists(token);
  const total = playlists.length;

  if (total === 0) {
    sendEvent("Aucune playlist 'ourmusic' trouvée.");
    return;
  }

  let count = 0;
  for (const playlist of playlists) {
    const playlistDirPath = await createPlaylistDirectory(playlist);
    const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);

    if (await fileExists(syncFilePath)) {
      sendEvent(`Le fichier de synchronisation pour '${playlist.name}' existe déjà. Lancement de la synchronisation.`);
      await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
    } else {
      sendEvent(`Le fichier de synchronisation pour '${playlist.name}' n'existe pas. Création et synchronisation en cours.`);
      await createSyncFile(playlist, playlistDirPath, sendEvent);
      await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
    }

    count++;
    sendEvent(`Traitement de la playlist '${playlist.name}' terminé (${count}/${total}).`);
  }

  try {
    await runCommand(["chmod", "-R", "777", PLAYLIST_PATH]);
    sendEvent(`Permissions 777 appliquées récursivement sur ${PLAYLIST_PATH}`);
  } catch (err) {
    sendEvent("Erreur lors de l'application des permissions: " + err.message);
  }

  sendEvent("Toutes les playlists ont été synchronisées avec succès !");
}

Bun.serve({
  port,
  idleTimeout: 0,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/playlists_sync") {
      try {
        await syncEverything((msg) => console.log(msg));
        return new Response(
          JSON.stringify({ message: "Toutes les playlists ont été synchronisées avec succès !" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ message: "Erreur lors de la synchronisation: " + error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (url.pathname === "/sse-playlists-sync") {
      const stream = new ReadableStream({
        async start(controller) {
          function sendEvent(data) {
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          }

          try {
            await syncEverything(sendEvent);
          } catch (error) {
            sendEvent({ error: error.message });
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});

console.log(`Serveur Bun démarré sur le port ${port}`);
