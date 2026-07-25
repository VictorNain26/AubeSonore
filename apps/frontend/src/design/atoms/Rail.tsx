import { useEffect, useState, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as m from '@/paraglide/messages.js';
import { cn } from '@/lib/utils';

export interface RailProps {
  /** Nom accessible de la liste défilante (`role="list"`). */
  ariaLabel: string;
  /** Entrées de la piste, chacune portant `role="listitem"`. */
  children: ReactNode;
}

const ARROW_CLASS =
  'absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised text-text-muted opacity-0 transition-opacity duration-150 ease-out-quart hover:bg-surface hover:text-text focus-visible:opacity-100 group-hover/rail:opacity-100 pointer-coarse:hidden';

/**
 * Piste horizontale défilable au doigt/à la souris (Embla), sans scrollbar visible.
 * Affordances de défilement : fondu sur les bords masqués et flèches précédent/suivant
 * au survol (pointeurs fins uniquement — le tactile glisse nativement).
 */
export function Rail({ ariaLabel, children }: RailProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps',
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    update();
    emblaApi.on('select', update).on('reInit', update);
    return () => {
      emblaApi.off('select', update).off('reInit', update);
    };
  }, [emblaApi]);

  const maskImage =
    canScrollPrev && canScrollNext
      ? 'linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)'
      : canScrollNext
        ? 'linear-gradient(to right, black calc(100% - 2rem), transparent)'
        : canScrollPrev
          ? 'linear-gradient(to right, transparent, black 2rem)'
          : undefined;

  return (
    <div className="group/rail relative">
      <div
        ref={emblaRef}
        className="overflow-hidden"
        style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
      >
        <div
          role="list"
          aria-label={ariaLabel}
          className="flex cursor-grab gap-4 active:cursor-grabbing"
        >
          {children}
        </div>
      </div>

      {canScrollPrev && (
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label={m.rail_scroll_left()}
          className={cn(ARROW_CLASS, 'left-1')}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          aria-label={m.rail_scroll_right()}
          className={cn(ARROW_CLASS, 'right-1')}
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}
