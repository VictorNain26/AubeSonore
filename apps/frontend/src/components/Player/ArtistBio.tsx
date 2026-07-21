import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';

interface ArtistBioProps {
  onOpenPanel: () => void;
}

export function ArtistBio({ onOpenPanel }: ArtistBioProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  if (isLoading) {
    return (
      <div className="flex max-w-prose flex-col gap-2" aria-hidden="true">
        <div data-testid="artist-bio-skeleton" className="h-4 w-full skeleton" />
        <div data-testid="artist-bio-skeleton" className="h-4 w-5/6 skeleton" />
        <div data-testid="artist-bio-skeleton" className="h-4 w-2/3 skeleton" />
      </div>
    );
  }

  if (!data?.bio) return null;

  return (
    <div className="max-w-prose">
      <p className="text-body text-text-muted leading-relaxed line-clamp-3">{data.bio}</p>
      <button
        onClick={onOpenPanel}
        className="mt-1 cursor-pointer text-caption text-text-faint underline decoration-border underline-offset-4 hover:decoration-text transition-colors"
      >
        En savoir plus sur {artistName}
      </button>
    </div>
  );
}
