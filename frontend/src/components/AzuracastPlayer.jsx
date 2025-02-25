import React, { useState, useEffect, useRef } from 'react';

const AzuracastPlayer = () => {
  const sseBaseUri = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
  const sseUriParams = new URLSearchParams({
    cf_connect: JSON.stringify({
      subs: { "station:ourmusic": { recover: true } }
    })
  });
  const sseUri = `${sseBaseUri}?${sseUriParams.toString()}`;

  const [nowPlaying, setNowPlaying] = useState(null);
  const [error, setError] = useState('');
  const [trackElapsed, setTrackElapsed] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isConnected, setIsConnected] = useState(false);

  const audioRef = useRef(null);
  const sseRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Met à jour les informations nowPlaying et la durée
  const updateNowPlaying = (npData) => {
    setNowPlaying(npData);
    if (npData && npData.now_playing) {
      setTrackElapsed(npData.now_playing.elapsed || 0);
      setTrackDuration(npData.now_playing.duration || 0);
    }
  };

  // Fonction de gestion des données SSE selon la doc AzuraCast
  const handleSseData = (ssePayload, useTime = true) => {
    const data = ssePayload.data;
    if (useTime && data.current_time) {
      // Met à jour le temps courant si fourni
      setTrackElapsed(data.current_time);
    }
    if (data.np) {
      updateNowPlaying(data.np);
    }
  };

  // Fonction de connexion SSE avec reconnexion automatique
  const connectSSE = () => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const sse = new EventSource(sseUri);
    sseRef.current = sse;

    sse.onopen = () => {
      console.log("Connexion SSE établie.");
      setIsConnected(true);
      setError('');
    };

    sse.onmessage = (e) => {
      if (e.data.trim() === '.') return;
      try {
        const jsonData = JSON.parse(e.data);
        if ('connect' in jsonData) {
          const connectData = jsonData.connect;
          if ('data' in connectData) {
            // Format legacy
            connectData.data.forEach((initialRow) => handleSseData(initialRow));
          } else {
            // Nouveau format Centrifugo
            if ('time' in connectData) {
              setTrackElapsed(Math.floor(connectData.time / 1000));
            }
            // Itère sur les abonnements pour récupérer les publications
            for (const subName in connectData.subs) {
              const sub = connectData.subs[subName];
              if (sub.publications && sub.publications.length > 0) {
                sub.publications.forEach((initialRow) => handleSseData(initialRow, false));
              }
            }
          }
        } else if ('pub' in jsonData) {
          handleSseData(jsonData.pub);
        }
      } catch (err) {
        console.error("Erreur lors du traitement du message SSE:", err);
      }
    };

    sse.onerror = () => {
      console.error("Erreur lors de la connexion SSE.");
      setError("Erreur lors de la connexion SSE. Nouvelle tentative dans 5 secondes...");
      setIsConnected(false);
      sse.close();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          connectSSE();
        } else {
          console.warn("Navigateur hors ligne. En attente d'une reconnexion.");
        }
      }, 5000);
    };
  };

  useEffect(() => {
    // Connexion initiale
    connectSSE();

    const handleOnline = () => {
      console.log("Connexion réseau rétablie, tentative de reconnexion SSE...");
      if (!isConnected) {
        connectSSE();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [sseUri, isConnected]);

  useEffect(() => {
    let intervalId = null;
    if (trackElapsed < trackDuration) {
      intervalId = setInterval(() => {
        setTrackElapsed(prev => (prev < trackDuration ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [trackElapsed, trackDuration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

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

  // Affichage d'un spinner tant que les données ne sont pas chargées
  if (!nowPlaying) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden z-50">
        <div className="w-12 h-12 border-8 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto my-5 max-w-2xl text-center">
      <h2 className="text-2xl font-bold mb-4">{station.name}</h2>
      
      {currentSong && (
        <div className="mb-4">
          <p className="text-lg font-semibold">
            En cours : {currentSong.artist} - {currentSong.title}
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

      {station.listen_url && (
        <audio ref={audioRef} preload="auto" />
      )}

      <div className="mt-4">
        {isPlaying ? (
          <button
            onClick={handleStop}
            disabled={!station.listen_url}
            className="px-6 py-2 text-lg bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={!station.listen_url}
            className="px-6 py-2 text-lg bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            Play
          </button>
        )}
      </div>

      <div className="mt-3">
        <label className="text-lg font-medium">
          Volume:{" "}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-48"
          />
        </label>
      </div>

      <div className="mt-4 text-sm">
        {Math.floor(trackElapsed / 60)}:{('0' + trackElapsed % 60).slice(-2)} / {Math.floor(trackDuration / 60)}:{('0' + trackDuration % 60).slice(-2)}
      </div>

      {nowPlaying?.song_history && nowPlaying.song_history.length > 0 && (
        <div className="mt-6 text-left">
          <h3 className="text-xl font-semibold mb-2">Historique des 5 derniers morceaux :</h3>
          <ul className="list-disc list-inside">
            {nowPlaying.song_history.slice(0, 5).map(item => (
              <li key={item.sh_id}>
                {item.song.artist} - {item.song.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default AzuracastPlayer;
