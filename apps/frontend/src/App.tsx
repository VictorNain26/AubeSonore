import { Suspense, lazy } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import { MiniPlayerContainer } from './components/MiniPlayerContainer';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useLocaleStore } from './stores/localeStore';

const ArtistPage = lazy(() => import('./pages/ArtistPage'));

export default function App() {
  // Subscribing to the locale at the root re-renders the tree on language
  // change (no remount, no page reload — the stream keeps playing).
  useLocaleStore((s) => s.locale);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AuthInit />
        {/* Above the router on purpose: the audio element is a module
            singleton, so navigation must never remount its data feed. */}
        <NowPlayingPoller />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/artist/:id/:slug?"
                element={
                  <Suspense fallback={null}>
                    <ArtistPage />
                  </Suspense>
                }
              />
            </Routes>
          </Layout>
          <MiniPlayerContainer />
        </BrowserRouter>
        <AuthModalHost />
        <PWAInstallBanner />
      </MotionConfig>
    </LazyMotion>
  );
}
