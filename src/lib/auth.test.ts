import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  DEFAULT_CORE_PASSCODE,
  DEFAULT_MASTER_PASSCODE,
  DEFAULT_VOLUNTEER_PASSCODE,
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminEmail,
  getAdminPasscode,
  getAdminRoleFromRequest,
  isAdminRequestAuthenticated,
  isAuthorizedAdminEmail,
  isMasterAdminAuthenticated,
  resolveAdminCredentials,
  sanitizeAdminNextUrl,
  verifyAdminEmailPassword,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from "./auth";
import { POST as checkInPost } from "@/app/api/events/[slug]/check-in/route";
import { POST as loginPost } from "@/app/api/admin/login/route";
import { PATCH as eventPatch } from "@/app/api/admin/events/[slug]/route";
import { POST as eventPost } from "@/app/api/admin/events/route";
import { POST as emailPost } from "@/app/api/events/[slug]/email/route";
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

  describe("Role-Based Access Control (RBAC) & Multi-Role Logins", () => {
    it("resolves the 3 designated console logins accurately", () => {
      // 1. Master Admin (dev@admin26)
      const masterPasscode = resolveAdminCredentials({ passcode: "dev@admin26" });
      expect(masterPasscode.authenticated).toBe(true);
      expect(masterPasscode.role).toBe("admin");

      const masterEmail = resolveAdminCredentials({ email: "dev@admin26" });
      expect(masterEmail.authenticated).toBe(true);
      expect(masterEmail.role).toBe("admin");

      // 2. Core Members (vcet@gdg26)
      const corePasscode = resolveAdminCredentials({ passcode: "vcet@gdg26" });
      expect(corePasscode.authenticated).toBe(true);
      expect(corePasscode.role).toBe("core");

      const coreEmail = resolveAdminCredentials({ email: "vcet@gdg26" });
      expect(coreEmail.authenticated).toBe(true);
      expect(coreEmail.role).toBe("core");

      // 3. Volunteers (team@vcet26)
      const volPasscode = resolveAdminCredentials({ passcode: "team@vcet26" });
      expect(volPasscode.authenticated).toBe(true);
      expect(volPasscode.role).toBe("volunteer");

      const volEmail = resolveAdminCredentials({ email: "team@vcet26" });
      expect(volEmail.authenticated).toBe(true);
      expect(volEmail.role).toBe("volunteer");

      // Invalid credentials
      expect(resolveAdminCredentials({ passcode: "random-attacker-pass" }).authenticated).toBe(false);
    });

    it("logs in via /api/admin/login and returns appropriate role and redirect targets", async () => {
      // Volunteer login redirects straight to check-in terminal
      const volLoginRes = await loginPost(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "team@vcet26" }),
        })
      );
      expect(volLoginRes.status).toBe(200);
      const volBody = await volLoginRes.json();
      expect(volBody.role).toBe("volunteer");
      expect(volBody.redirectUrl).toBe("/admin/console/events/dev-to-cloud/check-in");

      // Core login redirects to console dashboard
      const coreLoginRes = await loginPost(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "vcet@gdg26" }),
        })
      );
      expect(coreLoginRes.status).toBe(200);
      const coreBody = await coreLoginRes.json();
      expect(coreBody.role).toBe("core");
      expect(coreBody.redirectUrl).toBe("/admin/console");

      // Master admin login
      const masterLoginRes = await loginPost(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "dev@admin26" }),
        })
      );
      expect(masterLoginRes.status).toBe(200);
      const masterBody = await masterLoginRes.json();
      expect(masterBody.role).toBe("admin");
    });

    it("enforces that Core Members (vcet@gdg26) cannot edit event details, while Master Admin can", async () => {
      const coreToken = await createAdminSessionToken("core");
      const masterToken = await createAdminSessionToken("admin");

      // Core Member attempting to edit event details: must receive 403 Forbidden
      const coreEditRes = await eventPatch(
        new Request("http://localhost/api/admin/events/dev-to-cloud", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(coreToken)}`,
          },
          body: JSON.stringify({ title: "Unauthorized Edit Attempt" }),
        }),
        { params: Promise.resolve({ slug: "dev-to-cloud" }) }
      );
      expect(coreEditRes.status).toBe(403);
      const coreEditBody = await coreEditRes.json();
      expect(coreEditBody.error).toBe("FORBIDDEN");
      expect(coreEditBody.message).toContain("ineditable");

      // Master Admin editing event details: succeeds (200)
      const masterEditRes = await eventPatch(
        new Request("http://localhost/api/admin/events/dev-to-cloud", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(masterToken)}`,
          },
          body: JSON.stringify({ priceNote: "Free Entry · VCET Workshop" }),
        }),
        { params: Promise.resolve({ slug: "dev-to-cloud" }) }
      );
      expect(masterEditRes.status).toBe(200);
      const masterEditBody = await masterEditRes.json();
      expect(masterEditBody.success).toBe(true);
    });

    it("allows Volunteers (team@vcet26) to check in attendees and mark attendance", async () => {
      cleanupTestRegistrations();
      const reg = createRegistration("dev-to-cloud", {
        fullName: "Volunteer Test Attendee",
        email: `volunteer.tester.${Date.now()}@vcet.edu.in`,
        phone: "+91 98765 44433",
        track: "4-Day All-Access",
        agreedToCoc: true,
      });
      expect(reg.success).toBe(true);
      if (!reg.success) return;

      const volunteerToken = await createAdminSessionToken("volunteer");

      const checkInRes = await checkInPost(
        new Request("http://localhost/api/events/dev-to-cloud/check-in", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(volunteerToken)}`,
          },
          body: JSON.stringify({ referenceId: reg.registration.referenceId, day: 1 }),
        }),
        { params: Promise.resolve({ slug: "dev-to-cloud" }) }
      );

      expect(checkInRes.status).toBe(200);
      const checkInBody = await checkInRes.json();
      expect(checkInBody.success).toBe(true);
      expect(checkInBody.registration.checkedIn).toBe(true);

      cleanupTestRegistrations();
    });

    it("restricts broadcast emails to Master Admin only", async () => {
      const coreToken = await createAdminSessionToken("core");
      const volunteerToken = await createAdminSessionToken("volunteer");
      const masterToken = await createAdminSessionToken("admin");

      // Core Member blocked from broadcast
      const coreBroadcastRes = await emailPost(
        new Request("http://localhost/api/events/dev-to-cloud/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(coreToken)}`,
          },
          body: JSON.stringify({
            action: "broadcast",
            subject: "Core Test",
            message: "Testing broadcast permissions",
          }),
        }),
        { params: Promise.resolve({ slug: "dev-to-cloud" }) }
      );
      expect(coreBroadcastRes.status).toBe(403);

      // Volunteer blocked from broadcast
      const volBroadcastRes = await emailPost(
        new Request("http://localhost/api/events/dev-to-cloud/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(volunteerToken)}`,
          },
          body: JSON.stringify({
            action: "broadcast",
            subject: "Volunteer Test",
            message: "Testing broadcast permissions",
          }),
        }),
        { params: Promise.resolve({ slug: "dev-to-cloud" }) }
      );
      expect(volBroadcastRes.status).toBe(403);

      // Master Admin allowed to broadcast
      const masterBroadcastRes = await emailPost(
        new Request("http://localhost/api/events/dev-to-cloud/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(masterToken)}`,
          },
          body: JSON.stringify({
            action: "broadcast",
            subject: "Master Broadcast Test",
            message: "Testing broadcast permissions",
          }),
        }),
        { params: Promise.resolve({ slug: "dev-to-cloud" }) }
      );
      expect(masterBroadcastRes.status).toBe(200);
    });
  });
});
