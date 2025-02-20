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

    // Mise à jour de l'URL pour pointer vers l'endpoint SSE de Spotify
    const sseUrl = 'https://ourmusic-api.ovh/api/live/spotify/sse';
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

      // Extraction du message : s'il provient de "pub", on l'utilise
      const displayedMessage =
        data.pub && data.pub.message ? data.pub.message : (data.message || '');

      // Afficher dans la console uniquement si c'est un message de type "pub" et qu'il ne concerne pas un timer
      if (data.pub && data.pub.message && !data.pub.message.toLowerCase().includes("timer")) {
        console.log("Message SSE reçu (pub message):", data.pub.message);
      }

      // Remplacer l'ancien message par le nouveau s'il est intéressant
      if (isInteresting(displayedMessage)) {
        setMessage(displayedMessage);
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
