// src/ButtonRefreshSpotify.js
import { useState } from 'react';

const ButtonRefreshSpotify = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleRefresh = async () => {
        setLoading(true);
        setMessage('');
        try {
            // Use the proper backend URL; if testing locally, you might use "http://localhost:3000/playlists_sync"
            const response = await fetch('https://ourmusic-api.ovh/playlists_sync', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                setMessage('Playlists rafraîchies avec succès !');
                console.log('Playlists rafraîchies avec succès !');
            } else {
                setMessage('Échec du rafraîchissement des playlists.');
                console.error('Échec du rafraîchissement des playlists.');
            }
        } catch (error) {
            setMessage("Erreur lors de l'appel à l'API.");
            console.error("Erreur lors de l'appel à l'API :", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-center">
            <h1 className="text-xl mb-3">Rafraîchir les playlists Spotify</h1>
            <button
                className="bg-slate-800 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded"
                onClick={handleRefresh}
                disabled={loading}
            >
                {loading ? 'Chargement...' : 'Rafraîchir les playlists'}
            </button>
            {message && <p className="mt-3 text-lg">{message}</p>}
        </div>
    );
};

export default ButtonRefreshSpotify;
