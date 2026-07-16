import { useState, useMemo, useCallback, memo } from 'react';
import { Library, ExternalLink, Music, Trash2, Search, RefreshCw, Download, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
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
import { modal } from './Player/motion-presets';

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

        <button
          onClick={() => handleDelete()}
          disabled={isDeleting}
          className={cn(
            'p-2 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center',
            'text-ink-faint hover:text-danger hover:bg-paper-raised',
            'transition-colors',
            'opacity-0 group-hover:opacity-100',
            isDeleting ? 'cursor-not-allowed !opacity-100' : 'cursor-pointer'
          )}
          title="Retirer"
          aria-label="Retirer de ma bibliothèque"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
// Composant EmptyState - Style Player
// ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-lg bg-paper-raised flex items-center justify-center mb-4">
        <Library className="w-8 h-8 text-ink-faint" />
      </div>
      <p className="text-body text-ink-soft mb-1">Aucune découverte sauvegardée</p>
      <p className="text-caption text-ink-faint max-w-[200px]">
        Appuyez sur ♥ sur une pochette pour sauvegarder un morceau
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant Principal - Modal style Player
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
    <>
      <button
        onClick={() => onRefresh()}
        disabled={isRefreshing}
        className={cn(
          'p-2 rounded-full',
          'text-ink-faint hover:text-ink hover:bg-paper-raised',
          'transition-colors',
          isRefreshing ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
        aria-label="Mettre à jour les liens"
        title="Mettre à jour les liens"
      >
        <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
      </button>
      <button
        onClick={() => exportAsCSV(tracks)}
        className={cn(
          'p-2 rounded-full cursor-pointer',
          'text-ink-faint hover:text-ink hover:bg-paper-raised',
          'transition-colors'
        )}
        aria-label="Exporter (CSV)"
        title="Exporter (CSV)"
      >
        <Download className="w-4 h-4" />
      </button>
    </>
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
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-ink/20 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={modal}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="panel fixed inset-x-4 top-1/2 w-full max-w-lg mx-auto p-6 z-50 max-h-[70vh] flex flex-col"
                initial={{ opacity: 0, y: '-46%', scale: 0.97 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-46%', scale: 0.97 }}
                transition={modal}
              >
                {/* Header */}
                <div className="shrink-0 pb-4 border-b border-line">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-paper-raised flex items-center justify-center">
                        <Library className="w-5 h-5 text-ink-soft" />
                      </div>
                      <div>
                        <Dialog.Title className="font-display text-title text-ink">
                          Mes découvertes
                        </Dialog.Title>
                        <Dialog.Description className="text-caption text-ink-faint">
                          {tracks.length} {tracks.length > 1 ? 'titres' : 'titre'}
                        </Dialog.Description>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {tracks.length > 0 && (
                        <LibraryActions
                          tracks={tracks}
                          isRefreshing={isRefreshing}
                          onRefresh={handleRefreshAll}
                        />
                      )}
                      <Dialog.Close
                        className={cn(
                          'p-2 rounded-full cursor-pointer',
                          'text-ink-faint hover:text-ink hover:bg-paper-raised',
                          'transition-colors'
                        )}
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </div>
                  </div>

                  {/* Platform selector */}
                  {tracks.length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
                      <span className="text-caption text-ink-faint">Ouvrir avec</span>
                      <PlatformSelector
                        selected={preferredPlatform}
                        onChange={handleUpdatePlatform}
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-4 overscroll-contain">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 rounded-full border-2 border-line border-t-ink-soft animate-spin" />
                    </div>
                  ) : tracks.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="divide-y divide-line" role="list">
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
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
