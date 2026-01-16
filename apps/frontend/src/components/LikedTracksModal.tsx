import { useState } from 'react';
import { X, Library, ExternalLink, Music, Trash2, ChevronRight, Sparkles } from 'lucide-react';
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
// Helper: récupérer le lien de la plateforme préférée
// ─────────────────────────────────────────────

function getPreferredLink(
  track: LikedTrack,
  preferredPlatform: PreferredPlatform
): string | null {
  if (track.platformLinks) {
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey as keyof PlatformLinks];
    if (preferred) return preferred;

    const firstAvailable = Object.values(track.platformLinks).find(Boolean);
    if (firstAvailable) return firstAvailable;
  }

  if (track.songlinkUrl) return track.songlinkUrl;
  return track.youtubeUrl;
}

// ─────────────────────────────────────────────
// Composant TrackCard - Design Spotify-like
// ─────────────────────────────────────────────

interface TrackCardProps {
  track: LikedTrack;
  preferredPlatform: PreferredPlatform;
  onDelete: (id: string) => void;
  index: number;
}

function TrackCard({ track, preferredPlatform, onDelete, index }: TrackCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const artwork = imgError ? null : (track.artworkBase64 || track.artworkUrl);
  const link = getPreferredLink(track, preferredPlatform);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(track.id);
  };

  const selectedPlatform = PLATFORMS.find((p) => p.id === preferredPlatform);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-xl',
        'bg-white/[0.03] hover:bg-white/[0.08]',
        'transition-all duration-300 ease-out',
        'border border-transparent hover:border-white/10',
        isDeleting && 'opacity-50 scale-95'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Artwork with gradient overlay */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 shadow-lg">
        {artwork ? (
          <img
            src={artwork}
            alt={track.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600/40 to-pink-600/30 flex items-center justify-center">
            <Music className="w-6 h-6 text-white/60" />
          </div>
        )}

        {/* Play overlay on hover */}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/50 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
              <span className="text-base">{selectedPlatform?.icon || '▶'}</span>
            </div>
          </a>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0 py-1">
        <p className="text-sm font-medium text-white truncate mb-0.5">
          {track.title}
        </p>
        <p className="text-xs text-white/50 truncate">
          {track.artist}
        </p>
      </div>

      {/* Actions */}
      <div
        className={cn(
          'flex items-center gap-1 transition-all duration-200',
          showActions ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
        )}
      >
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'p-2 rounded-full',
              'text-white/40 hover:text-white hover:bg-white/10',
              'transition-all duration-200'
            )}
            title={`Ouvrir sur ${selectedPlatform?.name}`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            'p-2 rounded-full',
            'text-white/40 hover:text-red-400 hover:bg-red-500/10',
            'transition-all duration-200',
            isDeleting && 'cursor-not-allowed'
          )}
          title="Retirer de la bibliothèque"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile: Chevron indicator */}
      <div className="sm:hidden">
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant PlatformPill - Compact selector
// ─────────────────────────────────────────────

interface PlatformPillProps {
  selected: PreferredPlatform;
  onChange: (platform: PreferredPlatform) => void;
}

function PlatformPill({ selected, onChange }: PlatformPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPlatform = PLATFORMS.find((p) => p.id === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-white/5 hover:bg-white/10 border border-white/10',
          'transition-all duration-200 text-sm'
        )}
      >
        <span>{selectedPlatform?.icon}</span>
        <span className="text-white/70">{selectedPlatform?.name}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
            <div className="p-1.5">
              <p className="text-[10px] uppercase tracking-wider text-white/30 px-3 py-2 font-medium">
                Ouvrir avec
              </p>
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    onChange(platform.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm',
                    'transition-all duration-150',
                    selected === platform.id
                      ? 'bg-purple-500/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span className="text-base">{platform.icon}</span>
                  <span>{platform.name}</span>
                  {selected === platform.id && (
                    <span className="ml-auto text-purple-400">✓</span>
                  )}
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
// Composant EmptyState - Motivational design
// ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Library className="w-10 h-10 text-purple-400/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        Votre bibliothèque est vide
      </h3>
      <p className="text-sm text-white/40 max-w-[240px] leading-relaxed">
        Survolez la pochette d'album et appuyez sur{' '}
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-xs">+</span>{' '}
        pour sauvegarder vos morceaux préférés
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant Principal - Modal
// ─────────────────────────────────────────────

export function LikedTracksModal({ isOpen, onClose }: LikedTracksModalProps) {
  const { tracks, isLoading, unlikeTrack } = useLikedTracks();
  const { preferences, updatePlatform } = usePreferences();

  const preferredPlatform = preferences?.preferredPlatform || 'spotify';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-x-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 max-w-md mx-auto z-50">
        <div
          className={cn(
            'bg-gradient-to-b from-gray-900/98 to-black/98',
            'rounded-t-3xl sm:rounded-2xl',
            'border border-white/10 border-b-0 sm:border-b',
            'shadow-2xl shadow-black/50',
            'overflow-hidden flex flex-col',
            'max-h-[85vh] sm:max-h-[75vh]'
          )}
        >
          {/* Header - Sleek design */}
          <div className="relative px-5 pt-5 pb-4 shrink-0">
            {/* Mobile drag indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Library className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
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
                  'p-2 rounded-full',
                  'bg-white/5 hover:bg-white/10',
                  'text-white/60 hover:text-white',
                  'transition-all duration-200'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform selector - only show if has tracks */}
            {tracks.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <span className="text-xs text-white/40">Plateforme préférée</span>
                <PlatformPill
                  selected={preferredPlatform}
                  onChange={updatePlatform}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 overscroll-contain">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
                </div>
              </div>
            ) : tracks.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    preferredPlatform={preferredPlatform}
                    onDelete={unlikeTrack}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Safe area padding for mobile */}
          <div className="h-safe-area-inset-bottom sm:hidden" />
        </div>
      </div>
    </>
  );
}
