import { useState } from 'react';
import { cn } from '@/lib/utils';
import { isDefaultArtwork } from '../lib/azuracast';
import { CoverGlyph } from '../design/atoms/CoverGlyph';

export interface CoverProps {
  src: string | null | undefined;
  alt: string;
  /** Seed of the fallback glyph shown when there is no usable artwork. */
  seed: string;
  className?: string;
  priority?: boolean;
}

export function Cover({ src, alt, seed, className, priority = false }: CoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = !isDefaultArtwork(src) && src !== failedSrc;

  return (
    <div className={cn('bg-surface-raised overflow-hidden rounded-sm', className)}>
      {usable ? (
        <img
          src={src ?? undefined}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="size-full object-cover"
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <CoverGlyph seed={seed} size="md" className="size-full" />
      )}
    </div>
  );
}
