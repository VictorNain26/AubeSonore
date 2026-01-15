import { useEffect } from 'react';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { usePlayer } from './lib/player';
import { AZURACAST_URL } from './utils/config';

export default function App() {
  const setSource = usePlayer((state) => state.setSource);

  useEffect(() => {
    setSource(`${AZURACAST_URL}/radio/8000/radio.mp3`);
  }, [setSource]);

  return (
    <Layout>
      <HomePage />
    </Layout>
  );
}
