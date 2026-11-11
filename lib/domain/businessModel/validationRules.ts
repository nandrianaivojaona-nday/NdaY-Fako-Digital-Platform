// lib/domain/businessModel/validationRules.ts
//
// The Offer Validation Engine (OVE).
// Runs a set of checks against a BusinessModelScenario, produces a
// four-outcome decision matrix, and derives GO / ADJUST / NO_GO.
//
// Decision rules:
//   any CRITICAL_FAIL              → NO_GO
//   any FAIL (and no CRITICAL)     → ADJUST
//   only WARNING (and no FAIL)     → GO
//   all PASS                       → GO

import type { BusinessModelScenario } from "./scenarioTypes";
import type { OVEValidation } from "./validationTypes";
import type { ValidationCheck } from "./decisionTypes";
import { deriveDecision, summarize } from "./decisionTypes";
import type { TVERun } from "../territory/tveRunTypes";

const MIN_MARGIN = {
  HOUSEHOLD: 15,
  BUSINESS: 20,
  INSTITUTION: 10,
} as const;

// ================================================================
// RUN
// ================================================================
export function runOVEValidation(input: {
  scenario: BusinessModelScenario;
  tveRun: TVERun;
  validatedBy: string;
}): OVEValidation {
  const { scenario, tveRun, validatedBy } = input;
  const checks: ValidationCheck[] = [];

  // ---- 1. TBI threshold ----
  checks.push({
    name: "TBI_THRESHOLD",
    outcome: scenario.viability.tbi.viable ? "PASS" : "CRITICAL_FAIL",
    detail:
      `TBI ${scenario.viability.tbi.tbi.toFixed(2)} vs threshold ` +
      `${scenario.viability.tbi.threshold}`,
    measuredValue: scenario.viability.tbi.tbi,
    threshold: scenario.viability.tbi.threshold,
  });

  // ---- 2. Plans proposed ----
  checks.push({
    name: "PLAN_PROPOSALS_PRESENT",
    outcome: scenario.planProposals.length > 0 ? "PASS" : "CRITICAL_FAIL",
    detail: `${scenario.planProposals.length} plan(s) generated`,
  });

  // ---- 3. Dominant segment covered ----
  const dominant = [...scenario.segmentMix].sort(
    (a, b) => b.householdCount - a.householdCount
  )[0];
  const covered = new Set(scenario.planProposals.map((p) => p.segment));
  checks.push({
    name: "DOMINANT_SEGMENT_COVERED",
    outcome: dominant && covered.has(dominant.segment) ? "PASS" : "FAIL",
    detail: dominant
      ? `Dominant segment "${dominant.segment}" has a proposal`
      : "No segment mix",
  });

  // ---- 4. Price windows valid ----
  const invalidWindows = scenario.planProposals.filter(
    (p) => p.priceWindow.floorMGA > p.priceWindow.ceilingMGA
  );
  checks.push({
    name: "PRICE_WINDOWS_VALID",
    outcome: invalidWindows.length === 0 ? "PASS" : "CRITICAL_FAIL",
    detail: invalidWindows.length
      ? `${invalidWindows.length} plan(s) have floor > ceiling`
      : "All windows valid",
  });

  // ---- 5. Recommended in window ----
  const outOfWindow = scenario.planProposals.filter(
    (p) =>
      p.priceWindow.recommendedMGA < p.priceWindow.floorMGA ||
      p.priceWindow.recommendedMGA > p.priceWindow.ceilingMGA
  );
  checks.push({
    name: "RECOMMENDED_IN_WINDOW",
    outcome: outOfWindow.length === 0 ? "PASS" : "FAIL",
    detail: outOfWindow.length
      ? `${outOfWindow.length} recommended price(s) outside window`
      : "All recommended prices inside windows",
  });

  // ---- 6. Margin thresholds ----
  const lowMargins = scenario.planProposals.filter((p) => {
    const key =
      p.segment === "household"
        ? "HOUSEHOLD"
        : p.segment === "school" || p.segment === "institutional"
        ? "INSTITUTION"
        : "BUSINESS";
    return p.expected.marginPercent < MIN_MARGIN[key];
  });
  checks.push({
    name: "MARGIN_THRESHOLDS",
    outcome: lowMargins.length === 0 ? "PASS" : "WARNING",
    detail: lowMargins.length
      ? `${lowMargins.length} plan(s) below minimum margin`
      : "All plans meet minimum margin",
  });

  // ---- 7. Social inclusion ----
  const inclusive = scenario.planProposals.some(
    (p) => p.targetBands.includes(1) || p.targetBands.includes(2)
  );
  checks.push({
    name: "SOCIAL_INCLUSION",
    outcome: inclusive ? "PASS" : "WARNING",
    detail: inclusive
      ? "At least one plan targets low-income bands"
      : "No plan targets bands 1–2",
  });

  // ---- 8. OVE streams ----
  const allStreams = new Set(
    scenario.planProposals.flatMap((p) => p.oveStreams)
  );
  checks.push({
    name: "OVE_STREAMS_PRESENT",
    outcome: allStreams.size > 0 ? "PASS" : "WARNING",
    detail: allStreams.size
      ? `Streams: ${Array.from(allStreams).join(", ")}`
      : "No OVE streams recommended",
  });

  // ---- 9. Addressable coverage ----
  const share =
    scenario.totalHouseholds > 0
      ? scenario.addressableHouseholds / scenario.totalHouseholds
      : 0;
  checks.push({
    name: "ADDRESSABLE_COVERAGE",
    outcome: share >= 0.5 ? "PASS" : "WARNING",
    detail: `Addressable share ${Math.round(share * 100)}% of households`,
    measuredValue: share,
    threshold: 0.5,
  });

  // ---- 10. Hazard / serviceability ----
  const routeFactor = tveRun.risks.routeCostFactor;
  const serviceRisk = tveRun.risks.serviceRisk;
  const hazardImpact = tveRun.economics.ocd.hazardImpactMGA;

  let hazardOutcome: "PASS" | "WARNING" | "FAIL" | "CRITICAL_FAIL";
  if (serviceRisk === "SEVERE" && routeFactor >= 1.35) {
    hazardOutcome = "CRITICAL_FAIL";
  } else if (serviceRisk === "HIGH" && routeFactor >= 1.20) {
    hazardOutcome = "FAIL";
  } else if (serviceRisk === "HIGH" || routeFactor >= 1.15) {
    hazardOutcome = "WARNING";
  } else {
    hazardOutcome = "PASS";
  }

  checks.push({
    name: "HAZARD_SERVICEABILITY",
    outcome: hazardOutcome,
    detail:
      `Route factor ${routeFactor.toFixed(2)}, service risk ${serviceRisk}, ` +
      `hazard impact +${hazardImpact.toLocaleString()} MGA/HH/month`,
    measuredValue: routeFactor,
    threshold: 1.15,
  });

  // ---- 11. Confidence ----
  checks.push({
    name: "EVIDENCE_CONFIDENCE",
    outcome:
      scenario.confidence === "HIGH"
        ? "PASS"
        : scenario.confidence === "MEDIUM"
        ? "WARNING"
        : "FAIL",
    detail:
      scenario.confidence === "HIGH"
        ? "All critical evidence is official or field-surveyed"
        : scenario.confidence === "MEDIUM"
        ? "Some inputs are interpolated or operator-entered"
        : "One or more critical inputs are estimated",
  });

  // ================================================================
  // DECISION
  // ================================================================
  const decision = deriveDecision(checks);
  const summary = summarize(checks);

  const adjustmentsRequired =
    decision === "ADJUST"
      ? checks.filter((c) => c.outcome === "FAIL").map((c) => c.name)
      : undefined;

  // Legacy shape for backward compat
  const legacyChecks = checks.map((c) => ({
    name: c.name,
    passed: c.outcome === "PASS",
    severity:
      c.outcome === "CRITICAL_FAIL"
        ? ("BLOCKER" as const)
        : c.outcome === "FAIL"
        ? ("WARNING" as const)
        : ("INFO" as const),
    detail: c.detail,
  }));

  return {
    id: "",
    scenarioId: scenario.id,
    tveRunId: tveRun.id,
    decision,
    checks: legacyChecks,
    checkOutcomes: checks,
    checkSummary: summary,
    adjustmentsRequired,
    validatedBy,
    validatedAt: Date.now(),
    createdAt: Date.now(),
  };
}