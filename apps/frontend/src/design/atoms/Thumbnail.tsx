import { useState } from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'size-10',
  md: 'size-12',
};

export interface ThumbnailProps {
  /** URL de l'image de pochette. Absente ou en erreur → icône de secours. */
  src?: string;
  /** Texte alternatif de l'image. */
  alt?: string;
  /** Taille du carré : `sm` (40px) ou `md` (48px). */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Vignette carrée pour une pochette de morceau, avec repli automatique sur une icône
 * musicale si `src` est absent ou si l'image échoue à charger.
 */
export function Thumbnail({ src, alt = '', size = 'sm', className }: ThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src) && !imgError;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-sm bg-surface-raised',
        SIZE[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <Music className="absolute inset-0 m-auto size-4 text-text-faint" />
      )}
    </div>
  );
}
