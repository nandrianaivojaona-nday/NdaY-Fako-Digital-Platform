// lib/domain/settlement/payoutTypes.ts
export type PayoutStatus = "PENDING" | "INSTRUCTED" | "CONFIRMED" | "FAILED" | "CANCELLED";
export type PayoutMethod = "BANK" | "MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY";

export interface SettlementPayout {
  id: string;
  operatorId: string;
  periodStart: number;
  periodEnd: number;
  entitlementIds: string[];
  totalMGA: number;
  operatorBankDetails?: {
    bankName?: string;
    accountNumber?: string;
    mobileMoneyPhone?: string;
  };
  method: PayoutMethod;
  status: PayoutStatus;
  attempt?: number;
  providerReference?: string;
  failureReason?: string;
  instructedAt?: number;
  confirmedAt?: number;
  failedAt?: number;
  createdAt: number;
  updatedAt: number;
}
