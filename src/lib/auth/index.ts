import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AdminUser } from "@/types";
import { getAdminUserByFirebaseUid } from "@/lib/db";
import { verifyFirebaseSessionCookie } from "@/lib/firebase/auth";
export { ROLE_PERMISSIONS, hasPermission, canActOnTeamMember } from "./roles";
import { hasPermission } from "./roles";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "gdg_session";

export function sessionMaxAgeMs(): number {
  const days = Number(process.env.SESSION_MAX_AGE_DAYS) || 5;
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Still used to generate an unusable random placeholder for the legacy NOT-NULL
 * `password_hash` column on newly created users — Firebase owns real authentication now.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export class AuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

/**
 * Resolves the current admin, or null, from the Firebase session cookie.
 * SQLite is always re-queried — role/status changes take effect on the very next request,
 * nothing about authorization is trusted from the cookie itself beyond "which Firebase UID".
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const verified = await verifyFirebaseSessionCookie(sessionCookie);
  if (!verified) return null;

  const user = getAdminUserByFirebaseUid(verified.uid);
  if (!user) return null;
  if (user.status !== "active") return null;

  return user;
}

/** Throws AuthError(401) if there is no valid, active session. */
export async function requireAuth(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, "Authentication required.");
  }
  return user;
}

/** Throws AuthError(401)/(403) unless the current session holds the given permission. */
export async function requirePermission(permission: string): Promise<AdminUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new AuthError(403, `Missing required permission: ${permission}`);
  }
  return user;
}

/** Throws AuthError(403) unless the current user's role grants "all" or matches the chapter. */
export async function requireChapterAccess(chapterId: string): Promise<AdminUser> {
  const user = await requireAuth();
  if (hasPermission(user.role, "all")) return user;
  if (user.chapterId !== chapterId) {
    throw new AuthError(403, "You do not have access to this chapter's data.");
  }
  return user;
}

/** Converts an AuthError into the matching 401/403 JSON response; rethrows anything else. */
export function toAuthErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
