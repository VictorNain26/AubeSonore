import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ModalShell } from '../ui/ModalShell';

interface ArtistContextProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArtistContext({ isOpen, onClose }: ArtistContextProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);

  if (!artistName) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={artistName} description="Contexte">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="h-4 w-2/3 skeleton" />
          </div>
        ) : data?.bio ? (
          <p className="text-body text-ink-soft leading-relaxed">{data.bio}</p>
        ) : (
          <p className="text-body text-ink-soft">Pas d&apos;informations pour cet artiste.</p>
        )}
        {data && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-paper-raised text-caption text-ink-faint border border-line"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {data && data.similarArtists.length > 0 && (
          <div>
            <p className="text-caption text-ink-faint mb-1.5">Artistes similaires</p>
            <div className="flex flex-wrap gap-1.5">
              {data.similarArtists.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-full bg-paper-raised text-caption text-ink-soft border border-line"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
