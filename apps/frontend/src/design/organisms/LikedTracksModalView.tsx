import { Download, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';
import { Menu } from '../molecules/Menu';
import { Button } from '../atoms/Button';
import { LikedTrackRowView } from '../molecules/LikedTrackRow';

export interface LikedTrackViewModel {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  linkHref: string;
  linkIsSearch: boolean;
  isDeleting: boolean;
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
  isRefreshing: boolean;
  onRefreshAll: () => void;
  onExport: () => void;
  platforms: readonly PlatformOption[];
  selectedPlatformId: string;
  onSelectPlatform: (platformId: string) => void;
  onDeleteTrack: (id: string) => void;
}

/**
 * Presentational body of the "Ma bibliothèque" modal: header actions
 * (refresh links / export CSV / preferred-platform picker), the track list
 * (loading / empty / populated), and the "show more" pagination control.
 * The container owns all store reads, the delete/undo flow, and pagination
 * state.
 */
export function LikedTracksModalView({
  open,
  onOpenChange,
  totalCount,
  isLoading,
  tracks,
  hiddenCount,
  onShowMore,
  isRefreshing,
  onRefreshAll,
  onExport,
  platforms,
  selectedPlatformId,
  onSelectPlatform,
  onDeleteTrack,
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
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={onRefreshAll}
                disabled={isRefreshing}
                className="border border-border text-caption"
              >
                <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                Mettre à jour les liens
              </Button>
              <Button
                variant="ghost"
                onClick={onExport}
                className="border border-border text-caption"
              >
                <Download className="size-4" />
                Exporter (CSV)
              </Button>
            </div>
            <div className="flex items-center gap-2">
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
                linkIsSearch={track.linkIsSearch}
                {...(selectedPlatformName ? { platformName: selectedPlatformName } : {})}
                isDeleting={track.isDeleting}
                onDelete={() => onDeleteTrack(track.id)}
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
