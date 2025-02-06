import { mkdir, access, constants, stat } from "fs/promises";
import path from "path";
import axios from "axios";

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  PLAYLIST_PATH,
  COOKIE_FILE,
  DOCKER_BUN_CONTAINER_NAME = "ourmusic-backend",
  DOCKER_OTHER_CONTAINER_NAME = "azuracast",
  SOURCE_MP3_PATH = "/app/music",
  DESTINATION_MP3_PATH = "/var/azuracast/stations/ourmusic/media",
  PORT = "3000",
} = Bun.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID) {
  throw new Error(
    "Les variables d'environnement Spotify (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_USER_ID) doivent être définies."
  );
}
if (!PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error(
    "Les variables d'environnement PLAYLIST_PATH et COOKIE_FILE doivent être définies."
  );
}

const port = Number(PORT);

let cachedToken = null;
let tokenExpiry = 0;

function getSafeName(name) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

async function runCommand(cmd, options = {}) {
  try {
    const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
    await proc.exited;

    const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
    const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";

    if (stderrText.trim().length > 0) {
      throw new Error(stderrText.trim());
    }
    return stdoutText.trim();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Erreur d'exécution de la commande "${cmd.join(" ")}": ${err.message}`);
  }
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
    // On prend une marge de 60s avant l'expiration réelle
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;

    return cachedToken;
  } catch (error) {
    console.error("Erreur lors de la demande du token Spotify:", error);
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
      throw new Error("Structure inattendue des données reçues de Spotify.");
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
  const playlistDirPath = path.join(PLAYLIST_PATH, getSafeName(playlist.name));
  try {
    await access(playlistDirPath, constants.F_OK);
    console.log(`Dossier existant pour '${playlist.name}'`);
  } catch {
    await mkdir(playlistDirPath, { recursive: true });
    console.log(`Dossier créé pour '${playlist.name}'`);
  }
  return playlistDirPath;
}

async function createSyncFile(playlist, playlistDirPath) {
  const syncFilePath = path.join(
    playlistDirPath,
    `${getSafeName(playlist.name)}.sync.spotdl`
  );

  try {
    await access(syncFilePath, constants.F_OK);
    console.log(`Fichier de synchronisation déjà existant pour '${playlist.name}'`);
  } catch {
    const cmd = [
      "spotdl",
      "sync",
      playlist.external_urls.spotify,
      "--save-file",
      syncFilePath,
      "--cookie-file",
      COOKIE_FILE,
    ];
    try {
      const output = await runCommand(cmd);
      console.log(`Fichier de synchronisation créé pour '${playlist.name}':\n${output}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Erreur lors de la création du fichier de synchronisation pour '${playlist.name}':`, msg);
    }
  }

  return syncFilePath;
}

async function syncPlaylistFile(syncFilePath, playlistDirPath) {
  const cmd = [
    "spotdl",
    "sync",
    syncFilePath,
    "--cookie-file",
    COOKIE_FILE,
  ];

  try {
    const output = await runCommand(cmd, { cwd: playlistDirPath });
    console.log(`Synchronisation réussie pour '${syncFilePath}':\n${output}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Erreur lors de la synchronisation du fichier '${syncFilePath}':`, msg);
  }
}

async function isYouTubeCookiesExpired() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  try {
    const stats = await stat(COOKIE_FILE);
    const now = Date.now();

    if (now - stats.mtimeMs > ONE_DAY_MS) {
      return true;
    }
    return false;
  } catch (err) {
    return true;
  }
}

async function createYouTubeCookies() {
  console.log("Création ou mise à jour du fichier de cookies YouTube…");

  const cmd = [
    "yt-dlp",
    "--cookies-from-browser",
    "chromium",
    "--cookies",
    COOKIE_FILE, // ex: "/app/music/youtube_cookies.txt"
  ];

  try {
    const output = await runCommand(cmd);
    console.log("Fichier de cookies YouTube créé ou mis à jour :", output);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Erreur lors de la création des cookies YouTube:", errMsg);
    throw error;
  }
}

async function copyMp3ToAzuraCast() {
  console.log(
    `Copie des MP3 depuis ${DOCKER_BUN_CONTAINER_NAME}:${SOURCE_MP3_PATH} ` +
    `vers ${DOCKER_OTHER_CONTAINER_NAME}:${DESTINATION_MP3_PATH} ...`
  );

  const cmd = [
    "docker", "cp",
    `${DOCKER_BUN_CONTAINER_NAME}:${SOURCE_MP3_PATH}`,
    `${DOCKER_OTHER_CONTAINER_NAME}:${DESTINATION_MP3_PATH}`
  ];

  try {
    const output = await runCommand(cmd);
    console.log("Fichiers MP3 copiés avec succès ! Sortie :", output);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Erreur lors du docker cp :", errMsg);
    throw error;
  }
}

async function syncEverything() {
  try {
    const cookieExpired = await isYouTubeCookiesExpired();
    if (cookieExpired) {
      console.log("Cookies YouTube expirés ou manquants, on les recrée.");
      await createYouTubeCookies();
    } else {
      console.log("Cookies YouTube encore valides, pas de recréation nécessaire.");
    }

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      console.log("Aucune playlist 'ourmusic' trouvée.");
      return;
    }

    await Promise.all(
      playlists.map(async (playlist) => {
        const playlistDirPath = await createPlaylistDirectory(playlist);
        const syncFilePath = await createSyncFile(playlist, playlistDirPath);
        await syncPlaylistFile(syncFilePath, playlistDirPath);
      })
    );

    console.log("Toutes les playlists 'ourmusic' ont été synchronisées avec succès !");

    await copyMp3ToAzuraCast();
    console.log("Copie vers AzuraCast terminée !");
  } catch (error) {
    console.error("Erreur lors de la synchronisation globale :", error);
  }
}

try {
  Bun.serve({
    port: 3000,
    // On rend la méthode "fetch" asynchrone :
    async fetch(req) {
      const url = new URL(req.url);

      // Gérer les requêtes OPTIONS pour CORS
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "https://ourmusic.fr", 
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      }

      if (url.pathname === "/playlists_sync") {
        // On lance ici la synchronisation :
        try {
          await syncEverything();
          return new Response(
            JSON.stringify({ message: "Synchronisation terminée !" }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://ourmusic.fr",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
              }
            }
          );
        } catch (error) {
          console.error("Erreur lors de la synchronisation :", error);
          return new Response(
            JSON.stringify({ error: error.message || "Erreur inconnue" }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://ourmusic.fr",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
              }
            }
          );
        }
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Serveur Bun démarré et à l'écoute sur le port ${port}`);
} catch (error) {
  console.error("Erreur lors du démarrage du serveur Bun:", error);
}


