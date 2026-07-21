// lib/firebase.ts

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  Auth,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// 🔐 --- Global Singleton Store ---
type FirebaseGlobal = {
  app?: FirebaseApp;
  db?: Firestore;
  auth?: Auth;
  persistenceInitialized?: boolean;
  googleProvider?: GoogleAuthProvider;
  linkedInProvider?: OAuthProvider;
};

const globalForFirebase = globalThis as typeof globalThis & {
  _firebase?: FirebaseGlobal;
};

if (!globalForFirebase._firebase) {
  globalForFirebase._firebase = {};
}

const store = globalForFirebase._firebase;

// 🔐 --- Config ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

console.log('🔥 Firebase config present:', {
  apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
});

// 🔐 --- Init (SSR SAFE) ---
function initFirebase(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  if (!firebaseConfig.apiKey) {
    throw new Error("🔥 Firebase config missing");
  }

  if (!store.app) {
    store.app = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig);
  }

  return store.app;
}

// 🔐 --- Firestore ---
export function getDb(): Firestore {
  const app = initFirebase();
  if (!app) throw new Error("Firestore cannot run on server");

  if (!store.db) {
    store.db = getFirestore(app);
  }

  return store.db;
}

// 🔐 --- Auth (SYNC ✅) ---
export function getAuthClient(): Auth {
  const app = initFirebase();
  if (!app) throw new Error("Auth cannot run on server");

  if (!store.auth) {
    store.auth = getAuth(app);
  }

  // 🔥 Initialize persistence ONCE (non-blocking)
  if (!store.persistenceInitialized) {
    store.persistenceInitialized = true;

    setPersistence(store.auth, browserLocalPersistence).catch((err) => {
      console.warn("⚠️ Persistence setup failed:", err);
    });
  }

  return store.auth;
}

// 🔐 --- Google Provider ---
export function getGoogleProvider(): GoogleAuthProvider {
  if (!store.googleProvider) {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account",
    });

    store.googleProvider = provider;
  }

  return store.googleProvider;
}

// 🔐 --- LinkedIn Provider ---
export function getLinkedInProvider(): OAuthProvider {
  if (!store.linkedInProvider) {
    const provider = new OAuthProvider("linkedin.com");

    provider.setCustomParameters({
      prompt: "consent",
    });

    store.linkedInProvider = provider;
  }

  return store.linkedInProvider;
}