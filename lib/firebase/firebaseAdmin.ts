// lib/firebase/firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from "firebase-admin/app";

let cached: App | null = null;

export function normalizeFirebasePrivateKey(value: string | undefined): string {
  let privateKey = (value ?? "").trim().replace(/,\s*$/, "");

  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  return privateKey.replace(/\\n/g, "\n");
}

export function getAdminApp(): App {
  if (cached) return cached;
  if (getApps().length > 0) {
    cached = getApps()[0];
    return cached;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables");
  }

  cached = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cached;
}
