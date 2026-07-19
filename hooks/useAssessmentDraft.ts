// hooks/useAssessmentDraft.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAssessmentDraft,
  saveAssessmentDraft,
  createDraft,
  markPendingSync,
  nextStep,
  prevStep,
  AssessmentDraft,
} from "@/lib/assessment-state";
import { syncDraftToFirestore } from "@/lib/syncDraftToFirestore";

export function useAssessmentDraft(campaignId: string, userId: string) {
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !userId) {
      setLoading(false);
      return;
    }

    async function loadDraft() {
      try {
        let existing = await getAssessmentDraft(campaignId, userId);
        if (!existing) {
          existing = await createDraft(campaignId, userId);
        }
        setDraft(existing);
      } catch (err) {
        console.error("Failed to load draft:", err);
        setSyncError("Failed to load draft");
      } finally {
        setLoading(false);
      }
    }
    loadDraft();
  }, [campaignId, userId]);

  const save = useCallback(
    async (data: Partial<AssessmentDraft>) => {
      if (!campaignId || !userId) return;
      try {
        await saveAssessmentDraft({ campaignId, userId, ...data });
        setDraft((prev) => (prev ? { ...prev, ...data } : null));
      } catch (err) {
        console.error("Save error:", err);
        setSyncError("Save failed");
      }
    },
    [campaignId, userId]
  );

  const advance = useCallback(async () => {
    if (!campaignId || !userId) return;
    try {
      await nextStep(campaignId, userId);
      const updated = await getAssessmentDraft(campaignId, userId);
      setDraft(updated);
    } catch (err) {
      console.error("Advance error:", err);
      setSyncError("Step advance failed");
    }
  }, [campaignId, userId]);

  const back = useCallback(async () => {
    if (!campaignId || !userId) return;
    try {
      await prevStep(campaignId, userId);
      const updated = await getAssessmentDraft(campaignId, userId);
      setDraft(updated);
    } catch (err) {
      console.error("Back error:", err);
      setSyncError("Step back failed");
    }
  }, [campaignId, userId]);

  const syncNow = useCallback(async () => {
    if (!campaignId || !userId) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await syncDraftToFirestore(campaignId, userId);
      const updated = await getAssessmentDraft(campaignId, userId);
      setDraft(updated);
    } catch (err: any) {
      setSyncError(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [campaignId, userId]);

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