import { useState } from 'react';
import { X, Library, ExternalLink, Music, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLikedTracks } from '../hooks/useLikedTracks';
import { usePreferences, PLATFORMS } from '../hooks/usePreferences';
import type { LikedTrack, PreferredPlatform, PlatformLinks } from '../lib/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LikedTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Helper: URLs de recherche par plateforme
// ─────────────────────────────────────────────

function getSearchUrl(platform: PreferredPlatform, query: string): string {
  const encoded = encodeURIComponent(query);
  const urls: Record<PreferredPlatform, string> = {
    spotify: `https://open.spotify.com/search/${encoded}`,
    appleMusic: `https://music.apple.com/search?term=${encoded}`,
    deezer: `https://www.deezer.com/search/${encoded}`,
    youtubeMusic: `https://music.youtube.com/search?q=${encoded}`,
    youtube: `https://www.youtube.com/results?search_query=${encoded}`,
    tidal: `https://listen.tidal.com/search?q=${encoded}`,
    amazonMusic: `https://music.amazon.com/search/${encoded}`,
    soundcloud: `https://soundcloud.com/search?q=${encoded}`,
  };
  return urls[platform];
}

// ─────────────────────────────────────────────
// Helper: récupérer le lien de la plateforme préférée
// ─────────────────────────────────────────────

function getPreferredLink(
  track: LikedTrack,
  preferredPlatform: PreferredPlatform
): { url: string; isSearch: boolean } {
  // Si on a des liens enrichis, utiliser la plateforme préférée
  if (track.platformLinks) {
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey as keyof PlatformLinks];
    if (preferred) return { url: preferred, isSearch: false };

    // Fallback: premier lien disponible
    const firstAvailable = Object.values(track.platformLinks).find(Boolean);
    if (firstAvailable) return { url: firstAvailable, isSearch: false };
  }

  // Fallback: lien Songlink global
  if (track.songlinkUrl) return { url: track.songlinkUrl, isSearch: false };

  // Dernier recours: URL de recherche sur la plateforme préférée
  const query = `${track.title} ${track.artist}`;
  return { url: getSearchUrl(preferredPlatform, query), isSearch: true };
}

// ─────────────────────────────────────────────
// Composant TrackItem - Style Player
// ─────────────────────────────────────────────

interface TrackItemProps {
  track: LikedTrack;
  preferredPlatform: PreferredPlatform;
  onDelete: (id: string) => void;
}

function TrackItem({ track, preferredPlatform, onDelete }: TrackItemProps) {
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const artwork = imgError ? null : (track.artworkBase64 || track.artworkUrl);
  const { url: link, isSearch } = getPreferredLink(track, preferredPlatform);
  const selectedPlatform = PLATFORMS.find((p) => p.id === preferredPlatform);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(track.id);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 py-2',
        isDeleting && 'opacity-50'
      )}
    >
      {/* Artwork */}
      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
        {artwork ? (
          <img
            src={artwork}
            alt={track.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="w-5 h-5 text-white/30" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{track.title}</p>
        <p className="text-xs text-white/50 truncate">{track.artist}</p>
      </div>

      {/* Actions - always visible */}
      <div className="flex items-center gap-1">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'p-2 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer',
            'text-white/40 hover:text-white hover:bg-white/10',
            'transition-all duration-200'
          )}
          title={isSearch ? `Rechercher sur ${selectedPlatform?.name}` : `Ouvrir sur ${selectedPlatform?.name}`}
        >
          {isSearch ? <Search className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
        </a>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            'p-2 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center',
            'text-white/40 hover:text-red-400 hover:bg-white/10',
            'transition-all duration-200',
            isDeleting ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
          title="Retirer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant PlatformSelector - Style Player
// ─────────────────────────────────────────────

interface PlatformSelectorProps {
  selected: PreferredPlatform;
  onChange: (platform: PreferredPlatform) => void;
}

function PlatformSelector({ selected, onChange }: PlatformSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPlatform = PLATFORMS.find((p) => p.id === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer',
          'bg-white/5 hover:bg-white/10 border border-white/10',
          'transition-all duration-200 text-sm'
        )}
      >
        <span className="text-white/60">{selectedPlatform?.name}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 shadow-xl z-50 overflow-hidden">
            <div className="p-1 max-h-[280px] overflow-y-auto">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    onChange(platform.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center px-3 py-2.5 rounded-lg text-left text-sm cursor-pointer',
                    'transition-all duration-200',
                    selected === platform.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant EmptyState - Style Player
// ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Library className="w-8 h-8 text-white/30" />
      </div>
      <p className="text-sm text-white/50 mb-1">Votre bibliothèque est vide</p>
      <p className="text-xs text-white/30 max-w-[200px]">
        Survolez la pochette et appuyez sur + pour sauvegarder
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant Principal - Modal style Player
// ─────────────────────────────────────────────

export function LikedTracksModal({ isOpen, onClose }: LikedTracksModalProps) {
  const { tracks, isLoading, unlikeTrack } = useLikedTracks();
  const { preferences, updatePlatform } = usePreferences();

  const preferredPlatform = preferences?.preferredPlatform || 'spotify';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal - style Player */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50">
        <div
          className={cn(
            'bg-black/80 backdrop-blur-md rounded-2xl',
            'border border-white/10 shadow-2xl overflow-hidden',
            'max-h-[70vh] flex flex-col'
          )}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 shrink-0 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Library className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">
                    Ma Bibliothèque
                  </h2>
                  <p className="text-xs text-white/40">
                    {tracks.length} {tracks.length > 1 ? 'titres' : 'titre'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-full cursor-pointer',
                  'text-white/40 hover:text-white hover:bg-white/10',
                  'transition-all duration-200'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform selector */}
            {tracks.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className="text-xs text-white/40">Ouvrir avec</span>
                <PlatformSelector
                  selected={preferredPlatform}
                  onChange={updatePlatform}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
              </div>
            ) : tracks.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-white/5">
                {tracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    preferredPlatform={preferredPlatform}
                    onDelete={unlikeTrack}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
