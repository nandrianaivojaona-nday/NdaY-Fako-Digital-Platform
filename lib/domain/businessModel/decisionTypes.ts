// lib/domain/businessModel/decisionTypes.ts
//
// Four check outcomes; three OVE decisions. The mapping is explicit.
//
//   any CRITICAL_FAIL              → NO_GO
//   any FAIL (and no CRITICAL)     → ADJUST
//   only WARNING (and no FAIL)     → GO with warnings
//   all PASS                       → GO

// ------
// PASS/WARNING/FAIL/CRITICAL_FAIL matrix 
// -----

export type CheckOutcome = "PASS" | "WARNING" | "FAIL" | "CRITICAL_FAIL";
export type OVEDecision = "GO" | "ADJUST" | "NO_GO";

export interface ValidationCheck {
  name: string;
  outcome: CheckOutcome;
  detail: string;
  measuredValue?: number | string;
  threshold?: number | string;
}

export function deriveDecision(checks: ValidationCheck[]): OVEDecision {
  if (checks.some((c) => c.outcome === "CRITICAL_FAIL")) return "NO_GO";
  if (checks.some((c) => c.outcome === "FAIL")) return "ADJUST";
  return "GO";
}

export interface DecisionSummary {
  pass: number;
  warning: number;
  fail: number;
  critical: number;
}

export function summarize(checks: ValidationCheck[]): DecisionSummary {
  return {
    pass: checks.filter((c) => c.outcome === "PASS").length,
    warning: checks.filter((c) => c.outcome === "WARNING").length,
    fail: checks.filter((c) => c.outcome === "FAIL").length,
    critical: checks.filter((c) => c.outcome === "CRITICAL_FAIL").length,
  };
}