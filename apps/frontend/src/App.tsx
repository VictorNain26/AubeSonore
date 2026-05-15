import { AuthProvider } from './contexts/AuthContext';
import { AuthDataSync } from './components/AuthDataSync';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { NotificationBanner } from './components/NotificationBanner';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  return (
    <AuthProvider>
      <AuthDataSync />
      <Layout>
        <HomePage />
      </Layout>
      <PWAInstallBanner />
      <NotificationBanner />
    </AuthProvider>
  );
}
