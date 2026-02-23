import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useArtistInfo } from '../../hooks/useArtistInfo';

interface ArtistContextProps {
  artistName: string | undefined;
}

export function ArtistContext({ artistName }: ArtistContextProps) {
  const { data, isLoading } = useArtistInfo(artistName);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  if (!artistName || isLoading || !data || !data.bio) return null;

  const bioPreview = data.bio.length > 150 ? data.bio.slice(0, 150) + '...' : data.bio;

  return (
    <div className="border-t border-white/10 pt-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-1 cursor-pointer',
          'text-left group'
        )}
      >
        <span className="text-xs text-muted-foreground">
          À propos de <span className="text-white/70">{artistName}</span>
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-white/30 transition-transform duration-200',
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
                <p className="text-sm text-white/60 leading-relaxed">
                  {showFullBio ? data.bio : bioPreview}
                </p>
                {data.bio.length > 150 && (
                  <button
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-xs text-purple-400/80 hover:text-purple-400 mt-1 cursor-pointer"
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
                      className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-white/50 border border-white/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Similar Artists */}
              {data.similarArtists.length > 0 && (
                <div>
                  <p className="text-[11px] text-white/30 mb-1.5">Artistes similaires</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.similarArtists.map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-full bg-purple-500/10 text-[11px] text-purple-300/70 border border-purple-500/10"
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
