import { ExternalLink, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thumbnail } from '../atoms/Thumbnail';
import { Button } from '../atoms/Button';

export interface LikedTrackRowProps {
  title: string;
  artist: string;
  /** Cover art URL. Falls back to the `Thumbnail` placeholder icon when absent. */
  artworkUrl?: string;
  /** Preferred-platform link for this track. */
  linkHref: string;
  /** `true` when `linkHref` is a search URL rather than a direct track link. */
  linkIsSearch: boolean;
  /** Name of the platform the link opens (used in the link's `title`). */
  platformName?: string;
  isDeleting: boolean;
  onDelete: () => void;
}

/**
 * One row of the "Ma bibliothèque" modal: cover, title/artist, open-on-platform
 * link, and remove action. Purely presentational — the container owns the
 * store reads and the delete flow (optimistic removal + undo toast).
 */
export function LikedTrackRowView({
  title,
  artist,
  artworkUrl,
  linkHref,
  linkIsSearch,
  platformName,
  isDeleting,
  onDelete,
}: LikedTrackRowProps) {
  return (
    <div
      role="listitem"
      className={cn('group flex items-center gap-3 py-2', isDeleting && 'opacity-50')}
    >
      <Thumbnail {...(artworkUrl ? { src: artworkUrl } : {})} alt={title} className="bg-surface" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-text">{title}</p>
        <p className="truncate text-caption text-text-muted">{artist}</p>
      </div>

      <div className="flex items-center gap-1">
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex size-11 cursor-pointer items-center justify-center rounded-full',
            'text-text-faint transition-colors duration-150 ease-out-quart hover:bg-surface hover:text-text',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80'
          )}
          title={linkIsSearch ? `Rechercher sur ${platformName}` : `Ouvrir sur ${platformName}`}
        >
          {linkIsSearch ? <Search className="size-4" /> : <ExternalLink className="size-4" />}
        </a>

        <Button
          variant="icon"
          onClick={onDelete}
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
}
