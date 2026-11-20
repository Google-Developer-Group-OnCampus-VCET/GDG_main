/**
 * High-performance In-Memory TTL Cache for Firestore Operations
 * Dramatically reduces Cloud Firestore document reads by caching frequently-read
 * aggregate stats, event definitions, and attendee rosters with configurable TTLs.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Retrieve a cached value if it exists and has not expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store a value in the cache with a specified TTL in milliseconds.
 */
export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate cache entries matching a prefix, or clear the entire store.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
