// Phase 1 scaffold. Source-of-truth types for campaign config versioning.
// Wire the approve/create-draft endpoints following the lock endpoint's pattern.
export type ConfigVersionStatus = "DRAFT" | "APPROVED" | "LOCKED" | "SUPERSEDED";

export interface CampaignConfigVersion {
  versionId: string;
  campaignId: string;
  versionNumber: number;
  contentHash: string;                 // sha256 of canonical JSON
  pricingFramework: Record<string, unknown>;
  financialRules: Record<string, unknown>;
  operatorRequirements: Record<string, unknown>;
  status: ConfigVersionStatus;
  previousVersionId?: string;
  createdBy: string;
  createdAt: number;                   // epoch ms
}

export interface CampaignConfigApproval {
  approvalId: string;
  versionId: string;
  approverUserId: string;
  decision: "APPROVED" | "REJECTED";
  rationale: string;
  timestamp: number;
}
