/**
 * In-memory TTL cache with periodic sweep.
 * Suitable for a single backend instance (e.g. Koyeb worker).
 * For multi-instance deployments, swap for Redis.
 *
 * Without the sweep, entries that are written once and never read again
 * (e.g. one-off Songlink lookups) would sit in memory until process restart.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, ttlMsOverride?: number): void {
    const ttl = ttlMsOverride ?? this.ttlMs;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  size(): number {
    return this.store.size;
  }

  /**
   * Start a background sweep that purges expired entries every `intervalMs`.
   * The timer is `unref()`'d so it does not keep the event loop alive.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  startSweep(intervalMs = 60_000): void {
    if (this.sweepTimer) return;
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expiresAt < now) this.store.delete(key);
      }
    }, intervalMs);
    if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
      (timer as { unref: () => void }).unref();
    }
    this.sweepTimer = timer;
  }

  /** Stop the sweep timer and clear the store. Call on process shutdown. */
  dispose(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.store.clear();
  }
}
