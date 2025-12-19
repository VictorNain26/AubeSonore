"use client";
import React, { useEffect, useState } from "react";
import type { AzuracastNowPlaying } from "@ourmusic/shared-types";

export default function Home(): React.ReactElement {
  const [nowPlaying, setNowPlaying] = useState<AzuracastNowPlaying | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const updateNowPlaying = (npData: AzuracastNowPlaying): void => {
    setNowPlaying(npData);
    setLoading(false);
  };

  useEffect(() => {
    const sseUrl = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
    const sseUriParams = new URLSearchParams({
      cf_connect: JSON.stringify({ subs: { "station:ourmusic": { recover: true } } }),
    });
    const fullUrl = `${sseUrl}?${sseUriParams.toString()}`;

    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = (): void => {
      sse = new EventSource(fullUrl);

      sse.onopen = (): void => {
        console.log("✅ Connexion SSE établie.");
        setError("");
      };

      sse.onmessage = (event): void => {
        if (event.data.trim() === ".") return;
        try {
          const jsonData = JSON.parse(event.data) as { connect?: { data?: unknown; subs?: unknown }; pub?: { data?: { np: AzuracastNowPlaying } } };
          if (jsonData.connect) {
            const subs = jsonData.connect.data ?? jsonData.connect.subs;
            if (subs) {
              const publications = Array.isArray(subs)
                ? subs.flatMap((d: { np?: AzuracastNowPlaying }) => d.np ? [d.np] : [])
                : Object.values(subs as Record<string, { publications?: Array<{ data?: { np: AzuracastNowPlaying } }> }>).flatMap((sub) =>
                    (sub.publications ?? []).map((p): AzuracastNowPlaying | null => p.data?.np ?? null).filter((x): x is AzuracastNowPlaying => x !== null)
                  );
              publications.forEach(updateNowPlaying);
            }
          } else if (jsonData.pub?.data?.np) {
            updateNowPlaying(jsonData.pub.data.np);
          }
        } catch (err) {
          console.error("Erreur parsing SSE :", err);
        }
      };

      sse.onerror = (): void => {
        console.error("Erreur SSE — reconnexion dans 3s...");
        setError("Erreur de connexion. Reconnexion en cours...");
        if (sse) {
          sse.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();
    return (): void => {
      if (sse) {
        sse.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (nowPlaying?.station?.listen_url) {
      const audioEl = document.getElementById("audio-player") as HTMLAudioElement | null;
      if (audioEl && audioEl.src !== nowPlaying.station.listen_url) {
        audioEl.src = nowPlaying.station.listen_url;
        audioEl.load();
        audioEl.play().catch((err: Error) =>
          console.error("Erreur lecture audio :", err)
        );
      }
    }
  }, [nowPlaying]);

  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {currentSong?.art && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-lg"
          style={{ backgroundImage: `url(${currentSong.art})` }}
        />
      )}
      <div className="absolute inset-0 bg-black opacity-40" />

      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">{station.name}</h1>

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white" />
            <p className="text-white mt-4">Chargement...</p>
          </div>
        ) : currentSong ? (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold text-white mb-4">
              {currentSong.artist} - {currentSong.title}
            </h2>
            {currentSong.art && (
              <img
                src={currentSong.art}
                alt={`${currentSong.artist} - ${currentSong.title}`}
                className="w-64 rounded-lg shadow-md"
              />
            )}
          </div>
        ) : (
          <h2 className="text-2xl text-gray-300">En attente...</h2>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      <audio id="audio-player" autoPlay className="hidden" />
    </div>
  );
}
