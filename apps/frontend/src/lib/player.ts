import { create } from 'zustand';
import { STREAM_URL } from '../utils/config';

const STORAGE_KEY = 'aubesonore_volume';

// Auto-recovery tuning. Live MP3 streams routinely "stall" or "end" on
// Liquidsoap track changes / brief network blips; the native <audio>
// element does not reconnect on its own, so we do it for it.
const STALL_RECOVERY_MS = 1_500; // wait this long before declaring a stall fatal
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000, 8000]; // capped at last value

export interface PlayError {
  code: 'aborted' | 'network' | 'unknown';
  message: string;
}

interface PlayerState {
  isPlaying: boolean;
  volume: number;
  playError: PlayError | null;
}

interface PlayerActions {
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
  clearPlayError: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

const audio = new Audio();
audio.preload = 'none';
audio.crossOrigin = 'anonymous';
audio.setAttribute('x-webkit-airplay', 'allow');
audio.setAttribute('airplay', 'allow');

export function getAudioElement(): HTMLAudioElement {
  return audio;
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
// Tracks if a stop() is in progress so the resulting audio error event
// is not surfaced as a playError to the user.
let isStopping = false;
// True between user-initiated play() and stop(). Used to decide whether
// audio-level disconnects should auto-recover.
let wantsPlayback = false;
let stallTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

const getStoredVolume = (): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : 1;
  } catch {
    return 1;
  }
};

audio.volume = getStoredVolume();

const initAudioContext = () => {
  if (audioContext && sourceNode) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.8;
  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
};

export const getAnalyser = (): AnalyserNode | null => analyser;

function classifyPlayError(err: unknown): PlayError | null {
  if (err instanceof Error && err.name === 'AbortError') {
    return null;
  }
  if (err instanceof Error) {
    const isNetwork = /network|fetch|load/i.test(err.message);
    return {
      code: isNetwork ? 'network' : 'unknown',
      message: err.message,
    };
  }
  return { code: 'unknown', message: String(err) };
}

function clearStallTimer() {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = null;
  }
}

/**
 * Re-attach the stream URL and call play() again. Live streams cannot be
 * "resumed" — the only way to recover from a stall/end/error is to start a
 * fresh request. Backoff guards against hammering the server when it's down.
 */
function reconnect(): void {
  if (!wantsPlayback) return;
  const delay =
    RECONNECT_BACKOFF_MS[Math.min(reconnectAttempts, RECONNECT_BACKOFF_MS.length - 1)] ?? 8000;
  reconnectAttempts++;
  setTimeout(() => {
    if (!wantsPlayback) return;
    console.debug('[Player] auto-reconnect attempt', reconnectAttempts);
    audio.src = STREAM_URL;
    audio.load();
    void audio.play().catch((err: unknown) => {
      console.warn('[Player] reconnect play() rejected:', (err as Error).message);
    });
  }, delay);
}

export const usePlayer = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: getStoredVolume(),
  playError: null,

  play: async () => {
    set({ playError: null });
    wantsPlayback = true;
    reconnectAttempts = 0;
    try {
      initAudioContext();
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
      audio.src = STREAM_URL;
      audio.load();
      await audio.play();
      set({ isPlaying: true });
    } catch (error) {
      wantsPlayback = false;
      const playError = classifyPlayError(error);
      console.error('[Player] Playback failed:', error);
      set({ isPlaying: false, playError });
    }
  },

  stop: () => {
    wantsPlayback = false;
    clearStallTimer();
    reconnectAttempts = 0;
    isStopping = true;
    audio.pause();
    audio.src = '';
    set({ isPlaying: false, playError: null });
    queueMicrotask(() => {
      isStopping = false;
    });
  },

  setVolume: (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    audio.volume = clamped;
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toString());
    } catch {
      // localStorage unavailable (private mode) — keep in-memory state only
    }
    set({ volume: clamped });
  },

  clearPlayError: () => set({ playError: null }),
}));

// ─────────────────────────────────────────────
// Stream resilience: catch the events that briefly silence a live MP3
// (server track-change, network blip, encoder hiccup) and auto-recover.
// Without these, the user hears 1+ second of dead air with no recovery.
// ─────────────────────────────────────────────

audio.addEventListener('playing', () => {
  // Decoder is producing samples again — stream is healthy, cancel any
  // pending stall recovery and reset backoff for the next incident.
  clearStallTimer();
  reconnectAttempts = 0;
});

audio.addEventListener('waiting', () => {
  if (!wantsPlayback || isStopping) return;
  // The browser ran out of buffered samples but hasn't given up yet.
  // Give it a short grace period before forcing a reconnect.
  clearStallTimer();
  stallTimer = setTimeout(() => {
    console.warn('[Player] sustained waiting state, forcing reconnect');
    reconnect();
  }, STALL_RECOVERY_MS);
});

audio.addEventListener('stalled', () => {
  if (!wantsPlayback || isStopping) return;
  console.warn('[Player] stalled (no data received)');
  // Same grace period as waiting — they often fire together.
  if (!stallTimer) {
    stallTimer = setTimeout(() => reconnect(), STALL_RECOVERY_MS);
  }
});

audio.addEventListener('ended', () => {
  if (!wantsPlayback || isStopping) return;
  // A live stream should never "end". When it does, the upstream closed
  // the connection (encoder restart, Liquidsoap reload). Reconnect now.
  console.warn('[Player] stream ended unexpectedly, reconnecting');
  reconnect();
});

audio.addEventListener('error', () => {
  if (isStopping) return;
  console.error('[Player] Audio element error:', audio.error);
  if (wantsPlayback) reconnect();
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // No-op: keep existing audio + source node, do not re-init
  });
}
