import { useSyncExternalStore } from 'react';
import { safeParse } from 'valibot';
import { STATIC_NOWPLAYING_URL } from '../../utils/config';
import { NowPlayingSchema } from './validators';
import type { NowPlaying } from '@aubesonore/shared-types/azuracast';
import type { NowPlayingState } from './types';

// ─────────────────────────────────────────────
// Singleton store backing useNowPlaying()
// ─────────────────────────────────────────────
// Why polling instead of SSE/WebSocket:
// AzuraCast writes a static JSON file every ~10s with `Cache-Control: max-age=10`.
// Polling that file via fetch is dramatically cheaper than holding a Centrifugo
// SSE connection per listener, fully cacheable by a CDN (Cloudflare etc.), and
// keeps the client free of any reconnect / heartbeat / stale-watchdog complexity.
// For a music station (3-5 min tracks, no live DJ) a 5s avg latency on track
// changes is imperceptible. See the AzuraCast docs §"Static Now Playing JSON".
//
// Design:
// - One fetch loop shared by N React subscribers (useSyncExternalStore).
// - Lazy lifecycle: start on first subscriber, stop on last unsubscribe.
// - Pauses polling while the document is hidden (data + battery savings).
// - Exponential backoff on consecutive errors, capped at 16s.
// - Uses If-Modified-Since to skip the JSON parse on unchanged frames (the
//   server happily responds 304 once it has seen the date once).

// Adaptive polling cadence:
// - DEFAULT_POLL_MS  : when we have no NowPlaying data yet (cold start)
// - MID_TRACK_POLL_MS: well inside the current track; we have time before the next change
// - NEAR_END_POLL_MS : the track is about to flip — poll fast so UI updates feel instant
// JITTER_RATIO ±20% desynchronises clients to avoid thundering-herd at T=0s/10s/20s.
const DEFAULT_POLL_MS = 10_000;
const MID_TRACK_POLL_MS = 15_000;
const NEAR_END_POLL_MS = 5_000;
const NEAR_END_THRESHOLD_SEC = 20;
const JITTER_RATIO = 0.2;
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000] as const;

let state: NowPlayingState = { data: null, isConnected: false, error: null };
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: AbortController | null = null;
let consecutiveErrors = 0;
let lastModified: string | null = null;
let visibilityListenerAttached = false;

function setState(partial: Partial<NowPlayingState>): void {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

function clearTimer(): void {
  if (pollTimer !== null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function cancelInflight(): void {
  if (inflight !== null) {
    inflight.abort();
    inflight = null;
  }
}

// Pure: pick the next baseline interval from the current NowPlaying state.
// The static file freezes `elapsed`/`remaining`, so derive remaining live from
// `played_at` per the AzuraCast docs.
function baseInterval(): number {
  const np = state.data?.now_playing;
  if (!np) return DEFAULT_POLL_MS;
  const nowSec = Math.floor(Date.now() / 1000);
  const remaining = np.duration - (nowSec - np.played_at);
  if (remaining < NEAR_END_THRESHOLD_SEC) return NEAR_END_POLL_MS;
  return MID_TRACK_POLL_MS;
}

function nextDelay(): number {
  if (consecutiveErrors > 0) {
    const idx = Math.min(consecutiveErrors - 1, BACKOFF_MS.length - 1);
    return BACKOFF_MS[idx] ?? 16_000;
  }
  const base = baseInterval();
  const jitter = (Math.random() * 2 - 1) * base * JITTER_RATIO;
  return Math.max(1_000, Math.round(base + jitter));
}

async function pollOnce(): Promise<void> {
  cancelInflight();
  const controller = new AbortController();
  inflight = controller;

  try {
    const headers: HeadersInit = { Accept: 'application/json' };
    if (lastModified !== null) headers['If-Modified-Since'] = lastModified;

    const response = await fetch(STATIC_NOWPLAYING_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers,
    });

    // 304 = file unchanged since our last successful read. Keep current data,
    // just confirm the connection is healthy.
    if (response.status === 304) {
      consecutiveErrors = 0;
      setState({ isConnected: true, error: null });
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const modified = response.headers.get('last-modified');
    if (modified !== null) lastModified = modified;

    const json: unknown = await response.json();
    const parsed = safeParse(NowPlayingSchema, json);
    if (!parsed.success) {
      console.error('[AzuraCast] invalid NowPlaying shape:', parsed.issues);
      throw new Error('invalid payload');
    }

    consecutiveErrors = 0;
    setState({ data: parsed.output as NowPlaying, isConnected: true, error: null });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    consecutiveErrors++;
    const message = err instanceof Error ? err.message : 'fetch failed';
    console.warn('[AzuraCast] poll failed:', message);
    setState({ isConnected: false, error: message });
  } finally {
    if (inflight === controller) inflight = null;
  }
}

function scheduleNext(): void {
  clearTimer();
  if (listeners.size === 0) return;
  pollTimer = setTimeout(() => {
    void runPoll();
  }, nextDelay());
}

async function runPoll(): Promise<void> {
  if (listeners.size === 0) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  await pollOnce();
  scheduleNext();
}

function handleVisibility(): void {
  if (listeners.size === 0) return;
  if (document.hidden) {
    // Pause: cancel any in-flight fetch + timer, but keep listeners alive.
    clearTimer();
    cancelInflight();
    setState({ isConnected: false });
  } else {
    // Resume immediately on focus return.
    consecutiveErrors = 0;
    void runPoll();
  }
}

function attachVisibilityListener(): void {
  if (visibilityListenerAttached) return;
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', handleVisibility);
  visibilityListenerAttached = true;
}

function detachVisibilityListener(): void {
  if (!visibilityListenerAttached) return;
  if (typeof document === 'undefined') return;
  document.removeEventListener('visibilitychange', handleVisibility);
  visibilityListenerAttached = false;
}

function start(): void {
  attachVisibilityListener();
  if (typeof document !== 'undefined' && document.hidden) return;
  void runPoll();
}

function stop(): void {
  detachVisibilityListener();
  clearTimer();
  cancelInflight();
  consecutiveErrors = 0;
  lastModified = null;
  // Keep state.data so remounted consumers see the last value immediately.
  setState({ isConnected: false });
}

// ─────────────────────────────────────────────
// useSyncExternalStore wiring
// ─────────────────────────────────────────────

function subscribe(listener: () => void): () => void {
  // Add the listener BEFORE start() so the async runPoll() doesn't bail out
  // on its `listeners.size === 0` early-return — `void runPoll()` queues work
  // that runs after subscribe() finishes, but its sync prologue already runs.
  const wasEmpty = listeners.size === 0;
  listeners.add(listener);
  if (wasEmpty) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): NowPlayingState {
  return state;
}

export function useNowPlaying(): NowPlayingState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

const DEFAULT_ARTWORK_TOKENS = ['generic', 'default', 'placeholder'] as const;

export function isDefaultArtwork(url: string | null | undefined): boolean {
  if (!url) return true;
  return DEFAULT_ARTWORK_TOKENS.some((token) => url.includes(token));
}

// ─────────────────────────────────────────────
// Test-only helpers
// ─────────────────────────────────────────────

/**
 * @internal Reset module state. Exported for unit tests only — calling this
 * from app code will break in-flight subscribers.
 */
export function __resetNowPlayingStore(): void {
  stop();
  state = { data: null, isConnected: false, error: null };
  listeners.clear();
}
