import React, { lazy, Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ModernLayout from './layout/ModernLayout';
import { PlayerService } from './lib/playerService';
import { AZURACAST_URL } from './utils/config';

const ModernHomePage = lazy(() => import('./pages/ModernHomePage'));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-white/70 text-sm">Chargement...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  // Set up audio stream URL on mount
  useEffect(() => {
    const streamUrl = `${AZURACAST_URL}/radio/8000/radio.mp3`;
    PlayerService.setSource(streamUrl);
  }, []);

  return (
    <ModernLayout>
      <Suspense fallback={<LoadingFallback />}>
        <ModernHomePage />
      </Suspense>
    </ModernLayout>
  );
};

export default App;
