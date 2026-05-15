import { lazy, Suspense, useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLikedTracksStore } from '../../stores/likedTracksStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuthModalStore } from '../../stores/authModalStore';
import { ModalErrorFallback } from '../ErrorFallback';

const LikedTracksModal = lazy(() =>
  import('../LikedTracksModal').then((m) => ({ default: m.LikedTracksModal }))
);

// Library trigger: opens the LikedTracks modal when authenticated,
// otherwise opens the shared auth modal via the store. Hosts the
// LikedTracks modal lazily so the bundle splits at this leaf.

export function LibraryButton() {
  const tracks = useLikedTracksStore((s) => s.tracks);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setIsModalOpen(true);
  }, [isAuthenticated, openAuthModal]);

  const handleClose = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          'p-2 rounded-full transition-all duration-200 relative cursor-pointer',
          'text-foreground/60 hover:text-foreground hover:bg-foreground/10',
          isAuthenticated && tracks.length > 0 && 'text-accent/80 hover:text-accent'
        )}
        title="Ma bibliothèque"
        aria-label="Ouvrir ma bibliothèque"
      >
        <Library className="w-5 h-5" />
      </button>

      {isModalOpen && (
        <Suspense fallback={null}>
          <ErrorBoundary
            FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={handleClose} />}
          >
            <LikedTracksModal isOpen={isModalOpen} onClose={handleClose} />
          </ErrorBoundary>
        </Suspense>
      )}
    </>
  );
}
