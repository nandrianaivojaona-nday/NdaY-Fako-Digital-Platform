// lib/domain/subscription/offerStateMachine.ts
import type { OfferStatus, OfferVersionStatus } from "./offerTypes";
import type { OperatorRole } from "./operatorRoles";

// ============================================================
// OFFER LIFECYCLE TRANSITIONS
// ============================================================

export type OfferTransition =
  | "CREATE_DRAFT"
  | "EDIT_DRAFT"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "ACTIVATE"
  | "SUSPEND"
  | "RETIRE";

const OFFER_TRANSITIONS: Record<OfferStatus, OfferTransition[]> = {
  DRAFT:     ["EDIT_DRAFT", "SUBMIT", "RETIRE"],
  SUBMITTED: ["APPROVE", "REJECT", "RETIRE"],
  ACTIVE:    ["EDIT_DRAFT", "SUSPEND", "RETIRE"], // EDIT_DRAFT creates a new version
  SUSPENDED: ["ACTIVATE", "RETIRE"],
  RETIRED:   [],
};

export function canTransitionOffer(from: OfferStatus, transition: OfferTransition): boolean {
  return OFFER_TRANSITIONS[from]?.includes(transition) ?? false;
}

export function nextOfferStatus(
  from: OfferStatus,
  transition: OfferTransition
): OfferStatus | null {
  if (!canTransitionOffer(from, transition)) return null;
  switch (transition) {
    case "CREATE_DRAFT":
    case "EDIT_DRAFT":
      return "DRAFT";
    case "SUBMIT":
      return "SUBMITTED";
    case "APPROVE":
      return "ACTIVE";
    case "REJECT":
      return "DRAFT";
    case "ACTIVATE":
      return "ACTIVE";
    case "SUSPEND":
      return "SUSPENDED";
    case "RETIRE":
      return "RETIRED";
  }
}

// ============================================================
// VERSION LIFECYCLE TRANSITIONS
// ============================================================

export type VersionTransition =
  | "CREATE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "ACTIVATE"
  | "SUPERSEDE";

const VERSION_TRANSITIONS: Record<OfferVersionStatus, VersionTransition[]> = {
  DRAFT:      ["SUBMIT"],
  SUBMITTED:  ["APPROVE", "REJECT"],
  APPROVED:   ["ACTIVATE"],
  REJECTED:   [],
  ACTIVE:     ["SUPERSEDE"],
  SUPERSEDED: [],
};

export function canTransitionVersion(
  from: OfferVersionStatus,
  transition: VersionTransition
): boolean {
  return VERSION_TRANSITIONS[from]?.includes(transition) ?? false;
}

// ============================================================
// ROLE-BASED AUTHORIZATION
// ============================================================

export function isTransitionAuthorized(
  transition: OfferTransition,
  role: OperatorRole
): boolean {
  switch (transition) {
    case "CREATE_DRAFT":
    case "EDIT_DRAFT":
      return role === "MANAGER" || role === "OPERATOR_ADMIN" || role === "CEO";
    case "SUBMIT":
      return role === "OPERATOR_ADMIN" || role === "CEO";
    case "APPROVE":
    case "REJECT":
      return role === "CEO";
    case "ACTIVATE":
    case "SUSPEND":
    case "RETIRE":
      return role === "CEO" || role === "OPERATOR_ADMIN";
    default:
      return false;
  }
}
