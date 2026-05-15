// ─────────────────────────────────────────────
// Shared formatting helpers (frontend ↔ mobile)
// ─────────────────────────────────────────────
// Kept dependency-free on purpose — no Intl.RelativeTimeFormat (locale lookups
// in React Native bundle inflate it considerably). The strings are FR-only by
// design; if multi-locale is needed later, accept a Locale argument instead of
// adding a runtime lookup.

/**
 * Format seconds as `mm:ss`. Returns `'0:00'` for negative/invalid input
 * (covers the "no NowPlaying data yet" UI state without a conditional).
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a UNIX-seconds timestamp as a French relative-time string.
 * Buckets: <1min → "À l'instant", <1h → "Il y a N min", <1j → "Il y a Nh",
 * else → "Il y a Nj". Bucket sizes chosen for "track history" UI granularity.
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86_400)}j`;
}

/**
 * Format a duration in minutes as `Nh M min`. Used by stats screens for
 * "total listening time" headlines. Drops the hour part when zero, and the
 * minutes part when zero (so 120 min → "2h", not "2h 0 min").
 */
export function formatDurationMinutes(minutes: number): string {
  if (!minutes || minutes < 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}
