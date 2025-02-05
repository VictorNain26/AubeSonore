// --- Déclarations globales pour Bun ---
declare global {
  const Bun: {
    env: { [key: string]: string };
    serve(options: {
      port: number;
      fetch(req: Request): Response | Promise<Response>;
    }): void;
    spawn(
      cmd: string[],
      options?: Record<string, any>
    ): {
      stdout: ReadableStream<Uint8Array> | null;
      stderr: ReadableStream<Uint8Array> | null;
      exited: Promise<number>;
    };
  };
}
export {};

// --- Imports ---
import { mkdir, access, constants } from "fs/promises";
import path from "path";
import axios from "axios";

// --- Chargement des variables d'environnement ---
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  PLAYLIST_PATH,
  COOKIE_FILE,
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

const port: number = Number(PORT);

// --- Cache du token Spotify ---
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// --- Interfaces ---
interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
}

interface SpotifyPlaylist {
  name: string;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyPlaylistResponse {
  items: SpotifyPlaylist[];
}

// --- Fonctions Utilitaires ---

function getSafeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

/**
 * Exécute une commande via Bun.spawn en forçant la redirection des flux stdout et stderr.
 * Pour lire ces flux, on utilise `new Response(flux).text()` qui convertit le ReadableStream en texte.
 */
async function runCommand(
  cmd: string[],
  options: Record<string, any> = {}
): Promise<string> {
  try {
    const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;
    // Convertir le flux en texte via new Response(...)
    const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
    const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";
    
    if (stderrText.trim().length > 0) {
      throw new Error(stderrText.trim());
    }
    return stdoutText.trim();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Erreur d'exécution de la commande "${cmd.join(" ")}": ${err.message}`);
  }
}

async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  try {
    const response = await axios.post<SpotifyTokenResponse>(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: SPOTIFY_CLIENT_ID!, // L'opérateur ! garantit que la variable n'est pas undefined
        client_secret: SPOTIFY_CLIENT_SECRET!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    cachedToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (error: unknown) {
    console.error("Erreur lors de la demande du token Spotify:", error);
    throw new Error("Impossible de récupérer un token Spotify.");
  }
}

async function getOurMusicPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  try {
    const response = await axios.get<SpotifyPlaylistResponse>(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.data.items) {
      throw new Error("Structure inattendue des données reçues de Spotify.");
    }

    return response.data.items.filter((playlist) =>
      playlist.name.toLowerCase().includes("ourmusic")
    );
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des playlists Spotify:", error);
    throw new Error("Impossible de récupérer les playlists Spotify.");
  }
}

async function createPlaylistDirectory(playlist: SpotifyPlaylist): Promise<string> {
  const playlistDirPath: string = path.join(PLAYLIST_PATH, getSafeName(playlist.name));
  try {
    await access(playlistDirPath, constants.F_OK);
    console.log(`Dossier existant pour '${playlist.name}'`);
  } catch {
    await mkdir(playlistDirPath, { recursive: true });
    console.log(`Dossier créé pour '${playlist.name}'`);
  }
  return playlistDirPath;
}

async function createSyncFile(playlist: SpotifyPlaylist, playlistDirPath: string): Promise<string> {
  const syncFilePath: string = path.join(
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
      console.log(`Fichier de synchronisation créé pour '${playlist.name}': ${output}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `Erreur lors de la création du fichier de synchronisation pour '${playlist.name}':`,
        errMsg
      );
    }
  }
  return syncFilePath;
}

async function syncPlaylistFile(syncFilePath: string, playlistDirPath: string): Promise<void> {
  const cmd = ["spotdl", "sync", syncFilePath, "--cookie-file", COOKIE_FILE];
  try {
    const output = await runCommand(cmd, { cwd: playlistDirPath });
    console.log(`Synchronisation réussie pour '${syncFilePath}': ${output}`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Erreur lors de la synchronisation du fichier '${syncFilePath}':`, errMsg);
  }
}

async function syncPlaylists(): Promise<void> {
  try {
    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);
    if (playlists.length === 0) {
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
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Erreur lors de la synchronisation des playlists:", errMsg);
  }
}

// --- Démarrage du serveur Bun ---
try {
  Bun.serve({
    port,
    fetch(req: Request): Response | Promise<Response> {
      const url = new URL(req.url);
      if (url.pathname === "/playlists_sync") {
        // Lancer l'opération de synchronisation (fire and forget)
        syncPlaylists().catch((error: unknown) =>
          console.error(
            "Erreur asynchrone dans syncPlaylists:",
            error instanceof Error ? error.message : String(error)
          )
        );
        return new Response(
          JSON.stringify({ message: "Synchronisation lancée." }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',  // Assurez-vous que l'origin est correct
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        );
      }
      return new Response("Not Found", { status: 404 });
    },
  });
  console.log(`Serveur Bun en écoute sur le port ${port}`);
} catch (error: unknown) {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error("Erreur lors du démarrage du serveur Bun:", errMsg);
}
