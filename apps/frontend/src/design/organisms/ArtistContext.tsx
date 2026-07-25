import { Modal } from './Modal';
import type { ArtistInfo } from '../../hooks/useArtistInfo';

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
            <div className="h-4 w-full animate-pulse rounded-sm bg-surface-raised" />
            <div className="h-4 w-5/6 animate-pulse rounded-sm bg-surface-raised" />
            <div className="h-4 w-2/3 animate-pulse rounded-sm bg-surface-raised" />
          </div>
        ) : data?.bio ? (
          <p className="text-body text-text-muted leading-relaxed">{data.bio}</p>
        ) : (
          <p className="text-body text-text-muted">Pas d&apos;informations pour cet artiste.</p>
        )}
        {data && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-surface-raised text-caption text-text-faint border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {data && data.similarArtists.length > 0 && (
          <div>
            <p className="text-caption text-text-faint mb-1.5">Artistes similaires</p>
            <div className="flex flex-wrap gap-1.5">
              {data.similarArtists.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelectSimilar?.(name)}
                  className="inline-flex min-h-6 cursor-pointer items-center px-2 py-0.5 rounded-full bg-surface-raised text-caption text-text-muted border border-border transition-colors duration-150 ease-out-quart hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
