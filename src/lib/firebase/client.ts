"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { firebaseClientConfig, useFirebaseEmulators } from "./config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let emulatorConnected = false;

export function getFirebaseClientApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps();
  app = existing.length > 0 ? existing[0] : initializeApp(firebaseClientConfig);
  return app;
}

export function getFirebaseClientAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseClientApp());

  if (useFirebaseEmulators && !emulatorConnected) {
    const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
    connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
    emulatorConnected = true;
  }

  return auth;
}
