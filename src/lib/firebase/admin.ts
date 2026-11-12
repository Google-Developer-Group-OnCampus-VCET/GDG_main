import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const globalForFirebase = globalThis as typeof globalThis & {
  __gdgAdminApp?: App | null;
  __gdgAdminAuth?: Auth | null;
  __gdgAdminDb?: Firestore | null;
  __gdgFirestoreSettingsApplied?: boolean;
};

let adminApp: App | null = globalForFirebase.__gdgAdminApp ?? null;
let adminAuth: Auth | null = globalForFirebase.__gdgAdminAuth ?? null;
let adminDb: Firestore | null = globalForFirebase.__gdgAdminDb ?? null;

export function isFirebaseAdminConfigured(): boolean {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    return true;
  }
  return false;
}

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gdgoc-vcet";

  try {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
      return adminApp;
    }

    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
    const privateKey = rawPrivateKey?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim().replace(/^["']|["']$/g, "");

    if (privateKey && clientEmail) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      adminApp = initializeApp({ projectId });
    }

    return adminApp;
  } catch (err) {
    console.warn("Firebase Admin SDK initialization deferred:", (err as Error).message);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  if (adminAuth) return adminAuth;
  const app = getAdminApp();
  if (!app) return null;
  try {
    adminAuth = getAuth(app);
    return adminAuth;
  } catch {
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;
  if (globalForFirebase.__gdgAdminDb) {
    adminDb = globalForFirebase.__gdgAdminDb;
    return adminDb;
  }
  const app = getAdminApp();
  if (!app) return null;
  try {
    const db = getFirestore(app);
    if (!globalForFirebase.__gdgFirestoreSettingsApplied) {
      try {
        db.settings({ ignoreUndefinedProperties: true });
        globalForFirebase.__gdgFirestoreSettingsApplied = true;
      } catch {
        // Settings were already locked on this Firestore instance in another chunk
        globalForFirebase.__gdgFirestoreSettingsApplied = true;
      }
    }
    adminDb = db;
    globalForFirebase.__gdgAdminDb = db;
    return adminDb;
  } catch (err) {
    console.warn("Firebase Admin Firestore initialization failed:", (err as Error).message);
    return null;
  }
}
