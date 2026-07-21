import { ErrorBoundary } from 'react-error-boundary';
import Player from '../components/Player';
import { PlayerSideEffects } from '../components/Player/PlayerSideEffects';
import { PlayerErrorFallback } from '../design/organisms/ErrorFallback';

export default function HomePage() {
  return (
    <div className="mx-auto size-full max-w-page px-6 pb-6 min-h-0">
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Player />
      </ErrorBoundary>

      <PlayerSideEffects />
    </div>
  );
}
