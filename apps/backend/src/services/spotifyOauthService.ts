import axios from 'axios';
import { env } from '@/config/env.js';

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
  'user-read-private',
].join(' ');

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export function getSpotifyAuthorizeURL(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: Bun.env.SPOTIFY_CLIENT_ID as string,
    redirect_uri: `${env.BACKEND_BASE_URL}/api/spotify/callback`,
    scope: SCOPES,
    state,
  });

  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${env.BACKEND_BASE_URL}/api/spotify/callback`,
    client_id: Bun.env.SPOTIFY_CLIENT_ID as string,
    client_secret: Bun.env.SPOTIFY_CLIENT_SECRET as string,
  });

  const res = await axios.post<SpotifyTokenResponse>(SPOTIFY_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return res.data;
}
