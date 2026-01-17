import { useEffect, useRef } from 'react';
import { getAnalyser } from '../../lib/player';

// ─────────────────────────────────────────────
// Waveform Radio-Style - Audio-reactive with Web Audio API
// ─────────────────────────────────────────────

interface WaveformProgressProps {
  progress: number;
  isPlaying: boolean;
  songId: number | undefined;
}

export function WaveformProgress({ progress, isPlaying, songId }: WaveformProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const smoothedDataRef = useRef<number[]>([]);
  const barsCount = 48;

  // Initialize smoothed data array
  useEffect(() => {
    if (smoothedDataRef.current.length !== barsCount) {
      smoothedDataRef.current = new Array(barsCount).fill(0.3);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const draw = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      timeRef.current += deltaTime;

      const time = timeRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barsCount;
      const gap = 3;
      const progressX = (progress / 100) * width;

      // Get real audio data when playing
      const analyser = getAnalyser();
      let frequencyData: Uint8Array | null = null;

      if (isPlaying && analyser) {
        // Initialize frequency array if needed (analyser created after play)
        if (!frequencyDataRef.current) {
          frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        // Type assertion needed for strict TypeScript
        analyser.getByteFrequencyData(frequencyDataRef.current as Uint8Array<ArrayBuffer>);
        frequencyData = frequencyDataRef.current;
      }

      for (let i = 0; i < barsCount; i++) {
        const x = i * barWidth;
        let barHeight: number;

        if (frequencyData) {
          // Plage élargie: bins 2-35 (~80Hz - 6kHz)
          const startBin = 2;
          const endBin = 35;
          const usableBins = endBin - startBin;

          // Distribution centrée en miroir
          const center = barsCount / 2;
          const distFromCenter = Math.abs(i - center) / center; // 0-1

          // Courbe logarithmique pour plus de variation
          // Les barres proches du centre = basses, s'éloigner = montée rapide vers médiums/aigus
          const logDist = Math.pow(distFromCenter, 0.6); // <1 = plus de détail dans les basses
          const binOffset = Math.floor(logDist * usableBins);
          const binIndex = startBin + binOffset;

          // Prendre un seul bin pour plus de différenciation
          const value = frequencyData[binIndex] ?? 0;

          // Normalize avec contraste amplifié
          const normalized = 0.15 + (value / 255) * 0.8;

          // Smooth transition
          const smoothingFactor = 0.35;
          const prevValue = smoothedDataRef.current[i] ?? 0.3;
          const newValue = prevValue * (1 - smoothingFactor) + normalized * smoothingFactor;
          smoothedDataRef.current[i] = newValue;

          barHeight = newValue * height * 0.9;
        } else {
          // Fallback animation when not playing or no analyser
          const position = i / barsCount;
          const seed = songId || 1;

          if (isPlaying) {
            // Animated sine waves
            const wave1 = Math.sin(time * 3 + i * 0.15 + seed * 0.01) * 0.15;
            const wave2 = Math.sin(time * 5 + i * 0.25 + seed * 0.02) * 0.1;
            const wave3 = Math.sin(time * 2 + position * Math.PI * 2) * 0.12;
            const base = 0.45 + wave1 + wave2 + wave3;
            barHeight = Math.max(0.2, Math.min(0.9, base)) * height * 0.85;
          } else {
            // Subtle breathing animation when stopped
            const breath = Math.sin(time * 0.8 + i * 0.1) * 0.08;
            const baseWave = Math.sin(position * Math.PI * 2 + seed * 0.01) * 0.15;
            barHeight = (0.35 + baseWave + breath) * height * 0.7;
          }
        }

        const y = (height - barHeight) / 2;
        const barX = x + gap / 2;
        const barW = barWidth - gap;

        // Partie colorée (progression passée)
        if (x < progressX) {
          const fillWidth = Math.min(barW, progressX - barX);
          if (fillWidth > 0) {
            // Gradient vertical avec glow
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.7)');
            gradient.addColorStop(0.5, 'rgba(168, 85, 247, 1)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.7)');

            // Glow effect - stronger when using real audio
            ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
            ctx.shadowBlur = frequencyData ? 10 : (isPlaying ? 8 : 4);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(barX, y, fillWidth, barHeight, 2);
            ctx.fill();

            ctx.shadowBlur = 0;
          }
        }

        // Partie non colorée (reste à jouer)
        if (x + barW > progressX) {
          const startX = Math.max(barX, progressX);
          const remainingWidth = barX + barW - startX;
          if (remainingWidth > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.beginPath();
            ctx.roundRect(startX, y, remainingWidth, barHeight, 2);
            ctx.fill();
          }
        }
      }

      // Ligne de progression (curseur)
      if (progress > 0 && progress < 100) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(progressX - 1, 4, 2, height - 8, 1);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, progress, songId]);

  return (
    <canvas
      ref={canvasRef}
      width={384}
      height={48}
      className="w-full h-12"
    />
  );
}
