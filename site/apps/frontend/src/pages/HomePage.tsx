import { ErrorBoundary } from 'react-error-boundary';
import { PlayerSideEffects } from '../components/Player/PlayerSideEffects';
import { ArtistContext } from '../components/Player/ArtistContext';
import { PlayerErrorFallback } from '../design/organisms/ErrorFallback';
import { Hero } from '../home/Hero';
import { SinceDawn } from '../home/SinceDawn';
import { MostKept } from '../home/MostKept';
import { SiteFooter } from '../home/SiteFooter';

export default function HomePage() {
  return (
    <>
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Hero />
      </ErrorBoundary>
      <main id="main" className="flex flex-col gap-18 px-6 py-14 md:gap-35 md:px-10 md:py-30">
        <SinceDawn />
        <MostKept />
      </main>
      <SiteFooter />
      <ArtistContext />
      <PlayerSideEffects />
    </>
  );
}
