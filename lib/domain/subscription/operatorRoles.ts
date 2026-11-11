// lib/domain/subscription/operatorRoles.ts
export type OperatorRole =
  | "COLLECTOR" | "SUPERVISOR" | "MANAGER"
  | "OPERATOR_ADMIN" | "CEO";

export interface OfferCapabilities {
  canCreateOffer: boolean;
  canEditOffer: boolean;
  canSubmitOffer: boolean;
  canApproveOffer: boolean;
  canRejectOffer: boolean;
  canRetireOffer: boolean;
}

export const OFFER_CAPABILITIES: Record<OperatorRole, OfferCapabilities> = {
  COLLECTOR:      { canCreateOffer: false, canEditOffer: false, canSubmitOffer: false, canApproveOffer: false, canRejectOffer: false, canRetireOffer: false },
  SUPERVISOR:     { canCreateOffer: false, canEditOffer: false, canSubmitOffer: false, canApproveOffer: false, canRejectOffer: false, canRetireOffer: false },
  MANAGER:        { canCreateOffer: true,  canEditOffer: true,  canSubmitOffer: false, canApproveOffer: false, canRejectOffer: false, canRetireOffer: false },
  OPERATOR_ADMIN: { canCreateOffer: true,  canEditOffer: true,  canSubmitOffer: true,  canApproveOffer: false, canRejectOffer: false, canRetireOffer: false },
  CEO:            { canCreateOffer: true,  canEditOffer: true,  canSubmitOffer: true,  canApproveOffer: true,  canRejectOffer: true,  canRetireOffer: true  },
};

export const canApproveOffer = (r: OperatorRole) => OFFER_CAPABILITIES[r]?.canApproveOffer === true;
export const canSubmitOffer  = (r: OperatorRole) => OFFER_CAPABILITIES[r]?.canSubmitOffer === true;
export const canEditOffer    = (r: OperatorRole) => OFFER_CAPABILITIES[r]?.canEditOffer === true;
export const canCreateOffer  = (r: OperatorRole) => OFFER_CAPABILITIES[r]?.canCreateOffer === true;