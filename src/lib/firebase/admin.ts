import "server-only";

import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  type App,
} from "firebase-admin/app";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getStorage as getAdminStorage, type Storage as AdminStorage } from "firebase-admin/storage";
import { firebaseAdminConfig, normalizePrivateKey, useFirebaseEmulators } from "./config";

let adminApp: App | null = null;

/**
 * Singleton Firebase Admin SDK app. Never import this module from a "use client" file —
 * the `server-only` import above makes that a build-time error.
 *
 * Credential resolution:
 * - Emulator/dev/test: Application Default Credentials (the emulator ignores them, but the
 *   SDK still needs a projectId to talk to the emulator host).
 * - Production: explicit service-account env vars (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
 *   FIREBASE_PRIVATE_KEY). Never log or expose these values.
 */
export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getAdminApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  if (useFirebaseEmulators) {
    adminApp = initializeAdminApp({
      projectId: firebaseAdminConfig.projectId || "gdg-vcet-dev",
    });
    return adminApp;
  }

  const { projectId, clientEmail, privateKey } = firebaseAdminConfig;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
        "and FIREBASE_PRIVATE_KEY (see .env.example), or run against the Firebase Emulator Suite."
    );
  }

  adminApp = initializeAdminApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    }),
  });

  return adminApp;
}

export function getFirebaseAdminAuth(): AdminAuth {
  return getAdminAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminStorage(): AdminStorage {
  return getAdminStorage(getFirebaseAdminApp());
}
