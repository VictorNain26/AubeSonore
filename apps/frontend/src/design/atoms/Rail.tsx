import type { ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

export interface RailProps {
  /** Nom accessible de la liste défilante (`role="list"`). */
  ariaLabel: string;
  /** Entrées de la piste, chacune portant `role="listitem"`. */
  children: ReactNode;
}

/**
 * Piste horizontale défilable au doigt/à la souris (Embla), sans flèches ni scrollbar visible.
 */
export function Rail({ ariaLabel, children }: RailProps) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps',
  });

  return (
    <div ref={emblaRef} className="overflow-hidden">
      <div
        role="list"
        aria-label={ariaLabel}
        className="flex cursor-grab gap-4 active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
}
