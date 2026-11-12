// lib/domain/settlement/settlementTypes.ts
export interface SettlementSplit {
    operatorMGA: number;
    ndayFeeMGA: number;
    paymentCostMGA: number;
  }
  
  export interface SettlementEntitlement {
    id: string;
    cycleId: string;
    serviceProofId: string;
    subscriptionId: string;
    offerId: string;
    offerVersionId: string;
    citizenId: string;
    operatorId: string;
    entitlementValueMGA: number;
    platformFeePercent: number;
    paymentCostPercent: number;
    paymentMethod: string;
    split: SettlementSplit;
    netToOperatorMGA: number;
    status: "EMITTED" | "REVERSED" | "ADJUSTED";
    emittedAt: number;
    reversalOf?: string;
    adjustmentOf?: string;
    reason?: string;
    assumptions: {
      offerVersionNumber: number;
      planTypeId: string;
      escrowId: string;
      acceptanceMethod: string;
      acceptanceStatus: string;
      // Combine policy — validation snapshot at settle time
      territoryIdSnapshot?: string;
      configVersionIdSnapshot?: string;
      validationValidatedAtSnapshot?: number;
    };
    rawNdaYFeeMGA: number;
    rawPaymentCostMGA: number;
    rawNetToOperatorMGA: number;
  }
  
  export interface SettlementBatch {
    id: string;
    operatorId: string;
    periodStart: number;
    periodEnd: number;
    entitlementIds: string[];
    totals: { grossMGA: number; operatorMGA: number; ndayFeeMGA: number; paymentCostMGA: number };
    status: "DRAFT" | "FINALIZED";
    finalizedAt?: number;
    createdAt: number;
  }