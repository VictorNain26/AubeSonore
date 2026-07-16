import { useState, useMemo, useCallback, memo } from 'react';
import { ExternalLink, Music, Trash2, Search, RefreshCw, Download } from 'lucide-react';
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
      <div className="w-10 h-10 rounded-sm overflow-hidden shrink-0 bg-paper-raised flex items-center justify-center">
        {artwork ? (
          <img
            src={artwork}
            alt={track.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="w-5 h-5 text-ink-faint" />
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
            'p-2 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer',
            'text-ink-faint hover:text-ink hover:bg-paper-raised',
            'transition-colors'
          )}
          title={
            isSearch
              ? `Rechercher sur ${selectedPlatform?.name}`
              : `Ouvrir sur ${selectedPlatform?.name}`
          }
        >
          {isSearch ? <Search className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
        </a>

        <IconButton
          shape="round"
          onClick={() => handleDelete()}
          disabled={isDeleting}
          label="Retirer de ma bibliothèque"
          title="Retirer"
          className={cn(
            'hover:text-danger opacity-0 group-hover:opacity-100',
            isDeleting && 'cursor-not-allowed !opacity-100'
          )}
        >
          <Trash2 className="w-4 h-4" />
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
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer',
            'border border-line text-ink hover:bg-paper-raised',
            'transition-colors text-caption'
          )}
          aria-label="Sélectionner la plateforme préférée"
        >
          <span className="text-ink-soft">{selectedPlatform?.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-44 max-h-[280px] overflow-y-auto">
        {PLATFORMS.map((platform) => (
          <DropdownMenuItem
            key={platform.id}
            onSelect={() => onChange(platform.id)}
            className={cn(selected === platform.id && 'bg-paper-raised !text-ink')}
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
        <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
        Mettre à jour les liens
      </Button>
      <Button variant="ink" onClick={() => exportAsCSV(tracks)}>
        <Download className="w-4 h-4" />
        Exporter (CSV)
      </Button>
    </div>
  );
}

export function LikedTracksModal({ isOpen, onClose }: LikedTracksModalProps) {
  const tracks = useLikedTracksStore((s) => s.tracks);
  const isLoading = useLikedTracksStore((s) => s.isLoading);
  const unlikeTrack = useLikedTracksStore((s) => s.unlikeTrack);
  const preferences = usePreferencesStore((s) => s.preferences);
  const updatePlatform = usePreferencesStore((s) => s.updatePlatform);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      void unlikeTrack(id);
    },
    [unlikeTrack]
  );

  const preferredPlatform = preferences?.preferredPlatform || 'spotify';

  // Sort newest first
  const sortedTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tracks]
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Mes découvertes"
      description={`${tracks.length} ${tracks.length > 1 ? 'titres' : 'titre'}`}
      maxWidthClassName="max-w-lg"
    >
      {tracks.length > 0 && (
        <div className="flex items-center justify-between pb-4 border-b border-line">
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
          <div className="w-8 h-8 rounded-full border-2 border-line border-t-ink-soft animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-line pt-4" role="list">
          {sortedTracks.map((track) => (
            <TrackItem
              key={track.id}
              track={track}
              preferredPlatform={preferredPlatform}
              onDelete={handleUnlikeTrack}
            />
          ))}
        </div>
      )}
    </ModalShell>
  );
}
