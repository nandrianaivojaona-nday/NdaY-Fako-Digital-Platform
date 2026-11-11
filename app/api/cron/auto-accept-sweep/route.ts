// app/api/cron/auto-accept-sweep/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "../_auth";
import { runAutoAcceptSweep } from "@/services/acknowledgementService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);
    const { processed } = await runAutoAcceptSweep();
    return NextResponse.json({ ok: true, processed, ranAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
  }
}

// Allow POST for manual triggering
export const POST = GET;

// **Note**: the current `runAutoAcceptSweep` has an N+1 query issue — it reads the offer version per cycle. 
// Apply the refinement from Tier 3 or accept the load for pilot scale. 
// For one pilot commune it's fine.
