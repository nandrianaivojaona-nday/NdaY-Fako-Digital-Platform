// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/* =========================
   CONFIG
========================= */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/* =========================
   SINGLETON CACHE
========================= */

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let firestoreDb: ReturnType<typeof getFirestore> | null = null;
let firebaseAuth: ReturnType<typeof getAuth> | null = null;
let googleProvider: GoogleAuthProvider | null = null;

/* =========================
   INIT (CLIENT SAFE)
========================= */

function initFirebase() {
  if (typeof window === "undefined") return null;

  if (!firebaseConfig.apiKey) {
    console.warn("Firebase config missing");
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

/* =========================
   SERVICES
========================= */

export function getDb() {
  const app = initFirebase();
  if (!app) throw new Error("Firestore unavailable");

  if (!firestoreDb) {
    firestoreDb = getFirestore(app);
  }

  return firestoreDb;
}

export function getAuthClient() {
  const app = initFirebase();
  if (!app) throw new Error("Auth unavailable");

  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);

    // ✅ Persist session
    setPersistence(firebaseAuth, browserLocalPersistence).catch(console.error);
  }

  return firebaseAuth;
}

export function getGoogleProvider() {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });
  }

  return googleProvider;
}