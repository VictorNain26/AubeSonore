import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';

interface ArtistBioProps {
  onOpenPanel: () => void;
}

/** Presentational props for the inline artist bio teaser. */
export type ArtistBioViewProps =
  | { variant: 'loading' }
  | { variant: 'bio'; bio: string; artistName: string; onOpenPanel: () => void };

export function ArtistBioView(props: ArtistBioViewProps) {
  if (props.variant === 'loading') {
    return (
      <div className="flex max-w-prose flex-col gap-2" aria-hidden="true">
        <div
          data-testid="artist-bio-skeleton"
          className="h-4 w-full animate-pulse rounded-sm bg-surface-raised"
        />
        <div
          data-testid="artist-bio-skeleton"
          className="h-4 w-5/6 animate-pulse rounded-sm bg-surface-raised"
        />
        <div
          data-testid="artist-bio-skeleton"
          className="h-4 w-2/3 animate-pulse rounded-sm bg-surface-raised"
        />
      </div>
    );
  }

  return (
    <div className="max-w-prose">
      <p className="text-body text-text-muted leading-relaxed line-clamp-3">{props.bio}</p>
      <button
        onClick={props.onOpenPanel}
        className="mt-1 cursor-pointer text-caption text-text-faint underline decoration-border underline-offset-4 hover:decoration-text transition-colors"
      >
        En savoir plus sur {props.artistName}
      </button>
    </div>
  );
}

export function ArtistBio({ onOpenPanel }: ArtistBioProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  if (isLoading) {
    return <ArtistBioView variant="loading" />;
  }

  if (!data?.bio) return null;

  return (
    <ArtistBioView variant="bio" bio={data.bio} artistName={artistName} onOpenPanel={onOpenPanel} />
  );
}
