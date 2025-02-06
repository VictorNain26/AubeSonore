import { mkdir, access, constants, stat } from "fs/promises";
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

// Vérification des variables Spotify
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID) {
  throw new Error(
    "Les variables d'environnement Spotify (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_USER_ID) doivent être définies."
  );
}
// Vérification des chemins
if (!PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error(
    "Les variables d'environnement PLAYLIST_PATH et COOKIE_FILE doivent être définies."
  );
}

const port = Number(PORT) || 3000;

let cachedToken = null;
let tokenExpiry = 0;

// -----------------------------------------------------------------------------
// Fonctions utilitaires
// -----------------------------------------------------------------------------
function getSafeName(name) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

/**
 * Exécute une commande shell, renvoie stdout si OK, lance une erreur sinon.
 */
async function runCommand(cmd, options = {}) {
  const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
  await proc.exited;

  const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
  const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";

  if (stderrText.trim()) {
    throw new Error(stderrText.trim());
  }
  return stdoutText.trim();
}

// -----------------------------------------------------------------------------
// Gestion du token Spotify
// -----------------------------------------------------------------------------
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
    // Marge de 60s avant expiration
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;

    return cachedToken;
  } catch (error) {
    console.error("Erreur lors de la demande du token Spotify:", error);
    throw new Error("Impossible de récupérer un token Spotify.");
  }
}

// -----------------------------------------------------------------------------
// Récupération des playlists Spotify contenant "ourmusic"
// -----------------------------------------------------------------------------
async function getOurMusicPlaylists(token) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.data.items) {
      throw new Error("Structure inattendue des données reçues de Spotify.");
    }

    // Filtrer celles qui contiennent "ourmusic"
    return response.data.items.filter((playlist) =>
      playlist.name.toLowerCase().includes("ourmusic")
    );
  } catch (error) {
    console.error("Erreur lors de la récupération des playlists Spotify:", error);
    throw new Error("Impossible de récupérer les playlists Spotify.");
  }
}

// -----------------------------------------------------------------------------
// Création du dossier local pour chaque playlist
// -----------------------------------------------------------------------------
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

/**
 * 1) Création du fichier de synchronisation
 *    -> spotdl sync [URL] --save-file [fichier]
 */
async function createSyncFile(playlist, playlistDirPath) {
  const syncFilePath = path.join(
    playlistDirPath,
    `${getSafeName(playlist.name)}.sync.spotdl`
  );

  // On recrée systématiquement le fichier de sync,
  // afin d'éviter qu'il soit corrompu ou invalide.
  // doc: "spotdl sync [query] --save-file [filename]"
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

  return syncFilePath;
}

/**
 * 2) Synchronisation (téléchargement) via "spotdl sync [fichier]"
 */
async function syncPlaylistFile(syncFilePath, playlistDirPath) {
  // doc: "spotdl sync [fileName]"
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

// -----------------------------------------------------------------------------
// Logique principale
// -----------------------------------------------------------------------------
async function syncEverything() {
  try {
    // 1) Récupération du token
    const token = await getSpotifyAccessToken();
    // 2) Récupération des playlists "ourmusic"
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      console.log("Aucune playlist 'ourmusic' trouvée.");
      return;
    }

    // 3) Pour chaque playlist
    await Promise.all(
      playlists.map(async (playlist) => {
        // a) Créer le dossier local
        const playlistDirPath = await createPlaylistDirectory(playlist);
        // b) Générer (ou regénérer) le fichier .sync.spotdl
        const syncFilePath = await createSyncFile(playlist, playlistDirPath);
        // c) Lancer la synchro (téléchargement)
        await syncPlaylistFile(syncFilePath, playlistDirPath);
      })
    );

    console.log("Toutes les playlists 'ourmusic' ont été synchronisées avec succès !");
  } catch (error) {
    console.error("Erreur lors de la synchronisation globale :", error);
  }
}

// -----------------------------------------------------------------------------
// Serveur Bun
// -----------------------------------------------------------------------------
try {
  Bun.serve({
    port,
    // Désactiver ou augmenter le timeout pour éviter "request timed out after 10 seconds"
    idleTimeout: 0,

    async fetch(req) {
      const url = new URL(req.url);

      // Gérer CORS (OPTIONS)
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

      // Endpoint /playlists_sync pour déclencher la synchro
      if (url.pathname === "/playlists_sync") {
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

      // Sinon, 404
      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Serveur Bun démarré et à l'écoute sur le port ${port}`);
} catch (error) {
  console.error("Erreur lors du démarrage du serveur Bun:", error);
}
