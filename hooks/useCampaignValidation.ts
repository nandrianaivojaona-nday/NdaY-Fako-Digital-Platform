// /hooks/useCampaignValidation.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

export type PricingMode = "FIXED" | "BOUNDED" | "GUIDED";

export interface ValidationState {
  pricing: {
    mode: PricingMode;
    min: number;
    recommended: number;
    max: number;
    valid: boolean;
  };
  financial: {
    commission: number;
    methods: string[];
    valid: boolean;
  };
  requirements: {
    collectors: number;
    frequency: "daily" | "weekly" | "on-demand";
    valid: boolean;
  };
  system: {
    ready: boolean;
    checks: string[];
  };
}

export function useCampaignValidation(campaignId: string) {
  const router = useRouter();
  const db = getDb();
  const [state, setState] = useState<ValidationState>({
    pricing: {
      mode: "BOUNDED",
      min: 2000,
      recommended: 5000,
      max: 10000,
      valid: true,
    },
    financial: {
      commission: 10,
      methods: ["mobile_money"],
      valid: true,
    },
    requirements: {
      collectors: 10,
      frequency: "weekly",
      valid: true,
    },
    system: {
      ready: false,
      checks: [],
    },
  });

  const update = (section: keyof ValidationState, data: any) => {
    setState((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...data },
    }));
  };

  // Local validation (frontend check)
  const validateLocal = (): boolean => {
    const pricingValid =
      state.pricing.mode === "FIXED"
        ? true
        : state.pricing.min < state.pricing.recommended &&
          state.pricing.recommended < state.pricing.max;

    const financialValid = state.financial.commission >= 0 && state.financial.commission <= 100;
    const reqValid = state.requirements.collectors > 0;

    const isValid = pricingValid && financialValid && reqValid;

    // Update validity flags
    setState((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, valid: pricingValid },
      financial: { ...prev.financial, valid: financialValid },
      requirements: { ...prev.requirements, valid: reqValid },
    }));

    return isValid;
  };

  // Load system readiness
  useEffect(() => {
    async function loadSystemReadiness() {
      try {
        // In a real implementation, call your Cloud Run API:
        // const res = await fetch(`/api/campaigns/${campaignId}/validate-check`);
        // const data = await res.json();

        // For MVP, simulate checks (or read from Firestore)
        const campaignRef = doc(db, "campaigns", campaignId);
        const snap = await getDoc(campaignRef);
        const campaignData = snap.data();

        const checks = [
          "Campaign exists",
          "Campaign has zone defined",
          "Pricing rules available",
          "Financial rules available",
          "Operator template config exists",
        ];

        // Check if campaign has basic info
        const ready =
          campaignData?.zone &&
          campaignData?.fokontany &&
          campaignData?.status === "APPROVED";

        setState((prev) => ({
          ...prev,
          system: {
            ready: !!ready,
            checks,
          },
        }));
      } catch (error) {
        console.error("System readiness check failed:", error);
      }
    }

    if (campaignId) loadSystemReadiness();
  }, [campaignId, db]);

  // Main validation & activation
  const validateAndActivate = async () => {
    if (!validateLocal()) {
      alert("Please fix validation errors before proceeding.");
      return;
    }

    try {
      // Update Firestore with validation data
      const campaignRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignRef, {
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
        status: "VALIDATED_FOR_ACTIVATION",
        validatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Optional: call Cloud Run API for backend validation
      // await fetch(`/api/campaigns/${campaignId}/validate`, {
      //   method: "POST",
      //   body: JSON.stringify(state),
      // });

      // Redirect to operator assignment or campaign list
      router.push(`/campaigns/${campaignId}/assign`);
    } catch (error) {
      console.error("Activation failed:", error);
      alert("Failed to activate campaign. Please try again.");
    }
  };

  return { state, update, validateAndActivate };
}