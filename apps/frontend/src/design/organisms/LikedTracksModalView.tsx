import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { Menu } from '../molecules/Menu';
import { Button } from '../atoms/Button';
import { LikedTrackRowView } from '../molecules/LikedTrackRow';

export interface LikedTrackViewModel {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  /** Direct platform link, or `null` while links are still resolving. */
  linkHref: string | null;
  /** Row is pending removal (grayed, showing Undo). */
  pendingRemoval: boolean;
}

export interface PlatformOption {
  id: string;
  name: string;
}

export interface LikedTracksModalViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
  isLoading: boolean;
  tracks: LikedTrackViewModel[];
  hiddenCount: number;
  onShowMore: () => void;
  platforms: readonly PlatformOption[];
  selectedPlatformId: string;
  onSelectPlatform: (platformId: string) => void;
  onShareTrack: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onUndoTrack: (id: string) => void;
}

/**
 * Presentational body of the "Ma bibliothèque" modal: a preferred-platform
 * picker, the track list (loading / empty / populated), and the "show more"
 * pagination control. The container owns all store reads, link resolution,
 * the pending-removal timer, and pagination state.
 */
export function LikedTracksModalView({
  open,
  onOpenChange,
  totalCount,
  isLoading,
  tracks,
  hiddenCount,
  onShowMore,
  platforms,
  selectedPlatformId,
  onSelectPlatform,
  onShareTrack,
  onDeleteTrack,
  onUndoTrack,
}: LikedTracksModalViewProps) {
  const selectedPlatformName = platforms.find((p) => p.id === selectedPlatformId)?.name;

  return (
    <Modal title="Ma bibliothèque" open={open} onOpenChange={onOpenChange}>
      <p className="-mt-3 text-caption text-text-faint">
        {totalCount} {totalCount > 1 ? 'morceaux' : 'morceau'}
      </p>

      <div
        data-testid="modal-scroll-container"
        className="max-h-[70dvh] overflow-y-auto scroll-pt-16"
      >
        {totalCount > 0 && (
          <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-border bg-surface-raised pb-4">
            <span className="text-caption text-text-faint">Ouvrir avec</span>
            <Menu
              trigger={
                <Button
                  variant="ghost"
                  className="border border-border text-caption"
                  aria-label="Sélectionner la plateforme préférée"
                >
                  {selectedPlatformName}
                </Button>
              }
              items={platforms.map((platform) => ({
                label: platform.name,
                onSelect: () => onSelectPlatform(platform.id),
                selected: platform.id === selectedPlatformId,
              }))}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-text-faint" aria-label="Chargement" />
          </div>
        ) : totalCount === 0 ? (
          <div className="space-y-1 py-10 text-center">
            <p className="text-lead text-text">Rien ici pour l&apos;instant.</p>
            <p className="text-body text-text-muted">
              Aimez un morceau au passage — il vous attendra ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border pt-4" role="list">
            {tracks.map((track) => (
              <LikedTrackRowView
                key={track.id}
                title={track.title}
                artist={track.artist}
                {...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {})}
                linkHref={track.linkHref}
                {...(selectedPlatformName ? { platformName: selectedPlatformName } : {})}
                pendingRemoval={track.pendingRemoval}
                onShare={() => onShareTrack(track.id)}
                onDelete={() => onDeleteTrack(track.id)}
                onUndo={() => onUndoTrack(track.id)}
              />
            ))}
          </div>
        )}

        {hiddenCount > 0 && (
          <div className="flex justify-center pt-4">
            <Button variant="ghost" onClick={onShowMore}>
              Afficher les {hiddenCount} autres
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
