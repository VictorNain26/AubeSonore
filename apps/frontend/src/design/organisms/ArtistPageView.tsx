import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { CoverGlyph } from '../atoms/CoverGlyph';
import { ArtistCard } from '../molecules/ArtistCard';

const PLATFORM_LABELS: Record<string, string> = {
  official: 'Site officiel',
  bandcamp: 'Bandcamp',
  soundcloud: 'SoundCloud',
  wikipedia: 'Wikipédia',
};

export interface ArtistPageViewProps {
  /** Profil agrégé ; `null` tant qu'il charge ou s'il est introuvable. */
  profile: ArtistProfile | null;
  /** Affiche le squelette de chargement. */
  isLoading: boolean;
  /** Message d'erreur à afficher à la place du contenu. */
  error: string | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-caption text-text-muted font-display uppercase">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Page artiste. Chaque section disparaît indépendamment quand sa source est
 * vide ; « Passé sur AubeSonore » et les liens restent le socle affiché même
 * quand aucune source externe ne connaît l'artiste.
 */
export function ArtistPageView({ profile, isLoading, error }: ArtistPageViewProps) {
  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-6 p-4"
        role="status"
        aria-busy="true"
        aria-label="Chargement de l’artiste"
      >
        <div className="bg-surface-raised h-40 w-40 animate-pulse rounded-md" />
        <div className="bg-surface-raised h-4 w-2/3 animate-pulse rounded-sm" />
        <div className="bg-surface-raised h-4 w-1/2 animate-pulse rounded-sm" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <h1 className="text-title text-text">Artiste introuvable</h1>
        <p className="text-body text-text-muted">{error ?? 'Cet artiste n’a pas de page.'}</p>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-8 p-4 pb-24">
      <header className="flex items-end gap-4">
        {profile.image ? (
          <img
            src={profile.image}
            alt={profile.name}
            className="aspect-square w-32 rounded-md object-cover"
          />
        ) : (
          <CoverGlyph
            seed={profile.name}
            size="md"
            label={`Portrait de ${profile.name} indisponible`}
            className="aspect-square w-32 rounded-md"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-display text-text font-display truncate">{profile.name}</h1>
          {profile.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                <li key={tag} className="text-caption text-text-muted">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      {profile.bio ? (
        <Section title="Biographie">
          <p className="text-body text-text-muted">{profile.bio}</p>
        </Section>
      ) : null}

      {profile.playedOnRadio.length > 0 ? (
        <Section title="Passé sur AubeSonore">
          <ul className="flex flex-col gap-2">
            {profile.playedOnRadio.map((play) => (
              <li key={`${play.playedAt}-${play.title}`} className="text-body text-text">
                {play.title}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {profile.similar.length > 0 ? (
        <Section title="Artistes similaires">
          <div className="flex flex-wrap gap-3">
            {profile.similar.map((similar) => (
              <ArtistCard
                key={similar.id}
                id={similar.id}
                name={similar.name}
                image={similar.image}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {profile.links.length > 0 ? (
        <Section title="Écouter ailleurs">
          <ul className="flex flex-col gap-2">
            {profile.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-body text-accent hover:underline focus-visible:underline"
                >
                  {PLATFORM_LABELS[link.platform] ?? link.platform}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
