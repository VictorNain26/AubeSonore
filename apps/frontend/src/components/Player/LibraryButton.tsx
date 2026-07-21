import { lazy, Suspense, useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLikedTracksStore } from '../../stores/likedTracksStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuthModalStore } from '../../stores/authModalStore';
import { ModalErrorFallback } from '../../design/organisms/ErrorFallback';
import { LibraryButtonView } from '../../design/molecules/LibraryButton';

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
      <LibraryButtonView
        hasLikedTracks={isAuthenticated && tracks.length > 0}
        onOpen={handleOpen}
      />

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
