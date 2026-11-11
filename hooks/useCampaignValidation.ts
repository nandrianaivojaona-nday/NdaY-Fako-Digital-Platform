"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { createConfigDraft } from "@/lib/api/config";
import { validateConfigVersion } from "@/lib/domain/config/validateConfigVersion";

export type PricingMode = "FIXED" | "BOUNDED" | "GUIDED";

export interface ValidationState {
  pricing: { mode: PricingMode; min: number; recommended: number; max: number; valid: boolean };
  financial: { commission: number; methods: string[]; valid: boolean };
  requirements: { collectors: number; frequency: "daily" | "weekly" | "on-demand"; valid: boolean };
  system: { ready: boolean; checks: string[] };
}

export function useCampaignValidation(campaignId: string) {
  const router = useRouter();
  const db = getDb();
  const [state, setState] = useState<ValidationState>({
    pricing: { mode: "BOUNDED", min: 2000, recommended: 5000, max: 10000, valid: true },
    financial: { commission: 10, methods: ["mobile_money"], valid: true },
    requirements: { collectors: 10, frequency: "weekly", valid: true },
    system: { ready: false, checks: [] },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (section: keyof ValidationState, data: any) => {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], ...data } }));
  };

  // Local UI hint — full validation happens server-side in validateConfigVersion
  const validateLocal = (): boolean => {
    const pricingValid =
      state.pricing.mode === "FIXED" ||
      (state.pricing.min < state.pricing.recommended && state.pricing.recommended < state.pricing.max);
    const financialValid = state.financial.commission >= 0 && state.financial.commission <= 100;
    const reqValid = state.requirements.collectors > 0;
    const isValid = pricingValid && financialValid && reqValid;
    setState((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, valid: pricingValid },
      financial: { ...prev.financial, valid: financialValid },
      requirements: { ...prev.requirements, valid: reqValid },
    }));
    return isValid;
  };

  useEffect(() => {
    async function loadSystemReadiness() {
      try {
        const snap = await getDoc(doc(db, "campaigns", campaignId));
        const data = snap.data();
        const checks = [
          "Campaign exists",
          "Campaign has zone defined",
          "Pricing rules available",
          "Financial rules available",
          "Operator template config exists",
        ];
        const ready = data?.zone && data?.fokontany && data?.status === "APPROVED";
        setState((prev) => ({ ...prev, system: { ready: !!ready, checks } }));
      } catch (err) {
        console.error("System readiness check failed:", err);
      }
    }
    if (campaignId) loadSystemReadiness();
  }, [campaignId, db]);

  const validateAndActivate = async () => {
    if (!validateLocal()) {
      alert("Please fix validation errors before proceeding.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        pricingFramework: {
          mode: state.pricing.mode,
          min: state.pricing.min,
          recommended: state.pricing.recommended,
          max: state.pricing.max,
        },
        financialRules: {
          commission: state.financial.commission,
          methods: state.financial.methods,
        },
        operatorRequirements: {
          collectors: state.requirements.collectors,
          frequency: state.requirements.frequency,
        },
      };

      // Fail fast: same validator the server uses, run client-side for UI feedback.
      try { validateConfigVersion(payload); }
      catch (e: any) { alert(`Validation failed: ${e.message}`); return; }

      // Get the current user's ID token — required for the API call
      const { getAuth } = await import("firebase/auth");
      const user = getAuth().currentUser;
      if (!user) throw new Error("Not signed in");
      const idToken = await user.getIdToken();

      // 1. Create a DRAFT config version (server-authoritative)
      const { versionId, versionNumber } = await createConfigDraft(campaignId, payload, idToken);

      // 2. Separately flip the campaign status (this is an admin-only write,
      //    still permitted under the Phase 0 rules).
      await updateDoc(doc(db, "campaigns", campaignId), {
        status: "VALIDATED_FOR_ACTIVATION",
        validatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(`DRAFT config version ${versionNumber} (${versionId}) created.`);
      router.push(`/campaigns/${campaignId}/assign`);
    } catch (error: any) {
      console.error("Activation failed:", error);
      alert(error?.message ?? "Failed to activate campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { state, update, validateAndActivate, isSubmitting };
}
