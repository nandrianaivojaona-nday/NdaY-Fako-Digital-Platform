// lib/domain/businessModel/validationTypes.ts
//
// The Offer Validation Engine (OVE) record.
// Uses the four-outcome decision matrix from decisionTypes.ts.

import type {
  ValidationCheck,
  OVEDecision,
  DecisionSummary,
} from "./decisionTypes";

export interface OVEValidation {
  id: string;
  scenarioId: string;
  tveRunId: string;

  decision: OVEDecision;

  /** Human-readable list of checks with legacy `severity` mapping. */
  checks: Array<{
    name: string;
    passed: boolean;
    severity: "BLOCKER" | "WARNING" | "INFO";
    detail: string;
  }>;

  /** Full outcome matrix — the authoritative record. */
  checkOutcomes: ValidationCheck[];
  checkSummary: DecisionSummary;

  /** If ADJUST, the specific checks that must be addressed. */
  adjustmentsRequired?: string[];

  notes?: string;

  validatedBy: string;
  validatedAt: number;
  createdAt: number;
}
