// ============================================================
// lib/scoring.ts — Local scoring engine (runs fully offline)
// ============================================================

import {
  OperabilityInputs,
  OperabilityAssessment,
  BankabilityInputs,
  BankabilityAssessment,
  RiskInputs,
  RiskAssessment,
  MarketDemandInputs,
  MarketDemandOutput,
  AssessmentBand,
  ReadinessScores,
  scoreToBand,
  computeReadiness,
} from "@/types/campaign";

function avg(values: (number | undefined)[]): number {
  const valid = values.filter((v): v is number => v !== undefined);
  if (valid.length === 0) return 50;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ─── Operability ─────────────────────────────────────────────

export function scoreOperability(
  inputs: OperabilityInputs
): OperabilityAssessment {
  const score = Math.round(
    avg([
      inputs.routeComplexity !== undefined ? 100 - inputs.routeComplexity : undefined,
      inputs.accessibilityScore,
      inputs.assetReadiness,
      inputs.workforceReadiness,
      inputs.traceabilityReadiness,
      inputs.monitoringEase,
      inputs.stakeholderCoordination,
      inputs.operatorSlotFillRate,
    ])
  );
  const band: AssessmentBand = scoreToBand(score);
  const keyStrengths = [
    inputs.assetReadiness && inputs.assetReadiness >= 70 ? "Strong asset readiness" : null,
    inputs.traceabilityReadiness && inputs.traceabilityReadiness >= 70 ? "Good traceability coverage" : null,
    inputs.workforceReadiness && inputs.workforceReadiness >= 70 ? "Workforce ready" : null,
  ].filter(Boolean) as string[];
  const keyConstraints = [
    inputs.routeComplexity && inputs.routeComplexity >= 70 ? "High route complexity" : null,
    inputs.accessibilityScore && inputs.accessibilityScore < 40 ? "Limited territory access" : null,
  ].filter(Boolean) as string[];
  const interventions = keyConstraints.map((c) => `Address: ${c}`);
  return { score, band, keyStrengths, keyConstraints, interventions };
}

// ─── Bankability ─────────────────────────────────────────────

export function scoreBankability(
  inputs: BankabilityInputs
): BankabilityAssessment {
  const margin =
    inputs.expectedRevenueAr !== undefined && inputs.expectedCostAr !== undefined
      ? inputs.expectedRevenueAr - inputs.expectedCostAr
      : undefined;
  const marginScore =
    margin !== undefined && inputs.expectedRevenueAr
      ? Math.max(0, Math.min(100, (margin / inputs.expectedRevenueAr) * 100))
      : 50;
  const score = Math.round(
    avg([
      marginScore,
      inputs.rewardAdequacyScore,
      inputs.throughputConsistency,
      inputs.cashflowStability,
    ])
  );
  const band: AssessmentBand = scoreToBand(score);
  const keyDrivers = [
    inputs.rewardAdequacyScore && inputs.rewardAdequacyScore >= 70 ? "Reward model is attractive" : null,
    inputs.throughputConsistency && inputs.throughputConsistency >= 70 ? "Consistent throughput expected" : null,
  ].filter(Boolean) as string[];
  const blockers = [
    margin !== undefined && margin < 0 ? "Negative expected margin" : null,
    inputs.paybackPeriodMonths && inputs.paybackPeriodMonths > 18 ? "Long payback period (> 18 months)" : null,
  ].filter(Boolean) as string[];
  return {
    score,
    band,
    expectedMarginAr: margin,
    scenarioNote: margin !== undefined && margin >= 0 ? "Base case positive" : "Base case negative",
    keyDrivers,
    blockers,
  };
}

// ─── Risk ─────────────────────────────────────────────────────

export function scoreRisk(inputs: RiskInputs): RiskAssessment {
  const overallRisk = Math.round(
    avg([
      inputs.territoryAccessRisk,
      inputs.communityAdoptionRisk,
      inputs.volumeUncertaintyRisk,
      inputs.traceabilityRisk,
      inputs.partnerDependencyRisk,
      inputs.regulatoryRisk,
    ])
  );
  const topRisks = [
    inputs.territoryAccessRisk && inputs.territoryAccessRisk >= 60 ? "Territory access" : null,
    inputs.communityAdoptionRisk && inputs.communityAdoptionRisk >= 60 ? "Community adoption" : null,
    inputs.volumeUncertaintyRisk && inputs.volumeUncertaintyRisk >= 60 ? "Volume uncertainty" : null,
    inputs.regulatoryRisk && inputs.regulatoryRisk >= 60 ? "Regulatory compliance" : null,
  ].filter(Boolean) as string[];
  const mitigations = topRisks.map((r) => `Develop mitigation plan for: ${r}`);
  const goDecision =
    overallRisk < 40 ? "GO" : overallRisk < 65 ? "GO_WITH_CONDITIONS" : "NO_GO";
  return { overallRisk, topRisks, mitigations, goDecision };
}

// ─── Market Demand ────────────────────────────────────────────

export function scoreMarketDemand(
  inputs: MarketDemandInputs
): MarketDemandOutput {
  const oppKg =
    inputs.householdCount !== undefined &&
    inputs.wasteGenerationKgPerHhPerWeek !== undefined &&
    inputs.expectedRecoveryRate !== undefined
      ? inputs.householdCount *
        inputs.wasteGenerationKgPerHhPerWeek *
        (inputs.expectedRecoveryRate / 100) *
        4.3
      : undefined;
  const demandScore = Math.round(
    avg([
      inputs.existingCollectionGapPercent,
      inputs.localRecyclingOutletAccess ? 80 : 40,
      inputs.householdCount ? Math.min(100, inputs.householdCount / 10) : 50,
    ])
  );
  return {
    demandScore,
    opportunitySizeKg: oppKg ? Math.round(oppKg) : undefined,
    serviceGapNarrative:
      inputs.existingCollectionGapPercent && inputs.existingCollectionGapPercent > 50
        ? "Significant gap in current collection coverage — high opportunity."
        : "Moderate service gap — proceed with demand validation.",
  };
}

// ─── Composite ───────────────────────────────────────────────

export function computeFullReadiness(
  demandScore: number,
  operabilityScore: number,
  bankabilityScore: number,
  overallRisk: number
): ReadinessScores {
  return computeReadiness(demandScore, operabilityScore, bankabilityScore, overallRisk);
}
