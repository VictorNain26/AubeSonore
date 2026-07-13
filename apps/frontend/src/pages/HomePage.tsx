import { ErrorBoundary } from 'react-error-boundary';
import Player from '../components/Player';
import { PlayerSideEffects } from '../components/Player/PlayerSideEffects';
import { PlayerErrorFallback } from '../components/ErrorFallback';

export default function HomePage() {
  return (
    <div className="relative w-full flex-1 flex items-center justify-center py-4">
      <div className="relative z-10 w-full">
        <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
          <Player />
        </ErrorBoundary>
      </div>

      <PlayerSideEffects />
    </div>
  );
}
