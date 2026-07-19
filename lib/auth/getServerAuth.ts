// lib/auth/getServerAuth.ts

import { cookies } from "next/headers"
import { adminAuth } from "@/lib/firebase/firebase-admin"

export async function getServerAuth() {
  const cookieStore = await cookies() // ✅ FIX

  const session = cookieStore.get("session")?.value

  if (!session) return null

  try {
    const decoded = await adminAuth.verifyIdToken(session)

    return {
      uid: decoded.uid,
      email: decoded.email,
    }
  } catch (error) {
    console.error("Invalid session:", error)
    return null
  }
}