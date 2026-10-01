import { ErrorBoundary } from 'react-error-boundary';
import { PlayerSideEffects } from '../components/Player/PlayerSideEffects';
import { ArtistContext } from '../components/Player/ArtistContext';
import { PlayerErrorFallback } from '../design/organisms/ErrorFallback';
import { Hero } from '../home/Hero';
import { SinceDawn } from '../home/SinceDawn';
import { MostKept } from '../home/MostKept';
import { SiteFooter } from '../home/SiteFooter';
import { PlayerBar } from '../home/PlayerBar';

export default function HomePage() {
  return (
    <>
      <main id="main">
        <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
          <Hero />
        </ErrorBoundary>
        <div className="flex flex-col gap-16 px-6 py-12 md:gap-28 md:px-10 md:py-20">
          <SinceDawn />
          <MostKept />
        </div>
      </main>
      <SiteFooter />
      <PlayerBar />
      <ArtistContext />
      <PlayerSideEffects />
    </>
  );
}
