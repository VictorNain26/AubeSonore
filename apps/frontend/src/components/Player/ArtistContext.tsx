import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { useNowPlayingStore } from '../../lib/azuracast';

// Subscribes directly to the artist primitive: only re-renders when the
// artist name actually changes (so the surrounding poll re-fetches that
// keep the artist stable do not trigger a re-render here).

export function ArtistContext() {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data, isLoading } = useArtistInfo(artistName);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  if (!artistName || isLoading || !data || !data.bio) return null;

  const bioPreview = data.bio.length > 150 ? data.bio.slice(0, 150) + '...' : data.bio;

  return (
    <div className="rule pt-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-1 cursor-pointer',
          'text-left group'
        )}
      >
        <span className="text-caption tracking-widest uppercase text-ink-faint">
          À propos de{' '}
          <span className="text-ink-soft normal-case tracking-normal">{artistName}</span>
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-ink-faint transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 px-1 space-y-3">
              {/* Bio */}
              <div>
                <p className="text-body text-ink-soft leading-relaxed">
                  {showFullBio ? data.bio : bioPreview}
                </p>
                {data.bio.length > 150 && (
                  <button
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-caption text-accent/80 hover:text-accent mt-1 cursor-pointer"
                  >
                    {showFullBio ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </div>

              {/* Genre Tags */}
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

              {/* Similar Artists */}
              {data.similarArtists.length > 0 && (
                <div>
                  <p className="text-caption text-ink-faint mb-1.5">Artistes similaires</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.similarArtists.map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-full bg-paper-raised text-caption text-accent/70 border border-line"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
