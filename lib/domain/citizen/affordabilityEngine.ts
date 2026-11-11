// lib/domain/citizen/affordabilityEngine.ts
import type { Cluster, LAAResult } from "../territory/types";
import type { HouseholdProfile, AffordabilityResult, AffordabilityBand } from "./affordabilityTypes";

const SIZE_FACTOR = { base: 4, perPerson: 0.10, minFactor: 0.7, maxFactor: 2.0 };
const HOUSING_FACTOR = {
  base: 0.5, finishedRoofWeight: 0.30, finishedFloorWeight: 0.15,
  pipedWaterBonus: 0.10, minFactor: 0.5, maxFactor: 1.3,
};
const BAND_THRESHOLDS = [3000, 8000, 15000, 25000];

export function computeAffordability(input: {
  profile: HouseholdProfile;
  cluster: Cluster;
  clusterLAA: LAAResult;
}): AffordabilityResult {
  const { profile, cluster, clusterLAA } = input;

  const sizeFactor = clamp(
    1 + (profile.householdSize - SIZE_FACTOR.base) * SIZE_FACTOR.perPerson,
    SIZE_FACTOR.minFactor, SIZE_FACTOR.maxFactor
  );

  const roof = profile.finishedRoofPercent ?? clusterAvgRoof(cluster);
  const floor = profile.finishedFloorPercent ?? clusterAvgFloor(cluster);
  const waterBonus = profile.waterAccessType === "PIPED" ? HOUSING_FACTOR.pipedWaterBonus : 0;

  const housingFactor = clamp(
    HOUSING_FACTOR.base +
      (roof / 100) * HOUSING_FACTOR.finishedRoofWeight +
      (floor / 100) * HOUSING_FACTOR.finishedFloorWeight +
      waterBonus,
    HOUSING_FACTOR.minFactor, HOUSING_FACTOR.maxFactor
  );

  const householdAffordability = Math.round(Number(clusterLAA.rawLaaMGA) * sizeFactor * housingFactor);
  const band = toBand(householdAffordability);

  return {
    citizenId: profile.citizenId,
    fokontanyId: profile.fokontanyId,
    householdAffordabilityMGA: householdAffordability,
    rawLaaMGA: Number(clusterLAA.rawLaaMGA),
    commercialLaaMGA: Number(clusterLAA.commercialLaaMGA),
    alphaU: clusterLAA.alphaU,
    urbanityTier: clusterLAA.urbanityTier,
    band,
    inputs: {
      clusterLAA_MGA: Number(clusterLAA.rawLaaMGA),
      householdSizeFactor: round2(sizeFactor),
      housingQualityFactor: round2(housingFactor),
      appliedSize: profile.householdSize,
      appliedHousingQuality: round2(roof / 100),
    },
    rationale: buildRationale(householdAffordability, band, profile, sizeFactor, housingFactor),
    computedAt: Date.now(),
    censusVersion: `${cluster.id}:${profile.fokontanyId}`,
  };
}

function toBand(amount: number): AffordabilityBand {
  if (amount < BAND_THRESHOLDS[0]) return 1;
  if (amount < BAND_THRESHOLDS[1]) return 2;
  if (amount < BAND_THRESHOLDS[2]) return 3;
  if (amount < BAND_THRESHOLDS[3]) return 4;
  return 5;
}

function clusterAvgRoof(c: Cluster): number {
  return c.mics.length === 0 ? 40 :
    c.mics.reduce((s, m) => s + m.housingQuality.finishedRoofPercent, 0) / c.mics.length;
}

function clusterAvgFloor(c: Cluster): number {
  return c.mics.length === 0 ? 30 :
    c.mics.reduce((s, m) => s + m.housingQuality.finishedFloorPercent, 0) / c.mics.length;
}

function buildRationale(
  amount: number, band: AffordabilityBand, profile: HouseholdProfile,
  sizeFactor: number, housingFactor: number
): string {
  const sizeNote = profile.householdSize > 4
    ? `household of ${profile.householdSize} (+${Math.round((sizeFactor - 1) * 100)}%)`
    : profile.householdSize < 4
    ? `household of ${profile.householdSize} (−${Math.round((1 - sizeFactor) * 100)}%)`
    : `household of ${profile.householdSize}`;

  const housingNote = housingFactor > 0.85 ? "good housing quality"
    : housingFactor < 0.65 ? "basic housing quality" : "standard housing quality";

  return `Based on ${sizeNote} and ${housingNote}, your affordable monthly range is up to ${amount.toLocaleString()} MGA (band ${band}).`;
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function round2(n: number) { return Math.round(n * 100) / 100; }
