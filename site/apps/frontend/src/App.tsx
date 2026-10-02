import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import { PlayerSideEffects } from './components/Player/PlayerSideEffects';
import { PlayerBar } from './home/PlayerBar';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useLocaleStore } from './stores/localeStore';

const ArtistPage = lazy(() => import('./pages/ArtistPage'));

/** Rendered inside a router: BrowserRouter in main.tsx, StaticRouter when pre-rendering. */
export default function App() {
  // Subscribing to the locale at the root re-renders the tree on language
  // change (no remount, no page reload — the stream keeps playing).
  useLocaleStore((s) => s.locale);

  const artist = (
    <Suspense fallback={null}>
      <ArtistPage />
    </Suspense>
  );

  return (
    <>
      <AuthInit />
      <NowPlayingPoller />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/en" element={<HomePage />} />
          <Route path="/reset-password" element={<HomePage />} />
          <Route path="/artist/:id/:slug?" element={artist} />
          <Route path="/en/artist/:id/:slug?" element={artist} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {/* Outside the routes: navigating between pages keeps the bar mounted. */}
        <PlayerBar />
        <PlayerSideEffects />
      </Layout>
      <AuthModalHost />
    </>
  );
}
