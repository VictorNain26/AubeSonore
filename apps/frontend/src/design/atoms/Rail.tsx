import type { ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

export interface RailProps {
  ariaLabel: string;
  children: ReactNode;
}

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
