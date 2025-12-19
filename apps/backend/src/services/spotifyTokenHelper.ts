import axios from 'axios';
import dayjs from 'dayjs';
import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';

interface SpotifyAccount {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export async function getFreshSpotifyAccessToken(account: SpotifyAccount): Promise<string> {
  // encore valide ?
  if (account.accessTokenExpiresAt && dayjs(account.accessTokenExpiresAt).isAfter(dayjs().add(2, 'minute'))) {
    return account.accessToken!;
  }

  // sinon on refresh
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken!,
    client_id: Bun.env.SPOTIFY_CLIENT_ID!,
    client_secret: Bun.env.SPOTIFY_CLIENT_SECRET!,
  });

  const { data }: { data: SpotifyTokenResponse } = await axios.post('https://accounts.spotify.com/api/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  await db
    .update(schema.account)
    .set({
      accessToken: data.access_token,
      accessTokenExpiresAt: dayjs().add(data.expires_in, 'second').toDate(),
      refreshToken: data.refresh_token ?? account.refreshToken,
    })
    .where(eq(schema.account.id, account.id));

  return data.access_token;
}
