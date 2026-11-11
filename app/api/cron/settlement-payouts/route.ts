// app/api/cron/settlement-payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "../_auth";
import { createPayoutsForPeriod } from "@/services/payoutService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);

    // Period = previous calendar month
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime() - 1;
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const payouts = await createPayoutsForPeriod({
      periodStart,
      periodEnd,
      method: "BANK",
    });

    return NextResponse.json({
      ok: true,
      periodStart: new Date(periodStart).toISOString(),
      periodEnd: new Date(periodEnd).toISOString(),
      payoutCount: payouts.length,
      payouts: payouts.map((p) => ({ id: p.id, operatorId: p.operatorId, totalMGA: p.totalMGA })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
  }
}
export const POST = GET;

// *Note**: `instructPayout` (the actual bank/MoMo transfer) is not called here. 
// That requires a bank integration. This cron only *creates* payouts in `PENDING` status. 
// A finance admin finalizes them through the operator portal (Tier 4 deliverable). 
// This is intentional — money should not move automatically on day one of the pilot.


