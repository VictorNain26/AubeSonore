import { AuthProvider } from './contexts/AuthContext';
import { LikedTracksProvider } from './contexts/LikedTracksContext';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { NotificationBanner } from './components/NotificationBanner';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  return (
    <AuthProvider>
      <LikedTracksProvider>
        <Layout>
          <HomePage />
        </Layout>
        <PWAInstallBanner />
        <NotificationBanner />
      </LikedTracksProvider>
    </AuthProvider>
  );
}
