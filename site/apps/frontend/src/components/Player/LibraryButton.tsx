import { useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLikedTracksStore } from '../../stores/likedTracksStore';
import { useAuthStore } from '../../stores/authStore';
import { useAuthModalStore } from '../../stores/authModalStore';
import { ModalErrorFallback } from '../../design/organisms/ErrorFallback';
import { LibraryButtonView } from '../../design/molecules/LibraryButton';
import { LikedTracksModal } from '../LikedTracksModal';

// Library trigger: opens the LikedTracks modal when authenticated,
// otherwise opens the shared auth modal via the store.

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
        <ErrorBoundary
          FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={handleClose} />}
        >
          <LikedTracksModal isOpen={isModalOpen} onClose={handleClose} />
        </ErrorBoundary>
      )}
    </>
  );
}
