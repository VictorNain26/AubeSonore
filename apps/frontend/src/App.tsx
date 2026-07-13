import { lazy, Suspense } from 'react';
import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useMoment } from './hooks/useMoment';

const DevSystemPage = import.meta.env.DEV ? lazy(() => import('./pages/DevSystemPage')) : null;

export default function App() {
  useMoment();
  if (DevSystemPage && window.location.pathname === '/dev/system') {
    return (
      <Suspense fallback={null}>
        <DevSystemPage />
      </Suspense>
    );
  }
  return (
    <>
      <AuthInit />
      <NowPlayingPoller />
      <Layout>
        <HomePage />
      </Layout>
      <AuthModalHost />
      <PWAInstallBanner />
    </>
  );
}
