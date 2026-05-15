import { memo, useMemo } from 'react';
import { BarChart3, Clock, Disc3, Flame, Users, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStatsStore } from '../stores/statsStore';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <Icon className="w-4 h-4 text-accent" />
      <span className="text-lg font-medium text-white tabular-nums">{value}</span>
      <span className="text-[11px] text-white/40">{label}</span>
    </div>
  );
});

function formatListeningTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const getMonthlyStats = useStatsStore((s) => s.getMonthlyStats);
  const stats = useMemo(() => getMonthlyStats(), [getMonthlyStats]);

  const maxCount = stats.topArtists[0]?.count ?? 1;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
                <div
                  className={cn(
                    'bg-black/80 backdrop-blur-md rounded-2xl',
                    'border border-white/10 shadow-2xl overflow-hidden'
                  )}
                >
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <Dialog.Title className="text-lg font-medium text-white">
                            Mes statistiques
                          </Dialog.Title>
                          <Dialog.Description className="text-xs text-white/40">
                            30 derniers jours
                          </Dialog.Description>
                        </div>
                      </div>
                      <Dialog.Close
                        className={cn(
                          'p-2 rounded-full cursor-pointer',
                          'text-white/40 hover:text-white hover:bg-white/10',
                          'transition-all duration-200'
                        )}
                        aria-label="Fermer"
                      >
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <StatCard
                        icon={Clock}
                        label="Temps d'écoute"
                        value={formatListeningTime(stats.totalMinutes)}
                      />
                      <StatCard
                        icon={Users}
                        label="Artistes découverts"
                        value={String(stats.uniqueArtists)}
                      />
                      <StatCard
                        icon={Flame}
                        label="Jours consécutifs"
                        value={String(stats.streak)}
                      />
                      <StatCard
                        icon={Disc3}
                        label="Morceaux entendus"
                        value={String(stats.tracksHeard)}
                      />
                    </div>

                    {/* Top Artists */}
                    {stats.topArtists.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 mb-3">Top artistes</p>
                        <div className="space-y-2">
                          {stats.topArtists.map((artist, i) => (
                            <div key={artist.name} className="flex items-center gap-3">
                              <span className="text-xs text-white/30 w-4 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-white truncate">{artist.name}</span>
                                  <span className="text-xs text-white/40 tabular-nums ml-2">
                                    {artist.count}
                                  </span>
                                </div>
                                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-accent/60"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(artist.count / maxCount) * 100}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
