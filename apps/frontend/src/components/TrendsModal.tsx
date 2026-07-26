import { useCallback } from 'react';
import { shareTrackWithToast, getRadioShareUrl } from '../lib/shareTrack';
import { useLikeAction } from '../hooks/player/useLikeAction';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { useTrends } from '../hooks/useTrends';
import { TrendsModalView, type TrendEntryViewModel } from '../design/organisms/TrendsModalView';
import type { TrendEntry } from '../hooks/useTrends';

interface TrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrendsModal({ isOpen, onClose }: TrendsModalProps) {
  const { data, isLoading, hasError } = useTrends(isOpen);
  const { toggleLike } = useLikeAction();
  const tracks = useLikedTracksStore((s) => s.tracks);

  const handleLike = useCallback(
    (entry: TrendEntryViewModel) => {
      void toggleLike(entry.title, entry.artist, entry.artworkUrl);
    },
    [toggleLike]
  );

  const handleShare = useCallback((entry: TrendEntryViewModel) => {
    void shareTrackWithToast({
      title: entry.title,
      artist: entry.artist,
      url: getRadioShareUrl(entry.title, entry.artist),
    });
  }, []);

  const isLiked = (entry: TrendEntry) =>
    tracks.some(
      (t) =>
        t.title.toLowerCase() === entry.title.toLowerCase() &&
        t.artist.toLowerCase() === entry.artist.toLowerCase()
    );

  const toViewModel = (entry: TrendEntry): TrendEntryViewModel => ({
    title: entry.title,
    artist: entry.artist,
    ...(entry.artworkUrl ? { artworkUrl: entry.artworkUrl } : {}),
    likes: entry.likes,
    isLiked: isLiked(entry),
  });

  return (
    <TrendsModalView
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      week={(data?.week ?? []).map(toViewModel)}
      allTime={(data?.allTime ?? []).map(toViewModel)}
      isLoading={isLoading}
      hasError={hasError}
      onLikeTrack={handleLike}
      onShareTrack={handleShare}
    />
  );
}
