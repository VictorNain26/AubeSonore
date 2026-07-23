import { ExternalLink, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thumbnail } from '../atoms/Thumbnail';
import { Button } from '../atoms/Button';

export interface LikedTrackRowProps {
  title: string;
  artist: string;
  /** Cover art URL. Falls back to the `Thumbnail` placeholder icon when absent. */
  artworkUrl?: string;
  /** Direct platform link, or `null` while links are still resolving — open and share are disabled then (never a search URL). */
  linkHref: string | null;
  /** Name of the platform the link opens (used in the open/share tooltips). */
  platformName?: string;
  /** Row is pending removal: shown grayed with an Undo affordance instead of the actions. */
  pendingRemoval: boolean;
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
  onShare,
  onDelete,
  onUndo,
}: LikedTrackRowProps) {
  if (pendingRemoval) {
    return (
      <div role="listitem" className="flex items-center gap-3 py-2">
        <Thumbnail
          {...(artworkUrl ? { src: artworkUrl } : {})}
          alt={title}
          seed={`${artist}|${title}`}
          className="bg-surface opacity-40 grayscale"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body text-text-muted line-through">{title}</p>
          <p className="truncate text-caption text-text-faint">Retiré</p>
        </div>
        <Button variant="ghost" onClick={onUndo} className="text-caption text-accent">
          Annuler
        </Button>
      </div>
    );
  }

  const openTitle = linkHref
    ? `Ouvrir sur ${platformName ?? 'la plateforme'}`
    : 'Liens en cours de résolution…';

  return (
    <div role="listitem" className="group flex items-center gap-3 py-2">
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

      <div
        data-testid="row-actions"
        className="flex items-center gap-1 opacity-0 transition-opacity duration-150 ease-out-quart group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
      >
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
          disabled={!linkHref}
          aria-label="Partager ce morceau"
          title={linkHref ? 'Partager' : 'Liens en cours de résolution…'}
          className="text-text-faint hover:bg-surface hover:text-text"
        >
          <Share2 className="size-4" />
        </Button>

        <Button
          variant="icon"
          onClick={onDelete}
          aria-label="Retirer de ma bibliothèque"
          title="Retirer"
          className="text-text-faint hover:bg-surface hover:text-accent"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
