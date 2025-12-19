import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const ModernHomePage = lazy(() => import('./pages/ModernHomePage'));

import ModernLayout from './layout/ModernLayout';

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-white/70 text-sm">Chargement...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ModernLayout>
              <Suspense fallback={<LoadingFallback />}>
                <ModernHomePage />
              </Suspense>
            </ModernLayout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default App;
