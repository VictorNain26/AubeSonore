/** Presentational props for the inline artist bio teaser. */
export type ArtistBioViewProps =
  | { variant: 'loading' }
  | { variant: 'bio'; bio: string; artistName: string; onOpenPanel: () => void };

export function ArtistBioView(props: ArtistBioViewProps) {
  if (props.variant === 'loading') {
    return (
      <div className="flex max-w-prose flex-col gap-2" aria-hidden="true">
        <div
          data-testid="artist-bio-skeleton"
          className="bg-surface-raised h-4 w-full animate-pulse rounded-sm"
        />
        <div
          data-testid="artist-bio-skeleton"
          className="bg-surface-raised h-4 w-5/6 animate-pulse rounded-sm"
        />
        <div
          data-testid="artist-bio-skeleton"
          className="bg-surface-raised h-4 w-2/3 animate-pulse rounded-sm"
        />
      </div>
    );
  }

  return (
    <div className="max-w-prose">
      <p className="text-body text-text-muted line-clamp-3 leading-relaxed">{props.bio}</p>
      <button
        onClick={props.onOpenPanel}
        className="text-caption text-text-faint decoration-border hover:decoration-text mt-1 cursor-pointer underline underline-offset-4 transition-colors"
      >
        En savoir plus sur {props.artistName}
      </button>
    </div>
  );
}
