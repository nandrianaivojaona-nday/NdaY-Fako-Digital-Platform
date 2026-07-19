// app/api/session/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server"

import { adminAuth } from "@/lib/firebase/firebase-admin"

const isProduction =
  process.env.NODE_ENV === "production"

export async function POST(
  req: NextRequest
) {
  try {
    const token =
      req.headers
        .get("authorization")
        ?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json(
        { error: "No token" },
        { status: 401 }
      )
    }

    // Verify Firebase token
    await adminAuth.verifyIdToken(
      token
    )

    const response =
      NextResponse.json({
        success: true,
      })

    response.cookies.set(
      "session",
      token,
      {
        httpOnly: true,

        // CRITICAL FIX
        secure: isProduction,

        // IMPORTANT FIX
        sameSite: "lax",

        path: "/",

        maxAge:
          60 * 60 * 24 * 7, // 7 days
      }
    )

    return response
  } catch (error) {
    console.error(
      "[SESSION] POST failed:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to create session",
      },
      {
        status: 401,
      }
    )
  }
}

export async function DELETE() {
  const response =
    NextResponse.json({
      success: true,
    })

  response.cookies.set(
    "session",
    "",
    {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    }
  )

  return response
}