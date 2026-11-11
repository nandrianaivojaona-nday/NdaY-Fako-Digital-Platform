// app/api/app/citizen/home/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { getActiveSubscriptionForCitizen } from "@/services/subscriptionService";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifySessionCookie(session, true);
    const db = getFirestore(getAdminApp());
    const uid = decoded.uid;

    const [profileDoc, sub, binsSnap] = await Promise.all([
      db.collection("users").doc(uid).get(),
      getActiveSubscriptionForCitizen(uid),
      db.collection("bins").where("citizenId", "==", uid).get(),
    ]);

    const profile = profileDoc.data() ?? {};
    const bins = binsSnap.docs.map((d) => ({
      id: d.id, stream: d.data().stream, status: d.data().status,
    }));

    const householdQrPayload = `HH:${uid}`;

    // Impact — this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const proofsSnap = await db
      .collection("serviceProofs")
      .where("subscriptionId", "==", sub?.id ?? "_none_")
      .where("collectedAt", ">=", monthStart.getTime())
      .get();

    let organicKg = 0, recyclableKg = 0;
    proofsSnap.forEach((d) => {
      const w = d.data().weights ?? {};
      organicKg += w.organicKg ?? 0;
      recyclableKg += w.recyclableKg ?? 0;
    });

    return NextResponse.json({
      citizenName: profile.fullName ?? "Citizen",
      communeName: profile.communeName ?? "",
      fokontanyName: profile.fokontanyName ?? "",
      householdQrPayload,
      subscription: sub
        ? {
            planTypeId: sub.planTypeId,
            status: sub.status,
            nextCollectionAt: sub.nextCollectionDate ?? null,
            collectionsRemaining: sub.collectionsRemaining ?? 0,
          }
        : {
            planTypeId: "NONE", status: "NONE",
            nextCollectionAt: null, collectionsRemaining: 0,
          },
      impact: {
        recycledKgThisMonth: organicKg + recyclableKg,
        ecoPoints: Math.round((organicKg + recyclableKg) * 10),
      },
      bins,
      rewards: { pendingCompostKg: 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
