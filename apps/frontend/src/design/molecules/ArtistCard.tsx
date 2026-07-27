import { Link } from 'react-router';
import { CoverGlyph } from '../atoms/CoverGlyph';
import { cn } from '@/lib/utils';

export interface ArtistCardProps {
  /** Identifiant canonique, seul segment faisant autorité dans l'URL. */
  id: string;
  /** Nom affiché de l'artiste. */
  name: string;
  /** Portrait ; `CoverGlyph` prend le relais quand il est absent. */
  image: string | null;
  /** Segment décoratif de l'URL, ignoré à la résolution. */
  slug?: string | undefined;
  className?: string;
}

/**
 * Carte d'artiste similaire, menant à sa page. Réserve le carré de l'image
 * via `aspect-square` pour ne pas décaler la grille pendant le chargement.
 */
export function ArtistCard({ id, name, image, slug, className }: ArtistCardProps) {
  return (
    <Link
      to={`/artist/${id}${slug ? `/${slug}` : ''}`}
      className={cn(
        'group focus-visible:ring-accent flex w-28 flex-col gap-2 rounded-md p-1',
        'focus-visible:ring-2 focus-visible:outline-none',
        className
      )}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="aspect-square w-full rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <CoverGlyph
          seed={name}
          size="md"
          label={`Portrait de ${name} indisponible`}
          className="aspect-square size-full rounded-md"
        />
      )}
      <span className="text-caption text-text group-hover:text-accent truncate text-center">
        {name}
      </span>
    </Link>
  );
}
