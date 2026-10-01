import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { useLocaleStore } from './stores/localeStore';

export default function App() {
  // Subscribing to the locale at the root re-renders the tree on language
  // change (no remount, no page reload — the stream keeps playing).
  useLocaleStore((s) => s.locale);

  return (
    <>
      <AuthInit />
      <NowPlayingPoller />
      <Layout>
        <HomePage />
      </Layout>
      <AuthModalHost />
    </>
  );
}
