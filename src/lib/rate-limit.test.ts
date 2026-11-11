import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit and blocks once exceeded", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    }
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks independent keys separately", () => {
    const keyA = `a-${crypto.randomUUID()}`;
    const keyB = `b-${crypto.randomUUID()}`;
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("resets the window after it expires", async () => {
    const key = `expiring-${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 1, 10)).toBe(true);
    expect(checkRateLimit(key, 1, 10)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkRateLimit(key, 1, 10)).toBe(true);
  });
});
