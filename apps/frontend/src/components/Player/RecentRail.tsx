import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useVelocity } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRecentHistory } from '../../hooks/useRecentHistory';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { getMoment, MOMENT_SHARE_PHRASES } from '../../lib/moments';
import { RailCard } from './RailCard';
import type { SongEntry } from '../../lib/azuracast';

export function RecentRail() {
  const { entries, isLoading, error } = useRecentHistory();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();
  const prefersReduced = useReducedMotion();

  const railRef = useRef<HTMLDivElement>(null);
  const { scrollX } = useScroll({ container: railRef });
  const velocity = useVelocity(scrollX);
  // Le geste incline les pochettes : ±4° max, comme des disques qu'on feuillette.
  const tilt = useTransform(velocity, [-1500, 0, 1500], [4, 0, -4], { clamp: true });

  const [isDragging, setIsDragging] = useState(false);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    const el = railRef.current;
    if (!el || prefersReduced) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [prefersReduced]);

  useEffect(() => {
    const el = railRef.current;
    if (!el || prefersReduced) return;

    let tracking = false;
    let captured = false;
    let pointerId: number | null = null;
    let lastX = 0;
    let totalMoved = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      tracking = true;
      captured = false;
      pointerId = e.pointerId;
      lastX = e.clientX;
      totalMoved = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      totalMoved += Math.abs(dx);
      if (!captured) {
        if (totalMoved <= 5) return;
        captured = true;
        el.setPointerCapture(e.pointerId);
        suppressNextClickRef.current = true;
        setIsDragging(true);
      }
      el.scrollLeft -= dx;
    };

    const endDrag = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pointerId) return;
      tracking = false;
      pointerId = null;
      if (captured) {
        captured = false;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        setIsDragging(false);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
    };
  }, [prefersReduced]);

  const handleClickCapture = (e: MouseEvent) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleShare = (entry: SongEntry) => {
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === entry.song.title.toLowerCase() &&
        t.artist.toLowerCase() === entry.song.artist.toLowerCase()
    );
    const url = getTrackShareUrl(
      likedTrack ?? { title: entry.song.title, artist: entry.song.artist },
      preferences?.preferredPlatform
    );
    const moment = getMoment(new Date(entry.played_at * 1000));
    void shareTrack({
      title: entry.song.title,
      artist: entry.song.artist,
      url,
      momentLabel: MOMENT_SHARE_PHRASES[moment],
    })
      .then((result) => {
        if (result === 'copied') toast('Lien copié');
      })
      .catch(() => {
        toast('Partage impossible');
      });
  };

  if (isLoading && entries.length === 0) {
    return (
      <section className="pt-4">
        <div className="rule mb-4" />
        <div className="flex gap-4">
          <div className="skeleton h-[132px] w-[132px]" />
          <div className="skeleton h-[132px] w-[132px]" />
          <div className="skeleton h-[132px] w-[132px]" />
        </div>
      </section>
    );
  }

  return (
    <section className="pt-4">
      <div className="rule mb-4" />
      <h3 className="mb-3 text-caption tracking-widest uppercase text-ink-faint">
        Vient de passer
      </h3>
      {error && (
        <p className="mb-2 text-caption text-ink-faint">
          Historique partiel — actualisation impossible pour le moment.
        </p>
      )}
      {entries.length === 0 ? (
        <p className="text-caption text-ink-faint">
          Le premier morceau de la journée s&apos;écrit en ce moment.
        </p>
      ) : (
        <div
          ref={railRef}
          role="list"
          onClickCapture={handleClickCapture}
          className={cn(
            'rail-mask -mx-6 flex gap-4 overflow-x-auto scroll-pl-6 px-6 pb-2',
            isDragging
              ? 'snap-none cursor-grabbing select-none'
              : cn('snap-x snap-mandatory', !prefersReduced && 'cursor-grab')
          )}
        >
          {entries.map((entry) => (
            <motion.div
              key={entry.sh_id}
              role="presentation"
              {...(prefersReduced ? {} : { style: { rotate: tilt } })}
            >
              <RailCard
                entry={entry}
                isLiked={isTrackLiked(tracks, entry.song.title, entry.song.artist)}
                isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
                onToggle={() =>
                  void toggleLike(entry.song.title, entry.song.artist, entry.song.art)
                }
                onShare={() => handleShare(entry)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
