import { env } from '../config/env';

export interface NowPlayingTrack {
  sh_id: number;
  title: string;
  artist: string;
}

const NOWPLAYING_TIMEOUT_MS = 10_000;

export async function fetchNowPlaying(): Promise<NowPlayingTrack | null> {
  const url = `${env.AZURACAST_BASE_URL}/api/station/${env.AZURACAST_STATION_ID}/nowplaying`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': env.AZURACAST_API_KEY },
    signal: AbortSignal.timeout(NOWPLAYING_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`AzuraCast nowplaying error: ${response.status}`);
  }

  const payload: unknown = await response.json();
  const nowPlaying =
    Array.isArray(payload) && payload.length > 0
      ? (payload[0] as { now_playing?: unknown }).now_playing
      : undefined;
  if (typeof nowPlaying !== 'object' || nowPlaying === null) return null;

  const { sh_id, song } = nowPlaying as { sh_id?: unknown; song?: unknown };
  if (typeof sh_id !== 'number' || typeof song !== 'object' || song === null) return null;

  const { title, artist } = song as { title?: unknown; artist?: unknown };
  if (typeof title !== 'string' || typeof artist !== 'string') return null;

  return { sh_id, title, artist };
}
