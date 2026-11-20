import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCached, setCached, invalidateCache } from "./cache";

describe("In-Memory TTL Cache Layer", () => {
  beforeEach(() => {
    invalidateCache();
    vi.useRealTimers();
  });

  it("returns null for non-existent cache keys", () => {
    expect(getCached("non-existent-key")).toBeNull();
  });

  it("stores and retrieves cached data within TTL", () => {
    setCached("test:key", { message: "hello" }, 5000);
    const result = getCached<{ message: string }>("test:key");
    expect(result).toEqual({ message: "hello" });
  });

  it("expires cached data after TTL has elapsed", () => {
    vi.useFakeTimers();
    setCached("test:expiring", { count: 42 }, 1000);

    expect(getCached("test:expiring")).toEqual({ count: 42 });

    // Advance time beyond TTL
    vi.advanceTimersByTime(1500);

    expect(getCached("test:expiring")).toBeNull();
  });

  it("invalidates keys matching a specified prefix", () => {
    setCached("fs:events", [1, 2, 3], 10000);
    setCached("fs:stats:dev-to-cloud", { seats: 135 }, 10000);
    setCached("other:key", "keep-me", 10000);

    invalidateCache("fs:");

    expect(getCached("fs:events")).toBeNull();
    expect(getCached("fs:stats:dev-to-cloud")).toBeNull();
    expect(getCached("other:key")).toBe("keep-me");
  });

  it("clears entire cache store when invalidateCache is called without arguments", () => {
    setCached("k1", "v1", 10000);
    setCached("k2", "v2", 10000);

    invalidateCache();

    expect(getCached("k1")).toBeNull();
    expect(getCached("k2")).toBeNull();
  });
});
