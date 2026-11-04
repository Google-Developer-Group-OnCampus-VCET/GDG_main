/**
 * Admin Authentication & Session Management
 *
 * Provides HMAC-SHA256 signed session tokens using the Web Crypto API
 * (crypto.subtle) ensuring zero external dependencies and 100% compatibility
 * across Next.js Server Components, Route Handlers, Middleware, and Edge runtimes.
 */

export const ADMIN_COOKIE_NAME = "gdg_admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Default development password fallback if environment variable is unset
const DEFAULT_DEV_ADMIN_PASSCODE = "devcraft-vcet-2025";
const DEFAULT_DEV_SESSION_SECRET = "gdg-vcet-super-secure-session-signing-secret-2025";

export function getAdminPasscode(): string {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || DEFAULT_DEV_ADMIN_PASSCODE;
}

export function getSessionSigningSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    DEFAULT_DEV_SESSION_SECRET
  );
}

export interface AdminSessionPayload {
  role: "admin";
  issuedAt: number;
  expiresAt: number;
}

/**
 * Signs data using HMAC-SHA256 via Web Crypto API.
 */
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Encodes an object to a Base64 string safely across runtimes.
 */
function toBase64(obj: unknown): string {
  const jsonStr = JSON.stringify(obj);
  if (typeof btoa === "function") {
    return btoa(jsonStr);
  }
  return Buffer.from(jsonStr).toString("base64");
}

/**
 * Decodes a Base64 string safely across runtimes.
 */
function fromBase64<T>(str: string): T | null {
  try {
    let jsonStr: string;
    if (typeof atob === "function") {
      jsonStr = atob(str);
    } else {
      jsonStr = Buffer.from(str, "base64").toString("utf-8");
    }
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Generates an HMAC-signed session token for the admin.
 */
export async function createAdminSessionToken(): Promise<string> {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    role: "admin",
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const payloadEncoded = toBase64(payload);
  const secret = getSessionSigningSecret();
  const signature = await hmacSign(payloadEncoded, secret);

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verifies an admin session token's authenticity and expiration.
 */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadEncoded, signature] = parts;
  if (!payloadEncoded || !signature) return false;

  const secret = getSessionSigningSecret();
  const expectedSignature = await hmacSign(payloadEncoded, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  const payload = fromBase64<AdminSessionPayload>(payloadEncoded);
  if (!payload || payload.role !== "admin") {
    return false;
  }

  // Check expiration
  if (Date.now() > payload.expiresAt) {
    return false;
  }

  return true;
}

/**
 * Verifies an entered password against the configured admin passcode.
 */
export function verifyAdminPassword(input: string): boolean {
  if (!input) return false;
  const target = getAdminPasscode();
  return constantTimeEqual(input.trim(), target.trim());
}

/**
 * Standard cookie options for the admin session.
 */
export function getAdminCookieOptions(): {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}

