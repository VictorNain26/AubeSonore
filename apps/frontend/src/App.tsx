import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useMoment } from './hooks/useMoment';

export default function App() {
  useMoment();
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
