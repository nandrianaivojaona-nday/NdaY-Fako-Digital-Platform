// hooks/useAssessmentDraft.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { get, set } from "idb-keyval";
import { AssessmentDraft } from "@/types/campaign";
import {
  createDraft,
  markPendingSync,
  nextStep,
  prevStep,
} from "@/lib/assessment-state";
import { syncDraftToFirestore } from "@/lib/syncDraftToFirestore";

const localStore = {
  async get(key: string): Promise<AssessmentDraft | undefined> {
    return (await get(key)) as AssessmentDraft | undefined;
  },

  async set(key: string, value: AssessmentDraft): Promise<void> {
    await set(key, value);
  },
};

export function useAssessmentDraft(campaignId: string, operatorId: string) {
  const key = `assessment:${campaignId}:${operatorId}`;
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    localStore.get(key).then((saved) => {
      setDraft(saved ?? createDraft(campaignId, operatorId));
      setLoading(false);
    });
  }, [key, campaignId, operatorId]);

  const persist = useCallback(
    async (updated: AssessmentDraft) => {
      setDraft(updated);
      await localStore.set(key, updated);
    },
    [key]
  );

  const save = useCallback(
    async (partial: Partial<AssessmentDraft>) => {
      if (!draft) return;
      const updated = markPendingSync({ ...draft, ...partial });
      await persist(updated);
    },
    [draft, persist]
  );

  const advance = useCallback(async () => {
    if (!draft) return;
    const step = nextStep(draft.currentStep) ?? draft.currentStep;
    const updated = markPendingSync({ ...draft, currentStep: step });
    await persist(updated);
  }, [draft, persist]);

  const back = useCallback(async () => {
    if (!draft) return;
    const step = prevStep(draft.currentStep) ?? draft.currentStep;
    const updated = markPendingSync({ ...draft, currentStep: step });
    await persist(updated);
  }, [draft, persist]);

  const syncNow = useCallback(async () => {
    if (!draft) return;
    setSyncing(true);
    setSyncError(null);

    try {
      await syncDraftToFirestore(campaignId, operatorId, draft);
    } catch (error: any) {
      setSyncError(error?.message || "Failed to sync draft");
    } finally {
      setSyncing(false);
    }
  }, [campaignId, operatorId, draft]);

  return {
    draft,
    loading,
    syncing,
    syncError,
    save,
    advance,
    back,
    syncNow,
  };
}
