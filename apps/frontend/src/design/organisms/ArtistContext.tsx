import { Modal } from './Modal';
import type { ArtistInfo } from '../../hooks/useArtistInfo';
import * as m from '@/paraglide/messages.js';

/** Presentational props for the artist bio modal. */
export interface ArtistContextViewProps {
  /** Artist name, used as the modal title. */
  artistName: string;
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Called when the modal requests to close (backdrop, escape, close button). */
  onClose: () => void;
  /** Whether the artist info is still loading. */
  isLoading: boolean;
  /** Artist info payload, once loaded. */
  data: ArtistInfo | null;
  /** Called when a similar-artist chip is selected, to navigate to its bio. */
  onSelectSimilar?: (name: string) => void;
}

export function ArtistContextView({
  artistName,
  isOpen,
  onClose,
  isLoading,
  data,
  onSelectSimilar,
}: ArtistContextViewProps) {
  return (
    <Modal title={artistName} open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="bg-surface-raised h-4 w-full animate-pulse rounded-sm" />
            <div className="bg-surface-raised h-4 w-5/6 animate-pulse rounded-sm" />
            <div className="bg-surface-raised h-4 w-2/3 animate-pulse rounded-sm" />
          </div>
        ) : data?.bio ? (
          <p className="text-body text-text-muted leading-relaxed">{data.bio}</p>
        ) : (
          <p className="text-body text-text-muted">{m.artist_no_info()}</p>
        )}
        {data && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-raised text-caption text-text-faint border-border rounded-full border px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {data && data.similarArtists.length > 0 && (
          <div>
            <p className="text-caption text-text-faint mb-1.5">{m.artist_similar()}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.similarArtists.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelectSimilar?.(name)}
                  className="bg-surface-raised text-caption text-text-muted border-border ease-out-quart hover:bg-surface hover:text-text focus-visible:outline-accent inline-flex min-h-6 cursor-pointer items-center rounded-full border px-2 py-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
