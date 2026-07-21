import { useState, useMemo, useCallback } from 'react';
import { PLATFORMS } from '@aubesonore/shared-types/client';
import type { PreferredPlatform } from '../lib/api';
import { trackApi } from '../lib/api';
import { exportAsCSV } from '../lib/exportLibrary';
import { getPreferredLink } from '@aubesonore/core/share';
import { toast } from 'sonner';
import { toastError } from '../lib/appToast';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { LikedTracksModalView } from '../design/organisms/LikedTracksModalView';

interface LikedTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LikedTracksModal({ isOpen, onClose }: LikedTracksModalProps) {
  const tracks = useLikedTracksStore((s) => s.tracks);
  const isLoading = useLikedTracksStore((s) => s.isLoading);
  const unlikeTrack = useLikedTracksStore((s) => s.unlikeTrack);
  const likeTrack = useLikedTracksStore((s) => s.likeTrack);
  const preferences = usePreferencesStore((s) => s.preferences);
  const updatePlatform = usePreferencesStore((s) => s.updatePlatform);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setVisibleCount(50);
  }

  const handleRefreshAll = useCallback(() => {
    setIsRefreshing(true);
    void (async () => {
      try {
        await trackApi.refreshAllLinks();
        toast.success('Liens mis à jour');
      } catch {
        toastError('Erreur lors du rafraîchissement');
      } finally {
        setIsRefreshing(false);
      }
    })();
  }, []);

  const handleUpdatePlatform = useCallback(
    (platform: PreferredPlatform) => {
      void updatePlatform(platform);
    },
    [updatePlatform]
  );

  const handleUnlikeTrack = useCallback(
    (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      void (async () => {
        const track = tracks.find((t) => t.id === id);
        const removed = await unlikeTrack(id);
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (removed && track) {
          toast('Morceau retiré', {
            action: {
              label: 'Annuler',
              onClick: () => {
                void likeTrack({
                  title: track.title,
                  artist: track.artist,
                  ...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {}),
                  ...(track.album ? { album: track.album } : {}),
                  ...(track.isrc ? { isrc: track.isrc } : {}),
                  youtubeUrl: track.youtubeUrl,
                });
              },
            },
          });
        }
      })();
    },
    [tracks, unlikeTrack, likeTrack]
  );

  const preferredPlatform = preferences?.preferredPlatform || 'spotify';

  // Sort newest first
  const sortedTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tracks]
  );

  const visibleTracks = sortedTracks.slice(0, visibleCount);
  const hiddenCount = sortedTracks.length - visibleTracks.length;

  const trackViewModels = visibleTracks.map((track) => {
    const { url: linkHref, isSearch: linkIsSearch } = getPreferredLink(track, preferredPlatform);
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      ...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {}),
      linkHref,
      linkIsSearch,
      isDeleting: deletingIds.has(track.id),
    };
  });

  return (
    <LikedTracksModalView
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      totalCount={tracks.length}
      isLoading={isLoading}
      tracks={trackViewModels}
      hiddenCount={hiddenCount}
      onShowMore={() => setVisibleCount(sortedTracks.length)}
      isRefreshing={isRefreshing}
      onRefreshAll={handleRefreshAll}
      onExport={() => exportAsCSV(tracks)}
      platforms={PLATFORMS}
      selectedPlatformId={preferredPlatform}
      onSelectPlatform={(platformId) => handleUpdatePlatform(platformId as PreferredPlatform)}
      onDeleteTrack={handleUnlikeTrack}
    />
  );
}
