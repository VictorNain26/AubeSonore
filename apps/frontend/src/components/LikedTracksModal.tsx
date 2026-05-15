import { useState, useMemo, useCallback, memo } from 'react';
import {
  Library,
  ExternalLink,
  Music,
  Trash2,
  Search,
  MoreHorizontal,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLikedTracksContext as useLikedTracks } from '../contexts/LikedTracksContext';
import { usePreferences } from '../hooks/usePreferences';
import { PLATFORMS } from '@aubesonore/shared-types/client';
import type { LikedTrack, PreferredPlatform } from '../lib/api';
import { trackApi } from '../lib/api';
import { exportAsCSV, exportAsTuneMyMusic, exportAsSonglinkList } from '../lib/exportLibrary';
import { getPreferredLink } from '@aubesonore/core/share';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/DropdownMenu';
import { toast } from 'sonner';

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
    <div className={cn('group flex items-center gap-3 py-2', isDeleting && 'opacity-50')}>
      {/* Artwork */}
      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
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
          <Music className="w-5 h-5 text-white/30" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{track.title}</p>
        <p className="text-xs text-white/50 truncate">{track.artist}</p>
      </div>

      {/* Actions - always visible */}
      <div className="flex items-center gap-1">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'p-2 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer',
            'text-white/40 hover:text-white hover:bg-white/10',
            'transition-all duration-200'
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
            'text-white/40 hover:text-red-400 hover:bg-white/10',
            'transition-all duration-200',
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
            'bg-white/5 hover:bg-white/10 border border-white/10',
            'transition-all duration-200 text-sm'
          )}
          aria-label="Sélectionner la plateforme préférée"
        >
          <span className="text-white/60">{selectedPlatform?.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-44 max-h-[280px] overflow-y-auto">
        {PLATFORMS.map((platform) => (
          <DropdownMenuItem
            key={platform.id}
            onSelect={() => onChange(platform.id)}
            className={cn(selected === platform.id && 'bg-white/10 !text-white')}
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
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Library className="w-8 h-8 text-white/30" />
      </div>
      <p className="text-sm text-white/50 mb-1">Votre bibliothèque est vide</p>
      <p className="text-xs text-white/30 max-w-[200px]">
        Survolez la pochette et appuyez sur + pour sauvegarder
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant Principal - Modal style Player
// ─────────────────────────────────────────────

function OverflowMenu({
  tracks,
  isRefreshing,
  onRefresh,
}: {
  tracks: LikedTrack[];
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'p-2 rounded-full cursor-pointer',
            'text-white/40 hover:text-white hover:bg-white/10',
            'transition-all duration-200'
          )}
          aria-label="Plus d'options"
          title="Plus d'options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled={isRefreshing} onSelect={() => onRefresh()}>
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Rafraîchir les liens
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void exportAsCSV(tracks)}>
          <Download className="w-4 h-4" />
          Exporter CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void exportAsTuneMyMusic(tracks)}>
          <Download className="w-4 h-4" />
          Exporter TuneMyMusic
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void exportAsSonglinkList(tracks)}>
          <Download className="w-4 h-4" />
          Exporter Liens Songlink
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LikedTracksModal({ isOpen, onClose }: LikedTracksModalProps) {
  const { tracks, isLoading, unlikeTrack } = useLikedTracks();
  const { preferences, updatePlatform } = usePreferences();
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-x-4 top-1/2 max-w-md mx-auto z-50"
                initial={{ opacity: 0, y: '-48%', scale: 0.96 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-48%', scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={cn(
                    'bg-black/80 backdrop-blur-md rounded-2xl',
                    'border border-white/10 shadow-2xl overflow-hidden',
                    'max-h-[70vh] flex flex-col'
                  )}
                >
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 shrink-0 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Library className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <Dialog.Title className="text-lg font-medium text-white">
                            Ma Bibliothèque
                          </Dialog.Title>
                          <Dialog.Description className="text-xs text-white/40">
                            {tracks.length} {tracks.length > 1 ? 'titres' : 'titre'}
                          </Dialog.Description>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {tracks.length > 0 && (
                          <OverflowMenu
                            tracks={tracks}
                            isRefreshing={isRefreshing}
                            onRefresh={handleRefreshAll}
                          />
                        )}
                        <Dialog.Close
                          className={cn(
                            'p-2 rounded-full cursor-pointer',
                            'text-white/40 hover:text-white hover:bg-white/10',
                            'transition-all duration-200'
                          )}
                          aria-label="Fermer"
                        >
                          <X className="w-5 h-5" />
                        </Dialog.Close>
                      </div>
                    </div>

                    {/* Platform selector */}
                    {tracks.length > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <span className="text-xs text-white/40">Ouvrir avec</span>
                        <PlatformSelector
                          selected={preferredPlatform}
                          onChange={handleUpdatePlatform}
                        />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
                      </div>
                    ) : tracks.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <div className="divide-y divide-white/5">
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
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
