import { AuthProvider } from './contexts/AuthContext';
import { LikedTracksProvider } from './contexts/LikedTracksContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { NotificationBanner } from './components/NotificationBanner';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <LikedTracksProvider>
          <Layout>
            <HomePage />
          </Layout>
          <PWAInstallBanner />
          <NotificationBanner />
        </LikedTracksProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}
