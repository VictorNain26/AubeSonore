import { useState } from 'react';
import { X, Heart, ExternalLink, Music, Trash2, RefreshCw, Settings } from 'lucide-react';
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
  // Si le track a des liens par plateforme
  if (track.platformLinks) {
    // Essayer d'abord la plateforme préférée
    const platformKey = preferredPlatform === 'youtube' ? 'youtubeMusic' : preferredPlatform;
    const preferred = track.platformLinks[platformKey as keyof PlatformLinks];
    if (preferred) return preferred;

    // Sinon, prendre le premier lien disponible
    const firstAvailable = Object.values(track.platformLinks).find(Boolean);
    if (firstAvailable) return firstAvailable;
  }

  // Fallback: lien Songlink universel
  if (track.songlinkUrl) return track.songlinkUrl;

  // Dernier recours: lien YouTube original
  return track.youtubeUrl;
}

// ─────────────────────────────────────────────
// Composant TrackItem
// ─────────────────────────────────────────────

interface TrackItemProps {
  track: LikedTrack;
  preferredPlatform: PreferredPlatform;
  onDelete: (id: string) => void;
}

function TrackItem({ track, preferredPlatform, onDelete }: TrackItemProps) {
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Déterminer l'image à utiliser (URL ou base64)
  const artwork = imgError ? null : (track.artworkBase64 || track.artworkUrl);
  const link = getPreferredLink(track, preferredPlatform);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(track.id);
  };

  // Trouver l'info de la plateforme pour afficher son nom
  const availablePlatforms = track.platformLinks
    ? PLATFORMS.filter((p) => track.platformLinks?.[p.id as keyof PlatformLinks])
    : [];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
      {/* Artwork */}
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
        {artwork && !imgError ? (
          <img
            src={artwork}
            alt={track.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        {availablePlatforms.length > 0 && (
          <div className="flex gap-1 mt-1">
            {availablePlatforms.slice(0, 4).map((p) => (
              <span key={p.id} className="text-xs" title={p.name}>
                {p.icon}
              </span>
            ))}
            {availablePlatforms.length > 4 && (
              <span className="text-xs text-muted-foreground">+{availablePlatforms.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Ouvrir sur la plateforme */}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Ouvrir sur la plateforme"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Supprimer */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            'p-2 rounded-full hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors',
            isDeleting && 'opacity-50 cursor-not-allowed'
          )}
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant PlatformSelector
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
      >
        <Settings className="w-4 h-4" />
        <span>{selectedPlatform?.icon}</span>
        <span className="hidden sm:inline">{selectedPlatform?.name}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-black/90 backdrop-blur-md border border-white/10 shadow-xl z-50">
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-1">Plateforme par défaut</p>
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    onChange(platform.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors',
                    selected === platform.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span>{platform.icon}</span>
                  <span>{platform.name}</span>
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
// Composant Principal
// ─────────────────────────────────────────────

export function LikedTracksModal({ isOpen, onClose }: LikedTracksModalProps) {
  const { tracks, isLoading, unlikeTrack, refreshTracks } = useLikedTracks();
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

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto max-h-[80vh] z-50">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400 fill-red-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Mes morceaux likés
              </h2>
              <span className="text-sm text-muted-foreground">
                ({tracks.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <PlatformSelector
                selected={preferredPlatform}
                onChange={updatePlatform}
              />
              <button
                onClick={refreshTracks}
                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Heart className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-muted-foreground">Aucun morceau liké</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Cliquez sur ❤️ pendant la lecture pour sauvegarder vos morceaux préférés
                </p>
              </div>
            ) : (
              tracks.map((track) => (
                <TrackItem
                  key={track.id}
                  track={track}
                  preferredPlatform={preferredPlatform}
                  onDelete={unlikeTrack}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
