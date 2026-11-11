// app/api/cron/_auth.ts
import { NextRequest } from "next/server";

export function requireCronSecret(req: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In development, allow invocation without secret for manual testing.
    if (process.env.NODE_ENV !== "production") return;
    throw new Error("CRON_SECRET not configured");
  }

  const provided =
    req.headers.get("x-cron-secret") ??
    (req.headers.get("authorization") ?? "").replace("Bearer ", "");

  if (provided !== secret) {
    throw new Error("Unauthorized");
  }
}
