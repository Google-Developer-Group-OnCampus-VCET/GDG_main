import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminEmail,
  getAdminPasscode,
  isAdminRequestAuthenticated,
  isAuthorizedAdminEmail,
  sanitizeAdminNextUrl,
  verifyAdminEmailPassword,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from "./auth";
import { POST as checkInPost } from "@/app/api/events/[slug]/check-in/route";
import { POST as loginPost } from "@/app/api/admin/login/route";
import { cleanupTestRegistrations, createRegistration } from "@/lib/db";

describe("Admin Authentication Layer", () => {
  it("verifies the correct admin passcode", () => {
    const currentPass = getAdminPasscode();
    expect(verifyAdminPassword(currentPass)).toBe(true);
    expect(verifyAdminPassword("wrong-password")).toBe(false);
    expect(verifyAdminPassword("")).toBe(false);
  });

  it("verifies the configured admin email and password", () => {
    const email = getAdminEmail();
    const pass = getAdminPasscode();
    expect(verifyAdminEmailPassword(email, pass)).toBe(true);
    expect(verifyAdminEmailPassword(email.toUpperCase(), pass)).toBe(true);
    expect(verifyAdminEmailPassword(email, "wrong-pass")).toBe(false);
    expect(verifyAdminEmailPassword("unknown@vcet.edu.in", pass)).toBe(false);
  });

  it("generates a signed session token and successfully verifies it", async () => {
    const token = await createAdminSessionToken();
    expect(token).toBeDefined();
    expect(token).toContain(".");

    const isValid = await verifyAdminSessionToken(token);
    expect(isValid).toBe(true);
  });

  it("rejects an invalid or tampered token", async () => {
    const token = await createAdminSessionToken();
    const [payload, signature] = token.split(".");

    // Tampered payload (change a character in the middle)
    const tamperedPayload = "X" + payload.slice(1);
    expect(await verifyAdminSessionToken(`${tamperedPayload}.${signature}`)).toBe(false);

    // Tampered signature (change a character in the signature)
    const tamperedSig = signature.startsWith("a") ? "b" + signature.slice(1) : "a" + signature.slice(1);
    expect(await verifyAdminSessionToken(`${payload}.${tamperedSig}`)).toBe(false);

    // Random garbage
    expect(await verifyAdminSessionToken("not-a-token")).toBe(false);
    expect(await verifyAdminSessionToken("")).toBe(false);
    expect(await verifyAdminSessionToken(null)).toBe(false);
  });

  it("rejects an expired token", async () => {
    // Generate token with an expired timestamp
    const expiredPayload = {
      role: "admin",
      issuedAt: Date.now() - 48 * 60 * 60 * 1000,
      expiresAt: Date.now() - 24 * 60 * 60 * 1000, // expired 24h ago
    };
    const jsonStr = JSON.stringify(expiredPayload);
    const b64 = Buffer.from(jsonStr).toString("base64");

    // Sign it using the same method
    const encoder = new TextEncoder();
    const secret = "gdg-vcet-super-secure-session-signing-secret-2025";
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(b64));
    const sigHex = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiredToken = `${b64}.${sigHex}`;
    const isValid = await verifyAdminSessionToken(expiredToken);
    expect(isValid).toBe(false);
  });

  it("provides secure, HttpOnly cookie configurations", () => {
    const options = getAdminCookieOptions();
    expect(options.name).toBe(ADMIN_COOKIE_NAME);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(24 * 60 * 60);
  });

  it("extracts and verifies admin session cookies from Requests", async () => {
    const unauthReq = new Request("http://localhost/api/events/devcraft-2025/check-in", {
      method: "POST",
    });
    expect(await isAdminRequestAuthenticated(unauthReq)).toBe(false);

    const badReq = new Request("http://localhost/api/events/devcraft-2025/check-in", {
      method: "POST",
      headers: { cookie: `${ADMIN_COOKIE_NAME}=forged.token` },
    });
    expect(await isAdminRequestAuthenticated(badReq)).toBe(false);

    const token = await createAdminSessionToken();
    const validReq = new Request("http://localhost/api/events/devcraft-2025/check-in", {
      method: "POST",
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}` },
    });
    expect(await isAdminRequestAuthenticated(validReq)).toBe(true);
  });

  it("blocks unauthenticated check-in requests and allows authenticated admins", async () => {
    cleanupTestRegistrations();
    const reg = createRegistration("devcraft-2025", {
      fullName: "Auth Check-in Tester",
      email: `test.auth.checkin.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 11122",
      track: "Track A: Modern Web & Gemini AI",
      agreedToCoc: true,
    });
    expect(reg.success).toBe(true);
    if (!reg.success) return;

    const refId = reg.registration.referenceId;

    // 1. Unauthenticated request must return 401 and must not leak registration PII
    const unauthRes = await checkInPost(
      new Request("http://localhost/api/events/devcraft-2025/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId: refId }),
      }),
      { params: Promise.resolve({ slug: "devcraft-2025" }) }
    );
    expect(unauthRes.status).toBe(401);
    const unauthBody = await unauthRes.json();
    expect(unauthBody.error).toBe("UNAUTHORIZED");
    expect(unauthBody.registration).toBeUndefined();

    // 2. Tampered cookie must return 401
    const tamperedRes = await checkInPost(
      new Request("http://localhost/api/events/devcraft-2025/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ADMIN_COOKIE_NAME}=bad.signature`,
        },
        body: JSON.stringify({ referenceId: refId }),
      }),
      { params: Promise.resolve({ slug: "devcraft-2025" }) }
    );
    expect(tamperedRes.status).toBe(401);

    // 3. Authenticated request succeeds (200)
    const token = await createAdminSessionToken();
    const authRes = await checkInPost(
      new Request("http://localhost/api/events/devcraft-2025/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
        },
        body: JSON.stringify({ referenceId: refId }),
      }),
      { params: Promise.resolve({ slug: "devcraft-2025" }) }
    );
    expect(authRes.status).toBe(200);
    const authBody = await authRes.json();
    expect(authBody.success).toBe(true);
    expect(authBody.registration.checkedIn).toBe(true);

    cleanupTestRegistrations();
  });

  it("fails closed in production when admin env secrets are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_SECRET", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "");

    try {
      expect(verifyAdminPassword("devcraft-vcet-2025")).toBe(false);
      expect(verifyAdminEmailPassword("lead@vcet.edu.in", "devcraft-vcet-2025")).toBe(false);
      expect(isAuthorizedAdminEmail("lead@vcet.edu.in")).toBe(false);
      await expect(createAdminSessionToken()).rejects.toThrow();
      expect(await verifyAdminSessionToken("Zm9v.YmFy")).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("enforces admin email allowlist and rejects unverified Firebase idTokens", async () => {
    vi.stubEnv("ADMIN_EMAIL", "lead@vcet.edu.in");
    vi.stubEnv("ADMIN_EMAILS", "co-lead@vcet.edu.in, ops@vcet.edu.in");

    try {
      expect(isAuthorizedAdminEmail("lead@vcet.edu.in")).toBe(true);
      expect(isAuthorizedAdminEmail("CO-LEAD@vcet.edu.in")).toBe(true);
      expect(isAuthorizedAdminEmail("random-student@vcet.edu.in")).toBe(false);

      // Without Firebase Admin SDK configured, idToken login must fail closed (503) instead of bypassing auth
      const res = await loginPost(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: "unverified-client-token" }),
        })
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe("FIREBASE_AUTH_UNAVAILABLE");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("sanitizes ?next= redirect targets against open redirects", () => {
    expect(sanitizeAdminNextUrl("/admin/console")).toBe("/admin/console");
    expect(sanitizeAdminNextUrl("/admin/console/events/devcraft-2025/check-in?tab=1")).toBe(
      "/admin/console/events/devcraft-2025/check-in?tab=1"
    );
    expect(sanitizeAdminNextUrl("https://evil.example.com")).toBe("/admin/console");
    expect(sanitizeAdminNextUrl("//evil.example.com")).toBe("/admin/console");
    expect(sanitizeAdminNextUrl("/admin/console\\evil")).toBe("/admin/console");
    expect(sanitizeAdminNextUrl("/admin/console-spoof")).toBe("/admin/console");
    expect(sanitizeAdminNextUrl("/events")).toBe("/admin/console");
    expect(sanitizeAdminNextUrl(null)).toBe("/admin/console");
  });
});
