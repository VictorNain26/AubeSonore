import { useState } from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThumbnailProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClass = {
  sm: 'size-12',
  md: 'size-20',
};

export function Thumbnail({ src, alt, size = 'md', className }: ThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const shouldShowImage = src && !hasError;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-sm bg-surface-raised',
        sizeClass[size],
        className
      )}
    >
      {shouldShowImage ? (
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <Music className="absolute inset-0 m-auto size-4 text-text-faint" />
      )}
    </div>
  );
}
