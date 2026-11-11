import "server-only";

import { getFirebaseAdminAuth } from "./admin";

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

/** Verifies a Firebase ID token sent by the client right after sign-in. */
export async function verifyIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
  };
}

/** Creates a long-lived (but bounded) HttpOnly session cookie from a fresh ID token. */
export async function createFirebaseSessionCookie(
  idToken: string,
  maxAgeMs: number
): Promise<string> {
  return getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn: maxAgeMs });
}

export interface VerifiedSession extends VerifiedFirebaseUser {
  authTimeSeconds: number;
}

/**
 * Verifies the session cookie and checks Firebase-side revocation (e.g. an admin forcing
 * sign-out via revokeRefreshTokens). Returns null instead of throwing for any invalid/expired/
 * revoked cookie so callers can treat all three as "no session" uniformly.
 */
export async function verifyFirebaseSessionCookie(
  sessionCookie: string
): Promise<VerifiedSession | null> {
  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      authTimeSeconds: decoded.auth_time,
    };
  } catch {
    return null;
  }
}

/** Revokes every refresh token for a user — forces all of their sessions to die immediately. */
export async function revokeAllSessions(uid: string): Promise<void> {
  await getFirebaseAdminAuth().revokeRefreshTokens(uid);
}

export async function createFirebaseUser(params: {
  email: string;
  displayName?: string;
}): Promise<{ uid: string }> {
  const user = await getFirebaseAdminAuth().createUser({
    email: params.email,
    displayName: params.displayName,
    emailVerified: false,
  });
  return { uid: user.uid };
}

export async function getFirebaseUserByEmail(email: string): Promise<{ uid: string } | null> {
  try {
    const user = await getFirebaseAdminAuth().getUserByEmail(email);
    return { uid: user.uid };
  } catch {
    return null;
  }
}

/** Generates a password-reset link Firebase will email (or we can send ourselves) for invites. */
export async function generatePasswordResetLink(email: string): Promise<string> {
  return getFirebaseAdminAuth().generatePasswordResetLink(email);
}

export async function disableFirebaseUser(uid: string): Promise<void> {
  await getFirebaseAdminAuth().updateUser(uid, { disabled: true });
  await revokeAllSessions(uid);
}

export async function enableFirebaseUser(uid: string): Promise<void> {
  await getFirebaseAdminAuth().updateUser(uid, { disabled: false });
}

export async function deleteFirebaseUser(uid: string): Promise<void> {
  await getFirebaseAdminAuth().deleteUser(uid);
}
