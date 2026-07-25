import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toastError } from '../../lib/appToast';
import { useNowPlayingStore } from '../../lib/azuracast';
import { usePlayer } from '../../lib/player';
import { useMediaSession } from '../../hooks/player/useMediaSession';
import * as m from '@/paraglide/messages.js';

// Invisible component that hosts player side-effects driven by external
// state (now-playing track flips, audio playing state). Keeps these
// effects out of the render tree of the visible Player, which means
// Player no longer needs to exist solely to host them and can be
// unmounted independently without losing the side-effect bookkeeping.

export function PlayerSideEffects(): null {
  const { title, artist, album, art } = useNowPlayingStore(
    useShallow((s) => ({
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
      album: s.data?.now_playing?.song.album,
      art: s.data?.now_playing?.song.art,
    }))
  );
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playError = usePlayer((s) => s.playError);
  const clearPlayError = usePlayer((s) => s.clearPlayError);

  useMediaSession({ title, artist, album, artworkUrl: art }, isPlaying);

  useEffect(() => {
    if (playError) {
      toastError(m.toast_playback_failed({ message: playError.message }));
      clearPlayError();
    }
  }, [playError, clearPlayError]);

  return null;
}
