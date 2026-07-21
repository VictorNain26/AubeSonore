import { ErrorBoundary } from 'react-error-boundary';
import Player from '../components/Player';
import { PlayerSideEffects } from '../components/Player/PlayerSideEffects';
import { PlayerErrorFallback } from '../components/ErrorFallback';

/**
 * Top-level route: page frame around the `Player` composition, with an error
 * boundary and the side-effects hook. Pure routing glue with no layout logic
 * of its own — `Player` already owns and stories its own scene. Not storied.
 */
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
