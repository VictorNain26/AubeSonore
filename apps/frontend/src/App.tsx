import { AuthProvider } from './components/AuthProvider';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <HomePage />
      </Layout>
    </AuthProvider>
  );
}
