import { useEffect, useRef } from 'react';
import { useCastStore } from '../stores/castStore';
import { usePlayerStore } from '../stores/playerStore';
import { getGoogleCast } from '../lib/cast';
import { STREAM_URL } from '../config/env';

/**
 * CastProvider - Manages Google Cast session lifecycle
 * No context needed - all state is in Zustand store
 */
export function CastProvider({ children }: { children: React.ReactNode }) {
  const mounted = useRef(true);
  const subscriptions = useRef<Array<{ remove: () => void }>>([]);

  const setCasting = useCastStore((s) => s.setCasting);
  const setConnecting = useCastStore((s) => s.setConnecting);
  const setError = useCastStore((s) => s.setError);
  const setChromecastAvailable = useCastStore((s) => s.setChromecastAvailable);

  useEffect(() => {
    mounted.current = true;

    const googleCast = getGoogleCast();

    if (!googleCast) {
      setChromecastAvailable(false);
      return;
    }

    setChromecastAvailable(true);

    const sessionManager = googleCast.getSessionManager();

    subscriptions.current = [
      sessionManager.onSessionStarting(() => {
        if (mounted.current) setConnecting(true);
      }),

      sessionManager.onSessionStarted(() => {
        if (!mounted.current) return;

        setCasting(true, 'Chromecast', 'chromecast');
        loadCurrentTrack(googleCast);
      }),

      sessionManager.onSessionEnded(() => {
        if (mounted.current) setCasting(false);
      }),

      sessionManager.onSessionStartFailed(() => {
        if (!mounted.current) return;
        setConnecting(false);
        setError('Connexion échouée');
      }),
    ];

    return () => {
      mounted.current = false;
      subscriptions.current.forEach((sub) => sub.remove());
      subscriptions.current = [];
    };
  }, [setCasting, setConnecting, setError, setChromecastAvailable]);

  return <>{children}</>;
}

/**
 * Load current track to Chromecast when session starts
 */
async function loadCurrentTrack(googleCast: NonNullable<ReturnType<typeof getGoogleCast>>) {
  const song = usePlayerStore.getState().currentSong;
  if (!song) return;

  try {
    const client = await googleCast.getClient();
    if (!client) return;

    await client.loadMedia({
      mediaInfo: {
        contentUrl: STREAM_URL,
        contentType: 'audio/mpeg',
        metadata: {
          type: 'musicTrack',
          title: song.title,
          artist: song.artist,
          images: song.art ? [{ url: song.art }] : [],
        },
      },
      autoplay: true,
    });
  } catch (error) {
    console.warn('[CastProvider] Failed to load media:', error);
  }
}
