import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQsuvEJwCtjZ4ZnhhZnrxLx-eW9xOh9MI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gdgoc-vcet.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gdgoc-vcet",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gdgoc-vcet.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "588213745315",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:588213745315:web:4059f5e1ca7ccacdef3116",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-FY41LG4GXD",
};

// Initialize Firebase client app (singleton)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function loginWithGoogle(): Promise<{ user: User; idToken: string }> {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ user: User; idToken: string }> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

