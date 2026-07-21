import { useState, useMemo, useCallback, memo } from 'react';
import { ExternalLink, Loader2, Music, Trash2, Search, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { PLATFORMS } from '@aubesonore/shared-types/client';
import type { LikedTrack, PreferredPlatform } from '../lib/api';
import { trackApi } from '../lib/api';
import { exportAsCSV } from '../lib/exportLibrary';
import { getPreferredLink } from '@aubesonore/core/share';
import { toast } from 'sonner';
import { toastError } from '../lib/appToast';
import { Modal } from '../design/ui/Modal';
import { Menu } from '../design/ui/Menu';
import { Button } from '../design/ui/Button';

interface LikedTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrackItemProps {
  track: LikedTrack;
  preferredPlatform: PreferredPlatform;
  onDelete: (id: string) => void;
}

const TrackItem = memo(function TrackItem({ track, preferredPlatform, onDelete }: TrackItemProps) {
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const artwork = imgError ? null : track.artworkUrl;
  const { url: link, isSearch } = getPreferredLink(track, preferredPlatform);
  const selectedPlatform = PLATFORMS.find((p) => p.id === preferredPlatform);

  const handleDelete = () => {
    setIsDeleting(true);
    void onDelete(track.id);
  };

  return (
    <div
      role="listitem"
      className={cn('group flex items-center gap-3 py-2', isDeleting && 'opacity-50')}
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface">
        {artwork ? (
          <img
            src={artwork}
            alt={track.title}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="size-5 text-text-faint" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-text">{track.title}</p>
        <p className="truncate text-caption text-text-muted">{track.artist}</p>
      </div>

      <div className="flex items-center gap-1">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex size-11 cursor-pointer items-center justify-center rounded-full',
            'text-text-faint transition-colors duration-150 ease-out-quart hover:bg-surface hover:text-text',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80'
          )}
          title={
            isSearch
              ? `Rechercher sur ${selectedPlatform?.name}`
              : `Ouvrir sur ${selectedPlatform?.name}`
          }
        >
          {isSearch ? <Search className="size-4" /> : <ExternalLink className="size-4" />}
        </a>

        <Button
          variant="icon"
          onClick={() => handleDelete()}
          disabled={isDeleting}
          aria-label="Retirer de ma bibliothèque"
          title="Retirer"
          className={cn(
            'text-text-faint opacity-0 hover:bg-surface hover:text-accent',
            'group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
            isDeleting && 'animate-pulse'
          )}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
});

interface PlatformSelectorProps {
  selected: PreferredPlatform;
  onChange: (platform: PreferredPlatform) => void;
}

function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const selectedPlatform = PLATFORMS.find((p) => p.id === selected);

  return (
    <Menu
      trigger={
        <Button
          variant="ghost"
          className="border border-border text-caption"
          aria-label="Sélectionner la plateforme préférée"
        >
          {selectedPlatform?.name}
        </Button>
      }
      items={PLATFORMS.map((platform) => ({
        label: platform.name,
        onSelect: () => onChange(platform.id),
        selected: platform.id === selected,
      }))}
    />
  );
}

function EmptyState() {
  return (
    <div className="space-y-1 py-10 text-center">
      <p className="text-lead text-text">Rien ici pour l&apos;instant.</p>
      <p className="text-body text-text-muted">
        Aimez un morceau au passage — il vous attendra ici.
      </p>
    </div>
  );
}

function LibraryActions({
  tracks,
  isRefreshing,
  onRefresh,
}: {
  tracks: LikedTrack[];
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        onClick={() => onRefresh()}
        disabled={isRefreshing}
        className="border border-border text-caption"
      >
        <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
        Mettre à jour les liens
      </Button>
      <Button
        variant="ghost"
        onClick={() => exportAsCSV(tracks)}
        className="border border-border text-caption"
      >
        <Download className="size-4" />
        Exporter (CSV)
      </Button>
    </div>
  );
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
      void (async () => {
        const track = tracks.find((t) => t.id === id);
        const removed = await unlikeTrack(id);
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

  return (
    <Modal
      title="Ma bibliothèque"
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <p className="-mt-3 text-caption text-text-faint">
        {tracks.length} {tracks.length > 1 ? 'morceaux' : 'morceau'}
      </p>

      <div
        data-testid="modal-scroll-container"
        className="max-h-[70dvh] overflow-y-auto scroll-pt-16"
      >
        {tracks.length > 0 && (
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised pb-4">
            <LibraryActions
              tracks={tracks}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshAll}
            />
            <div className="flex items-center gap-2">
              <span className="text-caption text-text-faint">Ouvrir avec</span>
              <PlatformSelector selected={preferredPlatform} onChange={handleUpdatePlatform} />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-text-faint" aria-label="Chargement" />
          </div>
        ) : tracks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border pt-4" role="list">
            {visibleTracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                preferredPlatform={preferredPlatform}
                onDelete={handleUnlikeTrack}
              />
            ))}
          </div>
        )}

        {hiddenCount > 0 && (
          <div className="flex justify-center pt-4">
            <Button variant="ghost" onClick={() => setVisibleCount(sortedTracks.length)}>
              Afficher les {hiddenCount} autres
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
