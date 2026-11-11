export type ConfigVersionStatus = "DRAFT" | "APPROVED" | "LOCKED" | "SUPERSEDED";

export interface CampaignConfigVersion {
  versionId: string;
  campaignId: string;
  versionNumber: number;
  contentHash?: string;
  pricingFramework: Record<string, unknown>;
  financialRules: Record<string, unknown>;
  operatorRequirements: Record<string, unknown>;
  status: ConfigVersionStatus;
  previousVersionId?: string;
  createdBy: string;
  createdAt: number;
  approvedAt?: number;
  lockedAt?: number;
}

export interface CampaignConfigApproval {
  approvalId: string;
  versionId: string;
  approverUserId: string;
  decision: "APPROVED" | "REJECTED";
  rationale: string;
  timestamp: number;
}
