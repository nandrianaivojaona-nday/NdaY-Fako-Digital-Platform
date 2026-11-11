// app/api/app/citizen/recommended-offers/route.ts
// A++
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/collections";
import { getOrComputeAffordability } from "@/services/citizenAffordabilityService";
import { getActiveScenarioForCommune } from "@/services/businessModelService";
import { matchPlan, rankMatches, type PlanMatch } from "@/lib/domain/citizen/planMatcher";
import { getReferencePlan } from "@/lib/domain/subscription/planTypes";
import { getOfferVersion } from "@/services/offerService";

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const db = getFirestore(getAdminApp());

    // 1. Affordability
    const affordability = await getOrComputeAffordability(decoded.uid);
    if (!affordability) {
      return NextResponse.json({
        affordability: null,
        recommended: [],
        message: "Complete your profile to see recommendations.",
      });
    }

    // 2. User
    const user = (await db.collection(collections.users).doc(decoded.uid).get()).data()!;

    // 3. The business model scenario for the commune — the ONLY legitimate source
    const scenario = await getActiveScenarioForCommune(user.communeId);
    if (!scenario) {
      return NextResponse.json({
        affordability,
        scenario: null,
        recommended: [],
        message: "No validated business model for your commune yet.",
      });
    }

    // 4. The offers that exist in the commune AND belong to that scenario
    const offersSnap = await db
      .collection(collections.subscriptionOffers)
      .where("communeId", "==", user.communeId)
      .where("businessModelScenarioId", "==", scenario.id)
      .where("status", "==", "ACTIVE")
      .get();

    // 5. Match each offer against the citizen's band,
    //    using the plan proposal's targetBands from the scenario.
    const matches: PlanMatch[] = [];
    for (const offerDoc of offersSnap.docs) {
      const offer = offerDoc.data();
      const version = offer.activeVersionId
        ? await getOfferVersion(offer.activeVersionId)
        : null;
      if (!version) continue;

      const proposal = scenario.planProposals.find((p) => p.planTypeId === offer.planTypeId);
      if (!proposal) continue;

      const plan = getReferencePlan(offer.planTypeId);
      const price =
        version.commercial.monthlyPriceMGA ??
        version.commercial.contractPriceMGA ??
        version.commercial.perPickupPriceMGA;

      // Pass the plan proposal's targetBands so the matcher uses the
      // business model's decision, not a generic reference.
      const match = matchPlan({
        affordability,
        plan,
        offerId: offer.id,
        offerPriceMGA: price,
        targetBandsOverride: proposal.targetBands,
      });
      matches.push(match);
    }

    return NextResponse.json({
      affordability,
      scenario: {
        id: scenario.id,
        communeId: scenario.communeId,
        validatedAt: scenario.updatedAt,
        planCount: scenario.planProposals.length,
      },
      recommended: rankMatches(matches),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
