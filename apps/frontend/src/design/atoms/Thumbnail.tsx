import { useState } from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'size-10',
  md: 'size-12',
};

export interface ThumbnailProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md';
  className?: string;
}

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
