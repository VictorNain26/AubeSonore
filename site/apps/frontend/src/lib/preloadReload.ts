const RELOAD_MARKER = 'aubesonore:preload-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;

/**
 * Whether a failed dynamic import should trigger a full reload right now.
 *
 * Reloads at most once per cooldown window: a chunk gone stale after a deploy
 * is recovered by a single reload, while a chunk that keeps failing (offline,
 * blocked by an extension) is left to the error boundary instead of looping.
 */
export function shouldReloadAfterPreloadError(now: number, lastReloadAt: number | null): boolean {
  return lastReloadAt === null || now - lastReloadAt >= RELOAD_COOLDOWN_MS;
}

/**
 * Handles a `vite:preloadError` occurrence: reloads the page once per cooldown
 * window, recording the attempt in `storage` so a persistent failure does not
 * loop. Pure wiring is injected (storage, reload, now) so the decision is
 * testable without a real browser.
 */
export function handlePreloadError(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  reload: () => void,
  now: number
): void {
  const raw = storage.getItem(RELOAD_MARKER);
  const lastReloadAt = raw === null ? null : Number(raw);
  if (!shouldReloadAfterPreloadError(now, lastReloadAt)) return;
  storage.setItem(RELOAD_MARKER, String(now));
  reload();
}
