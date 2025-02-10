import React, { useState } from 'react';

const interestingPhrases = [
  "Début de la synchronisation",
  "Synchronisation réussie pour",
  "Traitement de la playlist",
  "Toutes les playlists ont été synchronisées"
];

function isInteresting(message) {
  if (
    message.includes("Skipping") ||
    message.includes("Processing query") ||
    message.includes("Nothing to delete")
  ) {
    return false;
  }
  return interestingPhrases.some(phrase => message.includes(phrase));
}

const ButtonRefreshSpotify = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRefresh = () => {
    setLoading(true);
    setMessage('');

    const sseUrl = 'https://ourmusic-api.ovh/sse-playlists-sync';
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onopen = () => {
      console.log("Connexion SSE établie.");
    };

    eventSource.onmessage = (e) => {
      if (e.data.trim() === '.') return;

      let data;
      try {
        data = JSON.parse(e.data);
      } catch (error) {
        data = { message: e.data };
      }
      console.log("Message SSE reçu :", data);

      const messageText = typeof data === 'object' ? (data.message || '') : data;
      if (isInteresting(messageText)) {
        setMessage(messageText);
      }
    };

    eventSource.onerror = (err) => {
      if (eventSource.readyState === 2) {
        console.log("Connexion SSE fermée normalement.");
      } else {
        console.error("Erreur SSE réelle :", err);
      }
      setLoading(false);
      eventSource.close();
    };

    eventSource.onclose = () => {
      console.log("Connexion SSE fermée.");
      setLoading(false);
    };
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
      <div className="mt-3 text-lg">
        {message && <span>{message}</span>}
      </div>
    </div>
  );
};

export default ButtonRefreshSpotify;
