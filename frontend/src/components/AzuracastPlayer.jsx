import React, { useState, useEffect, useRef } from 'react';

const AzuracastPlayer = () => {
  // URL de base pour les SSE (votre instance AzuraCast)
  const sseBaseUri = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
  // Construction du paramètre cf_connect pour s'abonner à la station "ourmusic"
  const sseUriParams = new URLSearchParams({
    "cf_connect": JSON.stringify({
      "subs": {
        "station:ourmusic": { "recover": true }
      }
    })
  });
  const sseUri = `${sseBaseUri}?${sseUriParams.toString()}`;

  // États pour stocker les données "Now Playing" et la progression
  const [nowPlaying, setNowPlaying] = useState(null);
  const [error, setError] = useState('');
  const [trackElapsed, setTrackElapsed] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);

  // États pour le contrôle personnalisé du lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1); // volume maximum par défaut

  // Référence à l'élément audio
  const audioRef = useRef(null);

  // Connexion SSE pour recevoir les mises à jour en temps réel
  useEffect(() => {
    const sse = new EventSource(sseUri, { withCredentials: true });

    sse.onmessage = (e) => {
      if (e.data.trim() === '.') return; // Ignore les pings

      let jsonData;
      try {
        jsonData = JSON.parse(e.data);
      } catch {
        return;
      }

      if ('pub' in jsonData) {
        const npData = jsonData.pub.data.np;
        if (npData) {
          setNowPlaying(npData);
          if (npData.now_playing) {
            setTrackElapsed(npData.now_playing.elapsed);
            setTrackDuration(npData.now_playing.duration);
          }
        }
      } else if ('connect' in jsonData) {
        const connectData = jsonData.connect;
        if (connectData.data && Array.isArray(connectData.data)) {
          connectData.data.forEach(initialRow => {
            if (initialRow.np) {
              setNowPlaying(initialRow.np);
              if (initialRow.np.now_playing) {
                setTrackElapsed(initialRow.np.now_playing.elapsed);
                setTrackDuration(initialRow.np.now_playing.duration);
              }
            }
          });
        }
      }
    };

    sse.onerror = () => {
      setError("Erreur lors de la connexion SSE.");
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [sseUri]);

  // Mise à jour de la progression du morceau toutes les secondes
  useEffect(() => {
    let intervalId = null;
    if (trackElapsed < trackDuration) {
      intervalId = setInterval(() => {
        setTrackElapsed(prev => (prev < trackDuration ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [trackElapsed, trackDuration]);

  // Mise à jour du volume sur l'élément audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Définir l'URL de la station si disponible
  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

  // Contrôles personnalisés
  const handlePlay = () => {
    if (audioRef.current && station.listen_url) {
      if (!audioRef.current.getAttribute('src')) {
        audioRef.current.src = station.listen_url;
      }
      audioRef.current.load();
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      setIsPlaying(false);
    }
  };

  // En cas d'erreur, on l'affiche
  if (error) {
    return (
      <div className="mx-auto my-5 text-center text-red-600">
        {error}
      </div>
    );
  }

  // Pendant le chargement, on affiche un spinner et aucun contrôle n'est visible
  if (!nowPlaying) {
    return (
      <div className="mx-auto my-5 text-center">
        <div className="border-8 border-gray-300 border-t-blue-500 rounded-full w-16 h-16 animate-spin mx-auto" />
        <p className="mt-4 text-xl">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto my-5 max-w-xl text-center">
      <h2 className="text-3xl font-bold mb-8">{station.name}</h2>
      
      {currentSong && (
        <div className="mb-6">
          <p className="text-xl">
            <strong>En cours :</strong> {currentSong.artist} - {currentSong.title}
          </p>
          {currentSong.art && (
            <img
              src={currentSong.art}
              alt={`${currentSong.artist} - ${currentSong.title}`}
              className="w-48 rounded-md mx-auto"
            />
          )}
        </div>
      )}

      {/* Élément audio rendu uniquement si l'URL est disponible */}
      {station.listen_url && (
        <audio ref={audioRef} preload="auto" />
      )}

      {/* Bouton Play/Stop */}
      <div className="mt-6">
        {isPlaying ? (
          <button
            onClick={handleStop}
            disabled={!station.listen_url}
            className="px-4 py-2 text-lg bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={!station.listen_url}
            className="px-4 py-2 text-lg bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Play
          </button>
        )}
      </div>

      {/* Contrôle du volume */}
      <div className="mt-4">
        <label className="flex items-center justify-center gap-2">
          <span>Volume:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-32"
          />
        </label>
      </div>

      {/* Affichage numérique de la progression */}
      <div className="mt-4 text-sm">
        {Math.floor(trackElapsed / 60)}:{('0' + trackElapsed % 60).slice(-2)} / {Math.floor(trackDuration / 60)}:{('0' + trackDuration % 60).slice(-2)}
      </div>

      {/* Historique des 5 derniers morceaux */}
      {nowPlaying && nowPlaying.song_history && nowPlaying.song_history.length > 0 && (
        <div className="mt-6 text-left">
          <h3 className="text-xl font-semibold mb-2">Historique des 5 derniers morceaux :</h3>
          <ul className="list-disc pl-5">
            {nowPlaying.song_history.slice(0, 5).map(item => (
              <li key={item.sh_id}>
                {item.song.artist} - {item.song.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AzuracastPlayer;
