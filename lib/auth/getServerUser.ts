// lib/auth/getServerUser.ts

import { getServerAuth } from "./getServerAuth"

export async function getServerUser() {
  const auth = await getServerAuth()

  if (!auth) return null

  // 🔥 connect to your existing API logic
  const res = await fetch(`${process.env.API_URL}/internal/users/profile`, {
    headers: {
      "x-user-id": auth.uid,
    },
    cache: "no-store",
  })

  if (!res.ok) return null

  return res.json()
}