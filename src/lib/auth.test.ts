import { describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminEmail,
  getAdminPasscode,
  verifyAdminEmailPassword,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from "./auth";

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
});
