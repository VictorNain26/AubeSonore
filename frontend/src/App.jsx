import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import HomePage from './pages/HomePage';
import ButtonRefreshSpotify from './components/ButtonRefreshSpotify';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Page d'accueil publique */}
      <Route path="/" element={<HomePage />} />

      {/* Routes protégées */}
      <Route element={<ProtectedRoute />}>
        <Route path="/spotify-refresh" element={<ButtonRefreshSpotify />} />
      </Route>

      {/* Route par défaut pour les URLs inconnues */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
