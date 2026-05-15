import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { NotificationBanner } from './components/NotificationBanner';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  return (
    <>
      <AuthInit />
      <NowPlayingPoller />
      <Layout>
        <HomePage />
      </Layout>
      <AuthModalHost />
      <PWAInstallBanner />
      <NotificationBanner />
    </>
  );
}
