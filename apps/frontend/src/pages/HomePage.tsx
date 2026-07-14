import { ErrorBoundary } from 'react-error-boundary';
import Player from '../components/Player';
import { PlayerSideEffects } from '../components/Player/PlayerSideEffects';
import { PlayerErrorFallback } from '../components/ErrorFallback';

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-6 py-6">
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Player />
      </ErrorBoundary>

      <PlayerSideEffects />
    </div>
  );
}
