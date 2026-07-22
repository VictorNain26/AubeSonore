import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CoverGlyph } from './CoverGlyph';

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
  /** Chaîne source du hash déterministe du repli (ex. `${artist}|${title}`). Par défaut, `alt`. */
  seed?: string;
  className?: string;
}

/**
 * Vignette carrée pour une pochette de morceau, avec repli automatique sur un
 * `CoverGlyph` déterministe si `src` est absent ou si l'image échoue à charger.
 */
export function Thumbnail({ src, alt = '', size = 'sm', seed, className }: ThumbnailProps) {
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
        <CoverGlyph seed={seed ?? alt} size={size} className="size-full" />
      )}
    </div>
  );
}
