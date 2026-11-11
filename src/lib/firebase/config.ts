/**
 * Centralized Firebase environment variable names.
 * No values are read eagerly at module scope beyond what client.ts/admin.ts need —
 * this file just names the contract so client/admin/auth/storage agree on it.
 */

export const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
};

/**
 * True when running against the Firebase Local Emulator Suite (dev/test).
 * An env var set to an empty string ("") in .env.local is still "set" as far as Node is
 * concerned (`!== undefined` would be true) — treat blank the same as unset here, otherwise
 * leaving these as empty placeholders (the normal case once real credentials are filled in)
 * would incorrectly flip this on.
 */
function isSet(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export const useFirebaseEmulators =
  isSet(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
  isSet(process.env.FIRESTORE_EMULATOR_HOST) ||
  isSet(process.env.FIREBASE_STORAGE_EMULATOR_HOST) ||
  process.env.NODE_ENV === "test";

export function normalizePrivateKey(key: string | undefined): string | undefined {
  // .env files commonly escape newlines as literal "\n" — Firebase expects real newlines.
  return key?.replace(/\\n/g, "\n");
}
