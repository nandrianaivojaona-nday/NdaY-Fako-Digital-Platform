// app/api/cron/tve-recalibration/route.ts
//
// Runs weekly. For every active subscription that has been running for at
// least 30 days, computes the recalibration record for the most recent
// 30-day period.

import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "../_auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { buildRecalibration } from "@/services/recalibrationService";
import type { Subscription } from "@/lib/domain/subscription/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LOOKBACK_DAYS = 30;
const MAX_SUBSCRIPTIONS = 500;

export async function GET(req: NextRequest) {
  try {
    requireCronSecret(req);

    const db = getFirestore(getAdminApp());
    const now = Date.now();
    const periodEnd = now - 24 * 60 * 60 * 1000;
    const periodStart = periodEnd - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

    // Active subscriptions that have been running for at least LOOKBACK_DAYS
    const minAge = now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const snap = await db
      .collection(collections.subscriptions)
      .where("status", "==", "ACTIVE")
      .where("createdAt", "<=", minAge)
      .limit(MAX_SUBSCRIPTIONS)
      .get();

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const doc of snap.docs) {
      const sub = doc.data() as Subscription;

      // Idempotency — skip if a recalibration already exists for this period
      const existing = await db
        .collection(collections.recalibrations)
        .where("subscriptionId", "==", sub.id)
        .where("periodEnd", "==", periodEnd)
        .limit(1)
        .get();

      if (!existing.empty) {
        skipped++;
        continue;
      }

      try {
        const record = await buildRecalibration({
          subscriptionId: sub.id,
          periodStart,
          periodEnd,
          actorUserId: "CRON",
        });
        if (record) processed++;
        else skipped++;
      } catch (err: any) {
        errors.push(`${sub.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      periodStart: new Date(periodStart).toISOString(),
      periodEnd: new Date(periodEnd).toISOString(),
      subscriptionsScanned: snap.size,
      processed,
      skipped,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
  }
}

export const POST = GET;