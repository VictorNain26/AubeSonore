import { useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { TrendingUp } from 'lucide-react';
import { Button } from '../../design/atoms/Button';
import { ModalErrorFallback } from '../../design/organisms/ErrorFallback';
import { TrendsModal } from '../TrendsModal';

// Trends trigger: opens the community trends modal. Public — unlike the
// library, no auth gate: the ranking is an anonymous aggregate.
export function TrendsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = useCallback(() => setIsModalOpen(true), []);
  const handleClose = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <Button variant="icon" aria-label="Voir les tendances" onClick={handleOpen}>
        <TrendingUp className="size-5" />
      </Button>

      {isModalOpen && (
        <ErrorBoundary
          FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={handleClose} />}
        >
          <TrendsModal isOpen={isModalOpen} onClose={handleClose} />
        </ErrorBoundary>
      )}
    </>
  );
}
