import { AuthProvider } from './components/AuthProvider';
import { LikedTracksProvider } from './contexts/LikedTracksContext';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <AuthProvider>
      <LikedTracksProvider>
        <Layout>
          <HomePage />
        </Layout>
      </LikedTracksProvider>
    </AuthProvider>
  );
}
