// services/stakeInService.ts
//
// Generates the explicit Stake-In artifact — the operator-facing summary of
// what they are committing to when they take on a territory.
//
// Costs are calculated from RAW values, not from pre-rounded aggregates,
// so analytical accuracy is preserved. Only outputs are rounded.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { StakeIn } from "@/lib/domain/stake/stakeInTypes";
import type { BusinessModelScenario } from "@/lib/domain/businessModel/scenarioTypes";
import type { TVERun } from "@/lib/domain/territory/tveRunTypes";
import { makeRaw, toCommercial } from "@/lib/domain/shared/moneyTypes";
import { normalize, roundForReporting } from "@/lib/domain/shared/rounding";

function db() {
  return getFirestore(getAdminApp());
}

// ================================================================
// CREATE STAKE-IN
// ================================================================
export async function createStakeIn(input: {
  scenario: BusinessModelScenario;
  tveRun: TVERun;
  stakeId: string;
  operatorId: string;
  actorUserId: string;
}): Promise<StakeIn> {
  const { scenario, tveRun, stakeId, operatorId, actorUserId } = input;
  const sc = tveRun.serviceConfiguration;
  const econ = tveRun.economics;

  // ---- 1. Commercial price — one commercial rounding ----
  const rawRecommended = econ.priceWindow.rawRecommendedMGA;
  const commercialPrice = toCommercial(rawRecommended);

  // ---- 2. Raw expected revenue — computed from raw price ----
  const rawExpectedRevenue = rawRecommended * sc.targetHouseholds;

  // ---- 3. Raw costs — computed BEFORE rounding ----
  const rawMonthlyOpex = econ.ocd.rawHazardAdjustedOcdMGA * sc.targetHouseholds;
  const rawPlatformCost = rawExpectedRevenue * 0.15;
  const rawPaymentCost = rawExpectedRevenue * 0.02;
  const rawOperatorMargin =
    rawExpectedRevenue - rawMonthlyOpex - rawPlatformCost - rawPaymentCost;

  // ---- 4. Normalized operational outputs ----
  const monthlyOpexMGA = normalize(rawMonthlyOpex);
  const platformCostMGA = normalize(rawPlatformCost);
  const paymentCostMGA = normalize(rawPaymentCost);

  // ---- 5. Commercial aggregate for reporting ----
  const commercialExpectedRevenue = commercialPrice * sc.targetHouseholds;
  const expectedMonthlyRevenueMGA = roundForReporting(commercialExpectedRevenue);

  // ---- 6. Operator margin — reporting layer ----
  const operatorMarginMGA = roundForReporting(rawOperatorMargin);
  const operatorMarginPercent =
    rawExpectedRevenue > 0
      ? Math.round((rawOperatorMargin / rawExpectedRevenue) * 100)
      : 0;

  // ---- 7. Break-even ----
  const rawBreakEven =
    rawRecommended > 0
      ? Math.ceil(
          (econ.ocd.rawLaborCostMGA +
            econ.ocd.rawAdjustedFuelOrMaintenanceMGA * econ.ocd.routingDistanceKm) /
            rawRecommended
        )
      : 0;

  // ---- 8. Working capital ----
  const rawWorkingCapital =
    sc.requiredTeams * 500_000 + sc.requiredVehicles * 1_500_000;
  const workingCapitalMGA = roundForReporting(rawWorkingCapital);

  // ---- Assemble ----
  const market: StakeIn["market"] = {
    totalHouseholds: scenario.totalHouseholds,
    serviceableHouseholds: sc.serviceableHouseholds,
    targetHouseholds: sc.targetHouseholds,
    segments: scenario.segmentMix.map((s) => ({
      segment: s.segment,
      householdCount: s.householdCount,
      share: s.share,
    })),
  };

  const operational: StakeIn["operational"] = {
    collectionFrequency: sc.collectionFrequency,
    requiredTeams: sc.requiredTeams,
    requiredVehicles: sc.requiredVehicles,
    bins: sc.targetHouseholds * 2,
    workingCapitalMGA,
  };

  const economics: StakeIn["economics"] = {
    requiredInvestmentMGA: workingCapitalMGA,
    monthlyOpexMGA,
    expectedMonthlyRevenueMGA,
    platformCostMGA,
    paymentCostMGA,
    operatorMarginMGA,
    operatorMarginPercent,
    breakEvenHouseholds: rawBreakEven,
    rawExpectedMonthlyRevenueMGA: makeRaw(rawExpectedRevenue),
    rawMonthlyOpexMGA: makeRaw(rawMonthlyOpex),
    rawOperatorMarginMGA: makeRaw(rawOperatorMargin),
    rawOperatorMarginPercent: Math.round((rawOperatorMargin / rawExpectedRevenue) * 10000) / 100,
    commercialPriceMGA: commercialPrice,
  };

  const risk: StakeIn["risk"] = {
    serviceRisk: sc.serviceRisk,
    floodExposureWeighted: tveRun.risks.floodExposureWeighted,
    missedCollectionProbability: sc.missedCollectionProbability,
    seasonalAdjustmentRequired: sc.seasonalAdjustmentRequired,
  };

  const recommendation = deriveRecommendation(tveRun, economics);

  const ref = db().collection(collections.stakeIns).doc();
  const stakeIn: StakeIn = {
    id: ref.id,
    scenarioId: scenario.id,
    tveRunId: tveRun.id,
    stakeId,
    operatorId,
    market,
    operational,
    economics,
    risk,
    recommendation,
    createdAt: Date.now(),
    createdBy: actorUserId,
  };

  await ref.set(stakeIn);
  return stakeIn;
}

// ================================================================
// READ
// ================================================================
export async function getStakeIn(id: string): Promise<StakeIn | null> {
  const doc = await db().collection(collections.stakeIns).doc(id).get();
  return doc.exists ? (doc.data() as StakeIn) : null;
}

export async function getStakeInForScenario(scenarioId: string): Promise<StakeIn | null> {
  const snap = await db()
    .collection(collections.stakeIns)
    .where("scenarioId", "==", scenarioId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as StakeIn);
}

export async function listStakeInsForOperator(operatorId: string): Promise<StakeIn[]> {
  const snap = await db()
    .collection(collections.stakeIns)
    .where("operatorId", "==", operatorId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => d.data() as StakeIn);
}

// ================================================================
// HELPERS
// ================================================================
function deriveRecommendation(
  tveRun: TVERun,
  economics: StakeIn["economics"]
): StakeIn["recommendation"] {
  if (tveRun.risks.serviceRisk === "SEVERE" && economics.operatorMarginPercent < 10) {
    return {
      decision: "NO_GO",
      rationale: "Severe service risk combined with insufficient margin.",
    };
  }
  if (economics.operatorMarginPercent < 15) {
    return {
      decision: "ADJUST",
      rationale:
        `Margin ${economics.operatorMarginPercent}% below the 15% target. ` +
        `Consider narrowing the service area or adjusting the commercial price within the LAA window.`,
    };
  }
  return {
    decision: "GO",
    rationale:
      `Margin ${economics.operatorMarginPercent}% with ${tveRun.risks.serviceRisk} service risk ` +
      `(route factor ${tveRun.risks.routeCostFactor.toFixed(2)}).`,
  };
}