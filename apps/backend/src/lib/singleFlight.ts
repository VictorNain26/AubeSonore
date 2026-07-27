/**
 * Coalesces concurrent calls sharing a key onto a single in-flight promise.
 * Each call site builds its own instance so keys from different services
 * cannot collide.
 */
export function createSingleFlight<V>(): (key: string, fn: () => Promise<V>) => Promise<V> {
  const inFlight = new Map<string, Promise<V>>();

  return (key, fn) => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    // A synchronous throw from fn() propagates before the slot is stored,
    // which is what keeps a failed call from wedging the key.
    const promise = fn().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, promise);
    return promise;
  };
}
