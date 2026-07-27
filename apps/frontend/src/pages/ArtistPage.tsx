import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { ArtistPageView } from '../design/organisms/ArtistPageView';
import { fetchArtistProfile } from '../lib/artistProfile';

interface FetchResult {
  id: string;
  profile: ArtistProfile | null;
  error: string | null;
}

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<FetchResult | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    fetchArtistProfile(id, controller.signal)
      .then((profile) => {
        setResult({ id, profile, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setResult({ id, profile: null, error: 'Impossible de charger cet artiste.' });
      });

    return () => controller.abort();
  }, [id]);

  // Derived rather than stored: setting loading state synchronously inside the
  // effect would re-render for nothing and trips react-hooks/set-state-in-effect.
  // Comparing the stored id also discards a result that landed for a previous
  // artist, so navigating between pages never flashes the wrong one.
  const isReady = result !== null && result.id === id;

  return (
    <ArtistPageView
      profile={isReady ? result.profile : null}
      isLoading={!isReady}
      error={isReady ? result.error : null}
    />
  );
}
