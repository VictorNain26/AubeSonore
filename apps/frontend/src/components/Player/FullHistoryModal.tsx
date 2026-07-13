import { useCallback } from 'react';
import { History, X, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { useStationHistory } from '../../hooks/useStationHistory';
import { HistoryItem } from './HistoryItem';
import type { SongEntry } from '../../lib/azuracast';

interface FullHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullHistoryModal({ isOpen, onClose }: FullHistoryModalProps) {
  const { tracks, isLoading, error } = useStationHistory(isOpen);
  const likedTracks = useLikedTracksStore((s) => s.tracks);
  const { likingTrackId, toggleLike } = useLikeAction();

  const isEntryLiked = useCallback(
    (entry: SongEntry) => isTrackLiked(likedTracks, entry.song.title, entry.song.artist),
    [likedTracks]
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-overlay/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-x-4 top-1/2 max-w-sm mx-auto z-50"
                initial={{ opacity: 0, y: '-48%', scale: 0.96 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-48%', scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden max-h-[80dvh] flex flex-col">
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-foreground/10 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                          <History className="w-5 h-5 text-foreground/60" />
                        </div>
                        <div>
                          <Dialog.Title className="text-lg font-medium text-foreground">
                            Historique complet
                          </Dialog.Title>
                          <Dialog.Description className="text-xs text-foreground/40">
                            {tracks.length > 0 ? `${tracks.length} morceaux` : 'Chargement…'}
                          </Dialog.Description>
                        </div>
                      </div>
                      <Dialog.Close
                        className={cn(
                          'p-2 rounded-full cursor-pointer',
                          'text-foreground/40 hover:text-foreground hover:bg-foreground/10',
                          'transition-all duration-200'
                        )}
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="overflow-y-auto flex-1 px-5 py-3">
                    {isLoading && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-foreground/30 animate-spin" />
                      </div>
                    )}

                    {error && !isLoading && (
                      <p className="text-sm text-foreground/40 text-center py-8">
                        Impossible de charger l&apos;historique.
                      </p>
                    )}

                    {!isLoading && !error && tracks.length === 0 && (
                      <p className="text-sm text-foreground/40 text-center py-8">
                        Aucun morceau dans l&apos;historique.
                      </p>
                    )}

                    {!isLoading && tracks.length > 0 && (
                      <div role="list">
                        {tracks.map((entry) => (
                          <HistoryItem
                            key={entry.sh_id}
                            entry={entry}
                            isLiked={isEntryLiked(entry)}
                            isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
                            onToggle={() => {
                              void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
