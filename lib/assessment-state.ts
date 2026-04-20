// ============================================================
// lib/assessment-state.ts — Assessment State Machine
// ============================================================

import {
  AssessmentDraft,
  AssessmentStep,
  OfflineMeta,
  SyncState,
} from "@/types/campaign";

const STEP_ORDER: AssessmentStep[] = [
  "BRIEF",
  "MARKET_DEMAND",
  "OPERABILITY",
  "BANKABILITY",
  "RISK",
  "DOCUMENT",
  "DECISION",
];

export function nextStep(current: AssessmentStep): AssessmentStep | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function prevStep(current: AssessmentStep): AssessmentStep | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}

export function stepProgress(current: AssessmentStep): number {
  const idx = STEP_ORDER.indexOf(current);
  return Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}

// Create a fresh offline draft
export function createDraft(
  campaignId: string,
  operatorId: string
): AssessmentDraft {
  const now = new Date().toISOString();
  const offline: OfflineMeta = {
    availableOffline: true,
    syncState: "LOCAL_ONLY",
    localUpdatedAt: now,
    deviceDraftId: `${campaignId}-${operatorId}-${Date.now()}`,
  };
  return {
    id: offline.deviceDraftId!,
    campaignId,
    operatorId,
    currentStep: "BRIEF",
    offline,
  };
}

// Mark draft as pending sync after a write
export function markPendingSync(draft: AssessmentDraft): AssessmentDraft {
  return {
    ...draft,
    offline: {
      ...draft.offline,
      syncState: "PENDING_SYNC" as SyncState,
      localUpdatedAt: new Date().toISOString(),
    },
  };
}

// Mark synced after successful server write
export function markSynced(draft: AssessmentDraft): AssessmentDraft {
  return {
    ...draft,
    offline: {
      ...draft.offline,
      syncState: "SYNCED" as SyncState,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}
