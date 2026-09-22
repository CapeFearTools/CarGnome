/**
 * Caches the result of an expensive async load behind a time-to-live.
 *
 * Two callers hitting a cold cache share one load rather than starting their
 * own ("single flight"), so a burst of traffic can't multiply the work the
 * cache exists to avoid.
 *
 * The cached value lives in this process's memory, so each server instance
 * keeps its own copy — fine for data every instance would otherwise fetch
 * identically.
 */
export function cached<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let value: T | undefined;
  let expiresAt = 0;
  let inFlight: Promise<T> | null = null;

  return function get(): Promise<T> {
    if (value !== undefined && expiresAt > Date.now()) {
      return Promise.resolve(value);
    }
    if (inFlight) return inFlight;

    inFlight = load()
      .then((loaded) => {
        value = loaded;
        expiresAt = Date.now() + ttlMs;
        return loaded;
      })
      .finally(() => {
        // Cleared on failure too, so the next request retries instead of
        // being served a rejected promise forever.
        inFlight = null;
      });

    return inFlight;
  };
}
