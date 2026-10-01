import { ChevronDown, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Modal } from './Modal';
import { Menu } from '../molecules/Menu';
import { Button } from '../atoms/Button';
import { LikedTrackRowView } from '../molecules/LikedTrackRow';
import { useRowExit } from '../../lib/motion';
import * as i18n from '@/paraglide/messages.js';

export interface LikedTrackViewModel {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  /** Direct platform link, or `null` while links are still resolving. */
  linkHref: string | null;
  /** Row is pending removal (grayed, showing Undo). */
  pendingRemoval: boolean;
  /** Remaining share of the removal grace period (1 → 0), drives the countdown bar. */
  removalFraction?: number;
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
  const rowExit = useRowExit();

  return (
    <Modal title={i18n.library_modal_title()} open={open} onOpenChange={onOpenChange} size="lg">
      <p className="text-caption text-text-faint -mt-3">
        {totalCount > 1
          ? i18n.library_track_count_other({ count: totalCount })
          : i18n.library_track_count_one({ count: totalCount })}
      </p>

      <div
        data-testid="modal-scroll-container"
        className="max-h-[70dvh] min-h-0 scroll-pt-16 scrollbar-none overflow-y-auto"
      >
        {totalCount > 0 && (
          <div className="border-border bg-surface-raised sticky top-0 z-10 flex items-center justify-end gap-2 border-b pb-4">
            <span className="text-caption text-text-faint">{i18n.library_open_with()}</span>
            <Menu
              trigger={
                <Button
                  variant="ghost"
                  className="border-border text-caption data-[popup-open]:bg-surface border [&[data-popup-open]>svg]:rotate-180"
                  aria-label={i18n.library_platform_picker()}
                >
                  {selectedPlatformName}
                  <ChevronDown
                    data-testid="platform-picker-chevron"
                    className="text-text-faint ease-out-quart size-3.5 transition-transform duration-150"
                  />
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
            <Loader2 className="text-text-faint size-8 animate-spin" aria-label={i18n.loading()} />
          </div>
        ) : totalCount === 0 ? (
          <div className="space-y-1 py-10 text-center">
            <p className="text-lead text-text">{i18n.library_empty_title()}</p>
            <p className="text-body text-text-muted">{i18n.library_empty_body()}</p>
          </div>
        ) : (
          <div className="divide-border divide-y pt-4" role="list">
            <AnimatePresence initial={false}>
              {tracks.map((track) => (
                <m.div key={track.id} {...rowExit} className="-mx-2 overflow-hidden px-2">
                  <LikedTrackRowView
                    title={track.title}
                    artist={track.artist}
                    {...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {})}
                    linkHref={track.linkHref}
                    {...(selectedPlatformName ? { platformName: selectedPlatformName } : {})}
                    pendingRemoval={track.pendingRemoval}
                    {...(track.removalFraction !== undefined
                      ? { removalFraction: track.removalFraction }
                      : {})}
                    onShare={() => onShareTrack(track.id)}
                    onDelete={() => onDeleteTrack(track.id)}
                    onUndo={() => onUndoTrack(track.id)}
                  />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {hiddenCount > 0 && (
          <div className="flex justify-center pt-4">
            <Button variant="ghost" onClick={onShowMore}>
              {i18n.library_show_more({ count: hiddenCount })}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
