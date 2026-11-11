// lib/domain/service/cycleStateMachine.ts
import type { CycleStatus } from "./cycleTypes";

export type CycleTransition =
  | "ASSIGN" | "PERFORM" | "CAPTURE_PROOF"
  | "VERIFY_PASS" | "VERIFY_FLAG" | "VERIFY_REJECT"
  | "ACCEPT" | "AUTO_ACCEPT" | "DISPUTE"
  | "RESOLVE_DISPUTE_RELEASE" | "RESOLVE_DISPUTE_REFUND"
  | "SETTLE" | "CANCEL" | "SKIP";

const TRANSITIONS: Record<CycleStatus, CycleTransition[]> = {
  SCHEDULED:      ["ASSIGN", "CANCEL", "SKIP"],
  ASSIGNED:       ["PERFORM", "CANCEL", "SKIP"],
  PERFORMED:      ["CAPTURE_PROOF", "CANCEL"],
  PROOF_CAPTURED: ["VERIFY_PASS", "VERIFY_FLAG", "VERIFY_REJECT"],
  VERIFIED:       ["ACCEPT", "AUTO_ACCEPT", "DISPUTE"],
  DISPUTED:       ["RESOLVE_DISPUTE_RELEASE", "RESOLVE_DISPUTE_REFUND"],
  ACCEPTED:       ["SETTLE"],
  REJECTED:       ["CANCEL"],
  SETTLED:        [],
  CANCELLED:      [],
  SKIPPED:        [],
};

export function canTransition(from: CycleStatus, t: CycleTransition): boolean {
  return TRANSITIONS[from]?.includes(t) ?? false;
}

export function nextStatus(from: CycleStatus, t: CycleTransition): CycleStatus {
  if (!canTransition(from, t)) throw new Error(`Illegal cycle transition ${from} → ${t}`);
  switch (t) {
    case "ASSIGN":                  return "ASSIGNED";
    case "PERFORM":                 return "PERFORMED";
    case "CAPTURE_PROOF":           return "PROOF_CAPTURED";
    case "VERIFY_PASS":             return "VERIFIED";
    case "VERIFY_FLAG":             return "PROOF_CAPTURED";
    case "VERIFY_REJECT":           return "REJECTED";
    case "ACCEPT":
    case "AUTO_ACCEPT":             return "ACCEPTED";
    case "DISPUTE":                 return "DISPUTED";
    case "RESOLVE_DISPUTE_RELEASE": return "ACCEPTED";
    case "RESOLVE_DISPUTE_REFUND":  return "REJECTED";
    case "SETTLE":                  return "SETTLED";
    case "CANCEL":                  return "CANCELLED";
    case "SKIP":                    return "SKIPPED";
  }
}

export type CycleActor =
  | "COLLECTOR" | "SUPERVISOR" | "MANAGER" | "CEO"
  | "SYSTEM" | "CITIZEN" | "INSTITUTION";

const AUTHORIZED: Record<CycleTransition, CycleActor[]> = {
  ASSIGN:                   ["SUPERVISOR", "MANAGER", "SYSTEM"],
  PERFORM:                  ["COLLECTOR"],
  CAPTURE_PROOF:            ["COLLECTOR"],
  VERIFY_PASS:              ["SYSTEM", "SUPERVISOR"],
  VERIFY_FLAG:              ["SYSTEM"],
  VERIFY_REJECT:            ["SUPERVISOR", "MANAGER"],
  ACCEPT:                   ["CITIZEN", "INSTITUTION"],
  AUTO_ACCEPT:              ["SYSTEM"],
  DISPUTE:                  ["CITIZEN", "INSTITUTION"],
  RESOLVE_DISPUTE_RELEASE:  ["MANAGER", "CEO", "SYSTEM"],
  RESOLVE_DISPUTE_REFUND:   ["MANAGER", "CEO", "SYSTEM"],
  SETTLE:                   ["SYSTEM"],
  CANCEL:                   ["SUPERVISOR", "MANAGER", "SYSTEM"],
  SKIP:                     ["SYSTEM"],
};

export function isActorAuthorized(t: CycleTransition, a: CycleActor): boolean {
  return AUTHORIZED[t]?.includes(a) ?? false;
}