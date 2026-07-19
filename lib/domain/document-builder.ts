// ============================================================
// lib/document-builder.ts — Generates the project document
//                           fully offline from a draft
// ============================================================

import {
  AssessmentDraft,
  CampaignAssessmentDocument,
  Campaign,
  OfflineMeta,
} from "@/types/campaign";
import { computeFullReadiness } from "./scoring";

export function buildAssessmentDocument(
  draft: AssessmentDraft,
  campaign: Campaign
): CampaignAssessmentDocument {
  const now = new Date().toISOString();

  // Scores
  const scores = computeFullReadiness(
    draft.marketDemandOutput?.demandScore ?? 50,
    draft.operabilityAssessment?.score ?? 50,
    draft.bankabilityAssessment?.score ?? 50,
    draft.riskAssessment?.overallRisk ?? 50
  );

  // Executive summary
  const summary = `
Campaign "${campaign.name}" in ${campaign.fokontany} assessed on ${now.slice(0, 10)}.
Overall readiness: ${scores.overall}/100 (${scores.band}).
Bankability: ${scores.bankability}/100. Operability: ${scores.operability}/100.
Risk decision: ${draft.riskAssessment?.goDecision ?? "PENDING"}.
  `.trim();

  const offline: OfflineMeta = {
    availableOffline: true,
    syncState: "PENDING_SYNC",
    localUpdatedAt: now,
    deviceDraftId: draft.offline.deviceDraftId,
  };

  return {
    id: `doc-${draft.id}`,
    campaignId: campaign.id,
    campaignName: campaign.name,
    fokontany: campaign.fokontany,
    generatedAt: now,
    offline,
    executiveSummary: summary,
    brief: draft.brief ?? { campaignId: campaign.id },
    marketDemand: draft.marketDemandOutput ?? { demandScore: 0 },
    operability: draft.operabilityAssessment ?? {
      score: 0, band: "WEAK", keyStrengths: [], keyConstraints: [], interventions: [],
    },
    bankability: draft.bankabilityAssessment ?? {
      score: 0, band: "WEAK", keyDrivers: [], blockers: [],
    },
    risk: draft.riskAssessment ?? {
      overallRisk: 0, topRisks: [], mitigations: [], goDecision: "NO_GO",
    },
    scores,
    recommendation: scores.band === "STRONG"
      ? "Strongly recommended to proceed as operator."
      : scores.band === "VIABLE"
      ? "Viable opportunity — proceed with identified conditions."
      : scores.band === "WEAK"
      ? "Weak profile — further preparation needed before committing."
      : "Not recommended at this stage.",
    decision: draft.decision,
    decisionNotes: draft.decisionNotes,
  };
}
