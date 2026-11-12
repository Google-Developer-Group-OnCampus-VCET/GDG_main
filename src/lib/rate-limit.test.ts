import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp, resetRateLimits } from "./rate-limit";

describe("In-Memory Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests within limit and blocks once exceeded", () => {
    const key = "login:192.0.2.10";
    expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    const third = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("extracts client IP from x-forwarded-for or x-real-ip", () => {
    const forwardedReq = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(forwardedReq)).toBe("203.0.113.1");

    const realIpReq = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(realIpReq)).toBe("198.51.100.7");

    const plainReq = new Request("http://localhost");
    expect(getClientIp(plainReq)).toBe("unknown");
  });
});

