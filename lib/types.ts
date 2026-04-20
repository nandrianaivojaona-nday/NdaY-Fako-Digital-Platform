export type CampaignStatus =
  | "CREATED"
  | "VALIDATED"
  | "ONGOING"
  | "CRITICAL"
  | "COMPLETED";

export type CampaignUrgency = "high" | "medium" | "low";
import type {Campaign} from "@/types/campaign";

export type ExtendedCampaign =  Campaign & {
  // ... other fields
  status: "CREATED" | "ONGOING" | "CRITICAL" | "VALIDATED" | "COMPLETED";
  bankability: { // Remove the '?' so it is no longer optional
    scores: {
      overall: number;
      financial: number;
      environmental: number;
      operational: number;
    };
    investmentProfile: {
      monthlyRevenue: number;
      estimatedROI: number;
      paybackMonths: number;
      riskLevel: string;
      carbonReductionTons?: number; // Optional field for carbon reduction
    };
  };
};