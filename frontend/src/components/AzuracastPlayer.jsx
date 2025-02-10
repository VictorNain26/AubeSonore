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

  // Pour éviter de passer une chaîne vide au src, on définit l'URL uniquement si disponible
  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

  // Contrôles personnalisés : 
  // - handlePlay rétablit l'attribut src (si nécessaire), lance la lecture et met isPlaying à true.
  // - handleStop coupe le flux en retirant le src, met isPlaying à false.
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

  return (
    <div style={{ margin: '20px auto', maxWidth: '600px', textAlign: 'center' }}>
      <h2>{station.name}</h2>
      
      {currentSong && (
        <div>
          <p>
            <strong>En cours :</strong> {currentSong.artist} - {currentSong.title}
          </p>
          {currentSong.art && (
            <img
              src={currentSong.art}
              alt={`${currentSong.artist} - ${currentSong.title}`}
              style={{ width: '200px', borderRadius: '5px' }}
            />
          )}
        </div>
      )}

      {/* Élément audio rendu uniquement si l'URL est disponible */}
      {station.listen_url && (
        <audio ref={audioRef} preload="auto" />
      )}

      {/* Bouton personnalisé : affiche Play ou Stop selon isPlaying */}
      <div style={{ marginTop: '20px' }}>
        {isPlaying ? (
          <button
            onClick={handleStop}
            disabled={!station.listen_url}
            style={{ padding: '10px 20px', fontSize: '1rem' }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={!station.listen_url}
            style={{ padding: '10px 20px', fontSize: '1rem' }}
          >
            Play
          </button>
        )}
      </div>

      {/* Contrôle du volume */}
      <div style={{ marginTop: '10px' }}>
        <label>
          Volume:{" "}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Affichage numérique de la progression (sans barre graphique) */}
      <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        {Math.floor(trackElapsed / 60)}:{('0' + trackElapsed % 60).slice(-2)} / {Math.floor(trackDuration / 60)}:{('0' + trackDuration % 60).slice(-2)}
      </div>

      {/* Historique des 5 derniers morceaux */}
      {nowPlaying && nowPlaying.song_history && nowPlaying.song_history.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <h3>Historique des 5 derniers morceaux :</h3>
          <ul>
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
