import { http, HttpResponse } from 'msw';

const API = 'http://localhost:3000';
const AZURA = 'https://radio.aubesonore.fr';

export const handlers = [
  // Auth
  http.get(`${API}/api/auth/get-session`, () => {
    return HttpResponse.json({ user: null });
  }),
  http.post(`${API}/api/auth/sign-in/email`, () => {
    return HttpResponse.json({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  }),
  http.post(`${API}/api/auth/sign-up/email`, () => {
    return HttpResponse.json({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  }),
  http.post(`${API}/api/auth/sign-out`, () => HttpResponse.json({})),

  // Track
  http.get(`${API}/api/track/like`, () => HttpResponse.json([])),
  http.post(`${API}/api/track/like`, async ({ request }) => {
    const body = (await request.json()) as { title: string; artist: string };
    return HttpResponse.json({
      track: {
        id: 't1',
        userId: 'u1',
        title: body.title,
        artist: body.artist,
        album: null,
        artworkUrl: null,
        youtubeUrl: 'https://youtube.com/x',
        isrc: null,
        songlinkUrl: null,
        platformLinks: null,
        createdAt: new Date().toISOString(),
      },
    });
  }),
  http.delete(`${API}/api/track/like/:id`, () => HttpResponse.json({ message: 'ok' })),
  http.post(`${API}/api/track/check-liked`, () => HttpResponse.json({ liked: false })),

  // Preferences
  http.get(`${API}/api/preferences`, () =>
    HttpResponse.json({ id: 'p1', userId: 'u1', preferredPlatform: 'spotify' })
  ),
  http.put(`${API}/api/preferences`, () =>
    HttpResponse.json({ preferences: { id: 'p1', userId: 'u1', preferredPlatform: 'spotify' } })
  ),

  // Push
  http.get(`${API}/api/push/vapid-key`, () => HttpResponse.json({ key: 'BFakeVapidKey' })),
  http.post(`${API}/api/push/subscribe`, () => HttpResponse.json({ message: 'ok' })),
  http.delete(`${API}/api/push/unsubscribe`, () => HttpResponse.json({ message: 'ok' })),

  // Artist info
  http.get(`${API}/api/artist`, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (name === 'Unknown') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ name, bio: 'Test bio', image: null });
  }),

  // AzuraCast static fallback
  http.get(`${AZURA}/api/nowplaying_static/aubesonore.json`, () =>
    HttpResponse.json(makeNowPlaying())
  ),
];

export function makeNowPlaying() {
  return {
    station: {
      id: 1,
      name: 'AubeSonore',
      shortcode: 'aubesonore',
      description: '',
      frontend: 'icecast',
      backend: 'liquidsoap',
      timezone: 'UTC',
      listen_url: 'https://radio.aubesonore.fr/listen/aubesonore/radio.mp3',
      url: '',
      public_player_url: '',
      playlist_pls_url: '',
      playlist_m3u_url: '',
      is_public: true,
      requests_enabled: false,
      mounts: [],
      remotes: [],
      hls_enabled: false,
      hls_url: null,
    },
    listeners: { total: 5, unique: 3, current: 3 },
    live: { is_live: false, streamer_name: '', broadcast_start: null, art: null },
    now_playing: {
      sh_id: 100,
      played_at: 1715688000,
      duration: 180,
      playlist: 'main',
      streamer: '',
      is_request: false,
      song: {
        id: 's1',
        art: 'https://radio.aubesonore.fr/api/station/1/art/100',
        text: 'Artist - Title',
        artist: 'Test Artist',
        title: 'Test Title',
        album: '',
        genre: '',
        isrc: '',
        lyrics: '',
      },
      elapsed: 30,
      remaining: 150,
    },
    playing_next: null,
    song_history: [],
    is_online: true,
  };
}
