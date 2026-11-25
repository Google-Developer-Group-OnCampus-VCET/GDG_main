import { revalidateTag } from "next/cache";

/**
 * High-performance In-Memory TTL Cache & Next.js Tag Revalidation Helpers
 * Reduces Cloud Firestore document reads by caching frequently-read
 * aggregate stats, event definitions, and attendee rosters with configurable TTLs,
 * paired with shared Next.js 16 remote cache tag invalidation on mutations.
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

/**
 * Safely revalidate Next.js Data / Remote Cache tags when running inside Next.js runtime.
 * No-ops gracefully in standalone scripts and Vitest where Next's cache store isn't mounted.
 */
export function safeRevalidateTags(tags: string[], immediate = true): void {
  const profile = immediate ? { expire: 0 } : "max";
  for (const tag of tags) {
    try {
      revalidateTag(tag, profile);
    } catch {
      // Ignore outside Next.js request/runtime contexts (e.g. Vitest unit tests)
    }
  }
}

export function revalidateEventCaches(eventSlug?: string): void {
  const tags = ["events-list", "event-stats"];
  if (eventSlug) {
    tags.push(`event:${eventSlug}`, `event-stats:${eventSlug}`);
  }
  safeRevalidateTags(tags, true);
}
