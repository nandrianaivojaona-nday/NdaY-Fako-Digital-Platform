// lib/domain/businessModel/scenarioGenerator.ts
//
// Runs the TVE and produces a BusinessModelScenario.
// Called by the operator's "stake" flow after the workspace is finalized.
//
// Every monetary value is derived from the TVE run and carries its three
// tiers: raw, normalized, commercial.

import type { Cluster, TerritorialViability } from "../territory/types";
import type {
  BusinessModelScenario,
  PlanProposal,
  SegmentMixEntry,
  BudgetConstraintInput,
  LaunchBudgetCheck,
} from "./scenarioTypes";
import type { TVERun } from "../territory/tveRunTypes";
import type { AffordabilityBand } from "../citizen/affordabilityTypes";
import type { PlanSegment } from "../subscription/planTypes";
import type {
  MaterialStream,
  BinRequirement,
  OVERequirement,
  CollectionFrequency,
} from "../subscription/offerTypes";
import type { ConfidenceLevel } from "../territory/evidenceTypes";
import { REFERENCE_PLAN_TYPES } from "../subscription/planTypes";
import { calibratePlanPrice } from "../territory/calibrationRules";
import {
  makeRaw,
  toNormalized,
  toCommercial,
} from "../shared/moneyTypes";
import { aggregateConfidence, type FieldEvidence } from "../territory/evidenceTypes";

// Band boundaries — must match affordabilityEngine
const BAND_THRESHOLDS = [3_000, 8_000, 15_000, 25_000];

const BIN_CATALOG: Record<MaterialStream, { code: string; label: string }> = {
  ORGANIC:    { code: "Siny Maitso",  label: "Green bin — organic" },
  RECYCLABLE: { code: "Gony Tady",    label: "Sack — recyclables" },
  PLASTIC:    { code: "Siny Mena",    label: "Red bin — plastic" },
  GLASS:      { code: "Siny Fotsy",   label: "White bin — glass" },
  METAL:      { code: "Siny Vola",    label: "Yellow bin — metal" },
  CARBON:     { code: "Siny Mainty",  label: "Black bin — carbon" },
};

const BUDGET_DEFAULTS = {
  reserveRatio: 0.2,
  binStarterCostPerHouseholdMGA: 12_000,
  bagStarterCostPerHouseholdMGA: 2_500,
  ppeKitCostMGA: 120_000,
  sortingStarterKitCostMGA: 180_000,
  householdsPerCollector: 75,
  minOperationalHouseholds: 25,
};

// ================================================================
// GENERATE
// ================================================================
export function generateBusinessModelScenario(input: {
  cluster: Cluster;
  tveRun: TVERun;
  createdBy: string;
}): BusinessModelScenario {
  const { cluster, tveRun, createdBy } = input;

  const segmentMix = computeSegmentMix(cluster);

  // Derive confidence from the cluster's evidence manifest
  const evidences = (cluster.rgph as any[]).flatMap((r) =>
    r.evidence ? Object.values(r.evidence) : []
  ) as FieldEvidence[];
  const confidence = evidences.length > 0 ? aggregateConfidence(evidences) : "LOW";

  // Build plan proposals — only for viable segments
  const planProposals: PlanProposal[] = [];
  for (const plan of Object.values(REFERENCE_PLAN_TYPES)) {
    const segmentEntry = segmentMix.find((s) => s.segment === plan.segment);
    if (!segmentEntry || segmentEntry.householdCount === 0) continue;

    const proposal = buildPlanProposal({
      cluster,
      tveRun,
      planTypeId: plan.id,
      householdCount: segmentEntry.householdCount,
      confidence,
    });
    if (proposal) planProposals.push(proposal);
  }

  const now = Date.now();
  return {
    id: "",
    clusterId: cluster.id,
    regionId: cluster.regionId,
    communeId: cluster.communeId,
    tveRunId: tveRun.id,
    viability: {
      clusterId: tveRun.clusterId,
      laa: tveRun.economics.laa,
      ocd: tveRun.economics.ocd,
      tbi: tveRun.economics.tbi,
      computedAt: tveRun.computedAt,
      recommendedOVEStreams: tveRun.economics.tbi.rawUpstreamRevenueMGA
        ? deriveOVEStreams(tveRun)
        : [],
      priceWindow: tveRun.economics.priceWindow,
    },
    planProposals,
    segmentMix,
    totalHouseholds: cluster.totalHouseholds,
    addressableHouseholds: segmentMix.reduce((s, e) => s + e.householdCount, 0),
    validationStatus: "PENDING",
    confidence,
    status: "DRAFT",
    createdAt: now,
    createdBy,
    updatedAt: now,
    updatedBy: createdBy,
  };
}

// ================================================================
// PLAN PROPOSAL BUILDER
// ================================================================
function buildPlanProposal(input: {
  cluster: Cluster;
  tveRun: TVERun;
  planTypeId: string;
  householdCount: number;
  confidence: ConfidenceLevel;
}): PlanProposal | null {
  const { cluster, tveRun, planTypeId, householdCount, confidence } = input;
  const plan = REFERENCE_PLAN_TYPES[planTypeId];
  if (!plan) return null;

  // Use the calibration rules to derive a recommended price for this plan
  const viability: TerritorialViability = {
    clusterId: tveRun.clusterId,
    ...tveRun.economics,
    computedAt: tveRun.computedAt,
    recommendedOVEStreams: deriveOVEStreams(tveRun),
  };
  const calibrated = calibratePlanPrice(cluster, viability, planTypeId);

  const rawFloor = tveRun.economics.priceWindow.rawFloorMGA;
  const rawCeiling = tveRun.economics.priceWindow.rawCeilingMGA;
  const rawRecommended = calibrated.monthlyPriceMGA
    ? calibrated.monthlyPriceMGA
    : tveRun.economics.priceWindow.rawRecommendedMGA;

  const floorMGA = toNormalized(rawFloor);
  const ceilingMGA = toCommercial(rawCeiling);
  const recommendedMGA = toCommercial(rawRecommended);

  const targetBands = bandsForPrice(recommendedMGA, plan.audience);
  const frequency = recommendedFrequencyForPlan(plan);

  const oveStreams = tveRun.serviceConfiguration
    ? deriveServiceableStreams(tveRun)
    : [];
  const bins = buildBins(oveStreams);
  const ove = buildOVE(oveStreams);

  // Expected economics — computed from RAW values
  const rawMonthlyRevenue = rawRecommended * householdCount;
  const rawMonthlyCost =
    tveRun.economics.ocd.rawHazardAdjustedOcdMGA * householdCount;
  const marginPercent =
    rawMonthlyRevenue > 0
      ? Math.round(((rawMonthlyRevenue - rawMonthlyCost) / rawMonthlyRevenue) * 100)
      : 0;

  return {
    planTypeId,
    planName: plan.name,
    segment: plan.segment,
    billing: plan.defaultBilling,

    targetBands,
    priceWindow: {
      rawFloorMGA: makeRaw(rawFloor),
      rawCeilingMGA: makeRaw(rawCeiling),
      rawRecommendedMGA: makeRaw(rawRecommended),
      floorMGA,
      ceilingMGA,
      recommendedMGA,
    },

    recommendedFrequency: frequency,
    oveStreams,
    ove,
    bins,

    expected: {
      households: householdCount,
      monthlyRevenueMGA: Math.round(rawMonthlyRevenue),
      rawMonthlyRevenueMGA: makeRaw(rawMonthlyRevenue),
      monthlyCostMGA: toNormalized(rawMonthlyCost),
      rawMonthlyCostMGA: makeRaw(rawMonthlyCost),
      marginPercent,
    },

    confidence,
    rationale:
      `Priced ${recommendedMGA.toLocaleString()} MGA commercial within window ` +
      `[${floorMGA.toLocaleString()}–${ceilingMGA.toLocaleString()}]; ` +
      `targets bands ${targetBands.join(", ")}; ` +
      `margin ${marginPercent}% on ${householdCount} HH` +
      (tveRun.risks.routeCostFactor > 1.05
        ? ` (route factor ${tveRun.risks.routeCostFactor.toFixed(2)}).`
        : "."),
  };
}

// ================================================================
// SEGMENT MIX
// ================================================================
function computeSegmentMix(cluster: Cluster): SegmentMixEntry[] {
  const total = cluster.totalHouseholds || 1;
  const counts: Record<PlanSegment, number> = {
    household: cluster.totalHouseholds,
    building: 0,
    school: 0,
    business: 0,
    event: 0,
    hotel: 0,
    vip: 0,
    institutional: 0,
  };

  const density =
    cluster.rgph.reduce((s, r) => s + r.densityFactor, 0) /
    Math.max(1, cluster.rgph.length);

  if (density >= 3000) counts.building = Math.round(total * 0.08);
  else if (density >= 1500) counts.building = Math.round(total * 0.04);

  const pcd = cluster.pcd;
  counts.school = pcd.publicBinPoints.length;
  counts.business = Math.round(total * 0.05);
  counts.hotel = Math.max(0, Math.round(total * 0.01));
  counts.event = Math.max(1, Math.round(total * 0.005));
  counts.institutional = pcd.wildDumpSites.length;

  return (Object.keys(counts) as PlanSegment[]).map((segment) => ({
    segment,
    householdCount: counts[segment],
    share: counts[segment] / total,
  }));
}

// ================================================================
// HELPERS
// ================================================================
function bandsForPrice(price: number, audience: string): AffordabilityBand[] {
  const out: AffordabilityBand[] = [];
  for (let b = 1; b <= 5; b++) {
    const ceiling = b <= 4 ? BAND_THRESHOLDS[b - 1] : BAND_THRESHOLDS[3] * 2;
    if (audience === "HOUSEHOLD" && price <= ceiling) {
      out.push(b as AffordabilityBand);
    } else if (audience !== "HOUSEHOLD" && b >= 3) {
      out.push(b as AffordabilityBand);
    }
  }
  if (out.length === 0) out.push(5);
  return out;
}

function recommendedFrequencyForPlan(
  plan: typeof REFERENCE_PLAN_TYPES[string]
): CollectionFrequency {
  if (plan.segment === "hotel") return "DAILY";
  if (plan.segment === "household" && plan.id === "HH-FAMILY") return "TWICE_WEEKLY";
  if (plan.segment === "school") return "WEEKLY";
  return "WEEKLY";
}

function buildBins(streams: MaterialStream[]): BinRequirement[] {
  return streams.map((s) => ({
    code: BIN_CATALOG[s].code,
    label: BIN_CATALOG[s].label,
    stream: s,
    quantity: 1,
  }));
}

function buildOVE(streams: MaterialStream[]): OVERequirement[] {
  return streams.map((s) => ({
    stream: s,
    requiredBin: BIN_CATALOG[s].code,
    contaminationMaxPercent: s === "ORGANIC" ? 5 : 2,
  }));
}

function deriveOVEStreams(tveRun: TVERun): any[] {
  // Use the streams from serviceability if available; otherwise empty
  if (tveRun.serviceConfiguration) {
    // Placeholder — full stream logic lives in viabilityEngine
    return ["ORGANIC", "RECYCLABLE"];
  }
  return [];
}

function deriveServiceableStreams(tveRun: TVERun): MaterialStream[] {
  // In a mature implementation, this reads the viability engine's
  // recommendedOVEStreams. For now, derive from serviceability and market.
  const streams: MaterialStream[] = ["ORGANIC"];
  return streams;
}
