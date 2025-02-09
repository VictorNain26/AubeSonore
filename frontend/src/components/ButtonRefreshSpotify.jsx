import React, { useState } from 'react';

const ButtonRefreshSpotify = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('https://ourmusic-api.ovh/playlists_sync', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Erreur lors de l'appel à l'API.");
      console.error("Erreur lors de l'appel à l'API :", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center" style={{ marginTop: '2rem' }}>
      <h1 className="text-xl mb-3">Rafraîchir les playlists Spotify</h1>
      <button
        className="bg-slate-800 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded"
        onClick={handleRefresh}
        disabled={loading}
        style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' }}
      >
        {loading ? 'Synchronisation en cours...' : 'Rafraîchir les playlists'}
      </button>
      {message && <p className="mt-3 text-lg">{message}</p>}
    </div>
  );
};

export default ButtonRefreshSpotify;
