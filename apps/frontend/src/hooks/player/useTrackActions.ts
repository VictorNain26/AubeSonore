import { useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { useNowPlayingStore } from '../../lib/azuracast';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { useLikeAction } from './useLikeAction';
import { useMoment } from '../useMoment';
import { shareTrack } from '../../lib/shareTrack';
import { MOMENT_SHARE_PHRASES } from '../../lib/moments';

interface UseTrackActions {
  title: string | undefined;
  artist: string | undefined;
  isLiked: boolean;
  isLiking: boolean;
  handleToggleLike: () => void;
  handleShare: () => void;
}

export function useTrackActions(): UseTrackActions {
  const { artUrl, title, artist } = useNowPlayingStore(
    useShallow((s) => ({
      artUrl: s.data?.now_playing?.song.art,
      title: s.data?.now_playing?.song.title,
      artist: s.data?.now_playing?.song.artist,
    }))
  );
  const moment = useMoment();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();

  const isLiked = title && artist ? isTrackLiked(tracks, title, artist) : false;
  const isLiking = likingTrackId === `${title}-${artist}`;

  const trackUrl = useMemo(() => {
    if (!title || !artist) return undefined;
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );
    return getTrackShareUrl(likedTrack ?? { title, artist }, preferences?.preferredPlatform);
  }, [title, artist, tracks, preferences]);

  const handleToggleLike = useCallback(() => {
    if (title && artist) {
      void toggleLike(title, artist, artUrl);
    }
  }, [title, artist, artUrl, toggleLike]);

  const handleShare = useCallback(() => {
    if (!title || !artist || !trackUrl) return;
    void shareTrack({
      title,
      artist,
      url: trackUrl,
      momentLabel: MOMENT_SHARE_PHRASES[moment],
    })
      .then((result) => {
        if (result === 'copied') toast('Lien copié');
      })
      .catch(() => {
        toast('Partage impossible');
      });
  }, [title, artist, trackUrl, moment]);

  return { title, artist, isLiked, isLiking, handleToggleLike, handleShare };
}
