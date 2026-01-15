import React, { useEffect } from 'react';
import ModernLayout from './layout/ModernLayout';
import ModernHomePage from './pages/ModernHomePage';
import { PlayerService } from './lib/playerService';
import { AZURACAST_URL } from './utils/config';

const App: React.FC = () => {
  useEffect(() => {
    const streamUrl = `${AZURACAST_URL}/radio/8000/radio.mp3`;
    PlayerService.setSource(streamUrl);
  }, []);

  return (
    <ModernLayout>
      <ModernHomePage />
    </ModernLayout>
  );
};

export default App;
