/**
 * Admin Authentication & Session Management
 *
 * Provides HMAC-SHA256 signed session tokens using the Web Crypto API
 * (crypto.subtle) ensuring zero external dependencies and 100% compatibility
 * across Next.js Server Components, Route Handlers, Middleware, and Edge runtimes.
 */

export const ADMIN_COOKIE_NAME = "gdg_admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export type AdminRole = "admin" | "core" | "volunteer";

// Standard designated role credentials
export const DEFAULT_MASTER_PASSCODE = "dev@admin26";
export const DEFAULT_CORE_PASSCODE = "vcet@gdg26";
export const DEFAULT_VOLUNTEER_PASSCODE = "team@vcet26";

// Default development fallbacks (never used when NODE_ENV === "production")
const DEFAULT_DEV_ADMIN_PASSCODE = "devcraft-vcet-2025";
const DEFAULT_DEV_ADMIN_EMAIL = "lead@vcet.edu.in";
const DEFAULT_DEV_SESSION_SECRET = "gdg-vcet-super-secure-session-signing-secret-2025";

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAdminPasscode(): string {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    (isProductionEnv() ? "" : DEFAULT_DEV_ADMIN_PASSCODE)
  );
}

export function getMasterPasscode(): string {
  return process.env.ADMIN_MASTER_PASSCODE || DEFAULT_MASTER_PASSCODE;
}

export function getCorePasscode(): string {
  return process.env.ADMIN_CORE_PASSCODE || DEFAULT_CORE_PASSCODE;
}

export function getVolunteerPasscode(): string {
  return process.env.ADMIN_VOLUNTEER_PASSCODE || DEFAULT_VOLUNTEER_PASSCODE;
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || (isProductionEnv() ? "" : DEFAULT_DEV_ADMIN_EMAIL);
}

export function getAuthorizedAdminEmails(): string[] {
  const rawList = [
    process.env.ADMIN_EMAILS || "",
    getAdminEmail(),
  ]
    .join(",")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(rawList));
}

export function isAuthorizedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = getAuthorizedAdminEmails();
  return allowlist.some((allowed) => constantTimeEqual(normalized, allowed));
}

export function getSessionSigningSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    (isProductionEnv() ? "" : DEFAULT_DEV_SESSION_SECRET)
  );
}

export interface AdminSessionPayload {
  role: AdminRole;
  email?: string;
  authMethod?: string;
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
 * Generates an HMAC-signed session token for the admin session.
 */
export async function createAdminSessionToken(
  role: AdminRole = "admin",
  email?: string
): Promise<string> {
  const secret = getSessionSigningSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET (or ADMIN_SECRET) must be configured in production.");
  }

  const now = Date.now();
  const payload: AdminSessionPayload = {
    role,
    email: email || undefined,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const payloadEncoded = toBase64(payload);
  const signature = await hmacSign(payloadEncoded, secret);

  return `${payloadEncoded}.${signature}`;
}

/**
 * Extracts and decodes the verified admin session payload from a token.
 */
export async function getAdminSessionPayload(
  token: string | undefined | null
): Promise<AdminSessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const secret = getSessionSigningSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  if (!payloadEncoded || !signature) return null;

  const expectedSignature = await hmacSign(payloadEncoded, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = fromBase64<AdminSessionPayload>(payloadEncoded);
  if (!payload || !["admin", "core", "volunteer"].includes(payload.role)) {
    return null;
  }

  // Check expiration
  if (Date.now() > payload.expiresAt) {
    return null;
  }

  return payload;
}

/**
 * Verifies an admin session token's authenticity and expiration.
 */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  const payload = await getAdminSessionPayload(token);
  return Boolean(payload);
}

export interface AuthCredentialResult {
  authenticated: boolean;
  role?: AdminRole;
  authMethod: string;
}

/**
 * Resolves credentials across the 3 designated console roles:
 * 1. Master Admin (dev@admin26): Full access to edit event details, broadcasts, registrations, check-in.
 * 2. Core Members (vcet@gdg26): Read-only view for event details, view roster, attendance stats, and exports.
 * 3. Volunteers (team@vcet26): Dedicated check-in terminal with camera QR scanner & direct participant attendance marking.
 */
export function resolveAdminCredentials(credentials: {
  email?: string;
  password?: string;
  passcode?: string;
}): AuthCredentialResult {
  const emailInput = credentials.email?.trim() || "";
  const passwordInput = credentials.password?.trim() || "";
  const passcodeInput = credentials.passcode?.trim() || "";

  // 1. Passcode mode or direct single credential
  const targetCode = passcodeInput || (passwordInput && !emailInput ? passwordInput : "");

  if (targetCode) {
    if (
      constantTimeEqual(targetCode, DEFAULT_MASTER_PASSCODE) ||
      (Boolean(process.env.ADMIN_MASTER_PASSCODE) &&
        constantTimeEqual(targetCode, process.env.ADMIN_MASTER_PASSCODE!)) ||
      (Boolean(getAdminPasscode()) && constantTimeEqual(targetCode, getAdminPasscode()))
    ) {
      return { authenticated: true, role: "admin", authMethod: "master" };
    }
    if (
      constantTimeEqual(targetCode, DEFAULT_CORE_PASSCODE) ||
      (Boolean(process.env.ADMIN_CORE_PASSCODE) &&
        constantTimeEqual(targetCode, process.env.ADMIN_CORE_PASSCODE!))
    ) {
      return { authenticated: true, role: "core", authMethod: "core" };
    }
    if (
      constantTimeEqual(targetCode, DEFAULT_VOLUNTEER_PASSCODE) ||
      (Boolean(process.env.ADMIN_VOLUNTEER_PASSCODE) &&
        constantTimeEqual(targetCode, process.env.ADMIN_VOLUNTEER_PASSCODE!))
    ) {
      return { authenticated: true, role: "volunteer", authMethod: "volunteer" };
    }
  }

  // 2. Email & Password mode:
  if (emailInput || passwordInput) {
    const cleanEmail = emailInput.toLowerCase();
    const cleanPass = passwordInput;

    // Check dev@admin26
    if (
      cleanEmail === DEFAULT_MASTER_PASSCODE ||
      cleanPass === DEFAULT_MASTER_PASSCODE ||
      (Boolean(process.env.ADMIN_MASTER_PASSCODE) &&
        cleanPass === process.env.ADMIN_MASTER_PASSCODE)
    ) {
      return { authenticated: true, role: "admin", authMethod: "master" };
    }

    // Check vcet@gdg26
    if (
      cleanEmail === DEFAULT_CORE_PASSCODE ||
      cleanPass === DEFAULT_CORE_PASSCODE ||
      (Boolean(process.env.ADMIN_CORE_PASSCODE) &&
        cleanPass === process.env.ADMIN_CORE_PASSCODE)
    ) {
      return { authenticated: true, role: "core", authMethod: "core" };
    }

    // Check team@vcet26
    if (
      cleanEmail === DEFAULT_VOLUNTEER_PASSCODE ||
      cleanPass === DEFAULT_VOLUNTEER_PASSCODE ||
      (Boolean(process.env.ADMIN_VOLUNTEER_PASSCODE) &&
        cleanPass === process.env.ADMIN_VOLUNTEER_PASSCODE)
    ) {
      return { authenticated: true, role: "volunteer", authMethod: "volunteer" };
    }

    // Configured admin email and password check
    if (emailInput && passwordInput && verifyAdminEmailPassword(emailInput, passwordInput)) {
      return { authenticated: true, role: "admin", authMethod: "email" };
    }
  }

  return { authenticated: false, authMethod: "none" };
}

/**
 * Verifies an entered password against configured access passcodes.
 */
export function verifyAdminPassword(input: string): boolean {
  if (!input) return false;
  const target = getAdminPasscode().trim();
  if (target && constantTimeEqual(input.trim(), target)) {
    return true;
  }
  const clean = input.trim();
  if (constantTimeEqual(clean, DEFAULT_MASTER_PASSCODE)) return true;
  if (constantTimeEqual(clean, DEFAULT_CORE_PASSCODE)) return true;
  if (constantTimeEqual(clean, DEFAULT_VOLUNTEER_PASSCODE)) return true;
  if (process.env.ADMIN_MASTER_PASSCODE && constantTimeEqual(clean, process.env.ADMIN_MASTER_PASSCODE)) return true;
  if (process.env.ADMIN_CORE_PASSCODE && constantTimeEqual(clean, process.env.ADMIN_CORE_PASSCODE)) return true;
  if (process.env.ADMIN_VOLUNTEER_PASSCODE && constantTimeEqual(clean, process.env.ADMIN_VOLUNTEER_PASSCODE)) return true;
  return false;
}

/**
 * Verifies an entered email and password against configured admin credentials.
 */
export function verifyAdminEmailPassword(emailInput: string, passwordInput: string): boolean {
  if (!emailInput || !passwordInput) return false;
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  // 1. Configured Admin Email & Password
  const configuredEmail = getAdminEmail().trim().toLowerCase();
  const configuredPassword = (process.env.ADMIN_PASSWORD || getAdminPasscode()).trim();
  if (
    configuredEmail &&
    configuredPassword &&
    constantTimeEqual(cleanEmail, configuredEmail) &&
    constantTimeEqual(cleanPassword, configuredPassword)
  ) {
    return true;
  }

  // 2. Role-specific email & password
  if (
    (cleanEmail === DEFAULT_MASTER_PASSCODE || cleanEmail === "dev@admin26") &&
    constantTimeEqual(cleanPassword, DEFAULT_MASTER_PASSCODE)
  ) {
    return true;
  }
  if (
    (cleanEmail === DEFAULT_CORE_PASSCODE || cleanEmail === "vcet@gdg26") &&
    constantTimeEqual(cleanPassword, DEFAULT_CORE_PASSCODE)
  ) {
    return true;
  }
  if (
    (cleanEmail === DEFAULT_VOLUNTEER_PASSCODE || cleanEmail === "team@vcet26") &&
    constantTimeEqual(cleanPassword, DEFAULT_VOLUNTEER_PASSCODE)
  ) {
    return true;
  }

  return false;
}

/**
 * Restricts post-login redirect targets to internal /admin/console routes.
 */
export function sanitizeAdminNextUrl(rawNext: string | null | undefined): string {
  if (!rawNext || typeof rawNext !== "string") return "/admin/console";
  const trimmed = rawNext.trim();
  if (
    !trimmed.startsWith("/admin/console") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /[\r\n\t]/.test(trimmed)
  ) {
    return "/admin/console";
  }
  const charAfterPrefix = trimmed.charAt("/admin/console".length);
  if (
    charAfterPrefix !== "" &&
    charAfterPrefix !== "/" &&
    charAfterPrefix !== "?" &&
    charAfterPrefix !== "#"
  ) {
    return "/admin/console";
  }
  return trimmed;
}

/**
 * Extracts and returns the full admin session from a standard Request.
 */
export async function getAdminSessionFromRequest(request: Request): Promise<AdminSessionPayload | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (key !== ADMIN_COOKIE_NAME) continue;

    const rawVal = trimmed.slice(eqIndex + 1).trim();
    let token: string;
    try {
      token = decodeURIComponent(rawVal);
    } catch {
      token = rawVal;
    }
    return getAdminSessionPayload(token);
  }

  return null;
}

/**
 * Extracts the authenticated role from a Request.
 */
export async function getAdminRoleFromRequest(request: Request): Promise<AdminRole | null> {
  const session = await getAdminSessionFromRequest(request);
  return session?.role ?? null;
}

/**
 * Determines whether the request is from a Master Admin (dev@admin26).
 */
export async function isMasterAdminAuthenticated(request: Request): Promise<boolean> {
  const role = await getAdminRoleFromRequest(request);
  return role === "admin";
}

/**
 * Extracts and verifies the admin session cookie from a standard Request.
 */
export async function isAdminRequestAuthenticated(request: Request): Promise<boolean> {
  const session = await getAdminSessionFromRequest(request);
  return Boolean(session);
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

/**
 * Extracts and decodes the verified admin session payload directly from server component cookies.
 */
export async function getAdminSessionFromCookies(): Promise<AdminSessionPayload | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return getAdminSessionPayload(token);
  } catch {
    return null;
  }
}

/**
 * Extracts the admin role directly from server component cookies.
 */
export async function getAdminRoleFromCookies(): Promise<AdminRole | null> {
  const session = await getAdminSessionFromCookies();
  return session?.role ?? null;
}

// ==============================================================================
// Standalone Volunteer / Staff Check-in Portal (/checkin) Authentication
// ==============================================================================

export const CHECKIN_PORTAL_COOKIE_NAME = "gdg_checkin_session";
export const DEFAULT_CHECKIN_PORTAL_PASSCODE = "gdg@checkin";

export function getCheckinPortalPasscode(): string {
  return process.env.CHECKIN_PORTAL_PASSCODE || DEFAULT_CHECKIN_PORTAL_PASSCODE;
}

export function verifyCheckinPortalPasscode(input: string): boolean {
  const expected = getCheckinPortalPasscode();
  if (!expected || !input) return false;
  return constantTimeEqual(input.trim(), expected);
}

export async function createCheckinPortalToken(): Promise<string> {
  const secret = getSessionSigningSecret();
  if (!secret) {
    throw new Error("Session signing secret is not configured.");
  }
  const now = Date.now();
  const payload = {
    scope: "checkin-portal",
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };
  const encodedPayload = toBase64(payload);
  const signature = await hmacSign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyCheckinPortalToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = getSessionSigningSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return false;

  const expectedSig = await hmacSign(encodedPayload, secret);
  if (!constantTimeEqual(signature, expectedSig)) return false;

  const decoded = fromBase64<{ scope?: string; expiresAt?: number }>(encodedPayload);
  if (!decoded || decoded.scope !== "checkin-portal") return false;
  if (typeof decoded.expiresAt !== "number" || Date.now() > decoded.expiresAt) {
    return false;
  }
  return true;
}

export async function isCheckinPortalAuthenticated(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie") || "";
  const prefix = `${CHECKIN_PORTAL_COOKIE_NAME}=`;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  const token = match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
  return verifyCheckinPortalToken(token);
}

export async function isCheckinPortalAuthenticatedFromCookies(): Promise<boolean> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(CHECKIN_PORTAL_COOKIE_NAME)?.value;
    return verifyCheckinPortalToken(token);
  } catch {
    return false;
  }
}

export function getCheckinPortalCookieOptions(): {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: CHECKIN_PORTAL_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}


