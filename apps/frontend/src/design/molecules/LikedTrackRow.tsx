import { ExternalLink, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thumbnail } from '../atoms/Thumbnail';
import { Button } from '../atoms/Button';
import * as m from '@/paraglide/messages.js';

export interface LikedTrackRowProps {
  title: string;
  artist: string;
  /** Cover art URL. Falls back to the `Thumbnail` placeholder icon when absent. */
  artworkUrl?: string;
  /** Direct platform link, or `null` while links are still resolving — open is disabled then (never a search URL). Share always works: it links to the radio share page. */
  linkHref: string | null;
  /** Name of the platform the link opens (used in the open/share tooltips). */
  platformName?: string;
  /** Row is pending removal: shown grayed with an Undo affordance instead of the actions. */
  pendingRemoval: boolean;
  /** Remaining share of the removal grace period (1 → 0), drives the countdown bar. */
  removalFraction?: number | undefined;
  /** Share this track (native share sheet, clipboard fallback). */
  onShare: () => void;
  /** Start removal (enters the pending-removal state). */
  onDelete: () => void;
  /** Cancel a pending removal. */
  onUndo: () => void;
}

const ACTION_BASE =
  'flex size-11 items-center justify-center rounded-full text-text-faint transition-colors duration-150 ease-out-quart focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * One row of the "Ma bibliothèque" modal: cover, title/artist, open-on-platform
 * and share actions, and removal with inline undo. Purely presentational — the
 * container owns the store reads, link resolution, and the pending-removal timer.
 */
export function LikedTrackRowView({
  title,
  artist,
  artworkUrl,
  linkHref,
  platformName,
  pendingRemoval,
  removalFraction,
  onShare,
  onDelete,
  onUndo,
}: LikedTrackRowProps) {
  if (pendingRemoval) {
    const fraction = removalFraction ?? 1;
    return (
      <div role="listitem" className="-mx-2 px-2 py-2">
        <div className="flex items-center gap-3">
          <Thumbnail
            {...(artworkUrl ? { src: artworkUrl } : {})}
            alt={title}
            seed={`${artist}|${title}`}
            className="bg-surface opacity-40 grayscale"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body text-text-muted line-through">{title}</p>
            <p className="truncate text-caption text-text-faint">{m.liked_track_removed()}</p>
          </div>
          <Button variant="ghost" onClick={onUndo} className="text-caption text-accent">
            {m.liked_track_undo()}
          </Button>
        </div>
        <div
          role="progressbar"
          aria-label={m.liked_track_removal_countdown()}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          className="mt-2 h-0.5 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full bg-accent transition-[width] duration-250 ease-linear"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>
    );
  }

  const openTitle = linkHref
    ? m.liked_track_open_on({ platform: platformName ?? m.liked_track_platform_fallback() })
    : m.liked_track_links_resolving();

  return (
    <div
      role="listitem"
      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-out-quart hover:bg-surface"
    >
      <Thumbnail
        {...(artworkUrl ? { src: artworkUrl } : {})}
        alt={title}
        seed={`${artist}|${title}`}
        className="bg-surface"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-text">{title}</p>
        <p className="truncate text-caption text-text-muted">{artist}</p>
      </div>

      <div data-testid="row-actions" className="flex items-center gap-1">
        {linkHref ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              ACTION_BASE,
              'cursor-pointer hover:bg-surface hover:text-text active:opacity-80'
            )}
            title={openTitle}
            aria-label={openTitle}
          >
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <span
            className={cn(ACTION_BASE, 'cursor-not-allowed opacity-40')}
            title={openTitle}
            aria-label={openTitle}
            aria-disabled="true"
          >
            <ExternalLink className="size-4" />
          </span>
        )}

        <Button
          variant="icon"
          onClick={onShare}
          aria-label={m.track_share_this()}
          title={m.track_share()}
          className="text-text-faint hover:bg-surface hover:text-text"
        >
          <Share2 className="size-4" />
        </Button>

        <Button
          variant="icon"
          onClick={onDelete}
          aria-label={m.library_remove()}
          title={m.liked_track_remove_short()}
          className="text-text-faint hover:bg-surface hover:text-accent"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
