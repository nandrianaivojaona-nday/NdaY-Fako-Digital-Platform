// app/api/cron/recompute-counters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "../_auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { recomputeSubscriptionCounters } from "@/services/subscriptionService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);

    const db = getFirestore(getAdminApp());
    const snap = await db
      .collection(collections.subscriptions)
      .where("status", "==", "ACTIVE")
      .limit(200)
      .get();

    let processed = 0;
    const errors: string[] = [];

    for (const doc of snap.docs) {
      try {
        await recomputeSubscriptionCounters(doc.id);
        processed++;
      } catch (err: any) {
        errors.push(`${doc.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ ok: true, processed, errors });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
  }
}

export const POST = GET;
