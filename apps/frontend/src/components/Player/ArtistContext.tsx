import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ModalShell } from '../ui/ModalShell';

interface ArtistContextProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArtistContext({ isOpen, onClose }: ArtistContextProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data } = useArtistInfo(artistName);

  if (!artistName || !data?.bio) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={artistName} description="Contexte">
      <div className="space-y-4">
        <p className="text-body text-ink-soft leading-relaxed">{data.bio}</p>
        {data.tags.length > 0 && (
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
        {data.similarArtists.length > 0 && (
          <div>
            <p className="text-caption text-ink-faint mb-1.5">Artistes similaires</p>
            <div className="flex flex-wrap gap-1.5">
              {data.similarArtists.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-full bg-paper-raised text-caption text-accent border border-line"
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
