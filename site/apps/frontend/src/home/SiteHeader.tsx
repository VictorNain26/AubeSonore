import { lazy, Suspense, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { ModalErrorFallback } from '../design/organisms/ErrorFallback';
import * as m from '@/paraglide/messages.js';

const LikedTracksModal = lazy(() =>
  import('../components/LikedTracksModal').then((mod) => ({ default: mod.LikedTracksModal }))
);

const NAV_LINK =
  'text-ui ease-out-quart focus-visible:outline-accent hidden min-h-11 items-center rounded-sm transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 md:inline-flex';

const OUTLINE_PILL =
  'text-ui border-accent ease-out-quart hover:bg-accent hover:text-on-accent focus-visible:outline-accent inline-flex min-h-11 items-center rounded-full border px-4.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2';

export function SiteHeader() {
  const { isAuthenticated, isLoading } = useAuthStore(
    useShallow((s) => ({ isAuthenticated: s.isAuthenticated, isLoading: s.isLoading }))
  );
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const closeLibrary = () => setIsLibraryOpen(false);

  return (
    <header className="relative z-10 flex flex-col gap-6 px-6 pt-4 md:flex-row md:items-start md:justify-between md:px-10 md:pt-6">
      <div className="order-2 flex max-w-xl flex-col gap-1.5 md:order-1">
        <h1 className="text-headline m-0">{m.hero_title()}</h1>
        <p className="text-sub text-text-muted m-0 text-balance">{m.hero_tagline()}</p>
      </div>
      <nav
        aria-label={m.nav_label()}
        className="order-1 flex items-center gap-7 self-end md:order-2 md:self-start"
      >
        <a href="#plus-gardes" className={NAV_LINK}>
          {m.most_kept_title()}
        </a>
        {isLoading ? (
          <span aria-hidden="true" className="bg-surface-raised h-11 w-32 rounded-full" />
        ) : isAuthenticated ? (
          <button type="button" onClick={() => setIsLibraryOpen(true)} className={OUTLINE_PILL}>
            {m.nav_my_tracks()}
          </button>
        ) : (
          <button type="button" onClick={() => openAuthModal()} className={OUTLINE_PILL}>
            {m.nav_sign_in()}
          </button>
        )}
      </nav>

      {isLibraryOpen ? (
        <ErrorBoundary
          FallbackComponent={(props) => <ModalErrorFallback {...props} onClose={closeLibrary} />}
        >
          <Suspense fallback={null}>
            <LikedTracksModal isOpen onClose={closeLibrary} />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </header>
  );
}
