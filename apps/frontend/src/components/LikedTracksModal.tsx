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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/DropdownMenu';
import { toast } from 'sonner';
import { ModalShell } from './ui/ModalShell';
import { Button, IconButton } from './ui/Button';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LikedTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Composant TrackItem - Style Player
// ─────────────────────────────────────────────

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
      {/* Artwork */}
      <div className="size-10 rounded-sm overflow-hidden shrink-0 bg-paper-raised flex items-center justify-center">
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
          <Music className="size-5 text-ink-faint" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-body text-ink truncate">{track.title}</p>
        <p className="text-caption text-ink-soft truncate">{track.artist}</p>
      </div>

      {/* Actions - always visible */}
      <div className="flex items-center gap-1">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'size-10 rounded-full flex items-center justify-center cursor-pointer',
            'text-ink-faint hover:text-ink hover:bg-paper-raised transition-colors'
          )}
          title={
            isSearch
              ? `Rechercher sur ${selectedPlatform?.name}`
              : `Ouvrir sur ${selectedPlatform?.name}`
          }
        >
          {isSearch ? <Search className="size-4" /> : <ExternalLink className="size-4" />}
        </a>

        <IconButton
          shape="round"
          onClick={() => handleDelete()}
          disabled={isDeleting}
          label="Retirer de ma bibliothèque"
          title="Retirer"
          className={cn(
            'size-10 hover:text-danger opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            'pointer-coarse:opacity-100',
            isDeleting && 'animate-pulse'
          )}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// Composant PlatformSelector - Style Player
// ─────────────────────────────────────────────

interface PlatformSelectorProps {
  selected: PreferredPlatform;
  onChange: (platform: PreferredPlatform) => void;
}

function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const selectedPlatform = PLATFORMS.find((p) => p.id === selected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ink"
          className="rounded-full text-caption"
          aria-label="Sélectionner la plateforme préférée"
        >
          {selectedPlatform?.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-44 max-h-72 overflow-y-auto">
        {PLATFORMS.map((platform) => (
          <DropdownMenuItem
            key={platform.id}
            onSelect={() => onChange(platform.id)}
            className={cn(selected === platform.id && 'bg-paper-raised')}
          >
            {platform.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// Composant EmptyState - état vide éditorial
// ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-10 text-center space-y-1">
      <p className="font-display text-lead text-ink">Rien ici pour l&apos;instant.</p>
      <p className="text-body text-ink-soft">Aimez un morceau au passage — il vous attendra ici.</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant Principal
// ─────────────────────────────────────────────

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
      <Button variant="ink" onClick={() => onRefresh()} disabled={isRefreshing}>
        <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
        Mettre à jour les liens
      </Button>
      <Button variant="ink" onClick={() => exportAsCSV(tracks)}>
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

  const handleRefreshAll = useCallback(() => {
    setIsRefreshing(true);
    void (async () => {
      try {
        await trackApi.refreshAllLinks();
        toast.success('Liens mis à jour');
      } catch {
        toast.error('Erreur lors du rafraîchissement');
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ma bibliothèque"
      description={`${tracks.length} ${tracks.length > 1 ? 'morceaux' : 'morceau'}`}
      maxWidthClassName="max-w-lg"
    >
      {tracks.length > 0 && (
        <div className="sticky top-0 z-10 bg-paper flex items-center justify-between pb-4 border-b border-line">
          <LibraryActions
            tracks={tracks}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshAll}
          />
          <div className="flex items-center gap-2">
            <span className="text-caption text-ink-faint">Ouvrir avec</span>
            <PlatformSelector selected={preferredPlatform} onChange={handleUpdatePlatform} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-ink-faint" aria-label="Chargement" />
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-line pt-4 scroll-pt-16" role="list">
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
        <div className="pt-4 flex justify-center">
          <Button variant="ghost" onClick={() => setVisibleCount(sortedTracks.length)}>
            Afficher les {hiddenCount} autres
          </Button>
        </div>
      )}
    </ModalShell>
  );
}
