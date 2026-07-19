// hooks/useOperatorSetup.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

export interface OperatorSetupState {
  identity: {
    name: string;
    email: string;
    phone: string;
    address: string;
    registrationNumber: string;
  };
  services: {
    selectedTypes: string[];
    coverage: string;
    description: string;
  };
  pricing: {
    model: "fixed" | "per_kg" | "hybrid";
    baseFee: number;
    perKg: number;
    monthlyFee: number;
    currency: string;
  };
  operations: {
    fleetSize: number;
    staffCount: number;
    collectionDays: string[];
    startTime: string;
    endTime: string;
    coverageRadius: number;
  };
}

type SetupStep = "identity" | "services" | "pricing" | "operations" | "activation";

const STEPS_ORDER: SetupStep[] = ["identity", "services", "pricing", "operations", "activation"];

interface UseOperatorSetupOptions {
  campaignId: string | null;
  operatorId: string | null;
}

export function useOperatorSetup({ campaignId, operatorId }: UseOperatorSetupOptions) {
  const router = useRouter();
  const db = getDb();

  // ─── State ───────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<SetupStep>("identity");
  const [state, setState] = useState<OperatorSetupState>({
    identity: { name: "", email: "", phone: "", address: "", registrationNumber: "" },
    services: { selectedTypes: [], coverage: "", description: "" },
    pricing: { model: "fixed", baseFee: 0, perKg: 0, monthlyFee: 0, currency: "MGA" },
    operations: { fleetSize: 0, staffCount: 0, collectionDays: [], startTime: "", endTime: "", coverageRadius: 0 },
  });
  const [campaignConstraints, setCampaignConstraints] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Load campaign constraints ─────────────────────────────
  useEffect(() => {
    async function loadConstraints() {
      if (!campaignId) {
        setIsLoading(false);
        return;
      }
      try {
        const campaignRef = doc(db, "campaigns", campaignId);
        const snap = await getDoc(campaignRef);
        if (snap.exists()) {
          const data = snap.data();
          // Extract any constraints (pricing limits, required services, etc.)
          // Adjust fields to your actual campaign schema.
          setCampaignConstraints({
            minBaseFee: data.minBaseFee || 0,
            maxBaseFee: data.maxBaseFee || 1000000,
            minPerKg: data.minPerKg || 0,
            maxPerKg: data.maxPerKg || 1000,
            requiredServiceTypes: data.requiredServiceTypes || [],
          });
        } else {
          setError("Campaign not found.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load campaign constraints.");
      } finally {
        setIsLoading(false);
      }
    }
    loadConstraints();
  }, [campaignId, db]);

  // ─── Update state (merges partial updates) ──────────────
  const updateState = useCallback(
    (newState: Partial<OperatorSetupState>) => {
      setState((prev) => ({
        ...prev,
        ...newState,
        // Deep merge nested objects if needed (for identity, services, etc.)
        identity: { ...prev.identity, ...(newState.identity || {}) },
        services: { ...prev.services, ...(newState.services || {}) },
        pricing: { ...prev.pricing, ...(newState.pricing || {}) },
        operations: { ...prev.operations, ...(newState.operations || {}) },
      }));
    },
    []
  );

  // ─── Step navigation ──────────────────────────────────────
  const goToStep = useCallback((step: SetupStep) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    if (currentIndex < STEPS_ORDER.length - 1) {
      setCurrentStep(STEPS_ORDER[currentIndex + 1]);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    const currentIndex = STEPS_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS_ORDER[currentIndex - 1]);
    }
  }, [currentStep]);

  // ─── Submit setup ─────────────────────────────────────────
  const submitSetup = useCallback(async () => {
    if (!operatorId || !campaignId) {
      setError("Missing operator or campaign ID.");
      throw new Error("Missing operator or campaign ID.");
    }

    try {
      // Prepare operator profile document
      const operatorRef = doc(db, "operators", operatorId);

      // Build the final operator data
      const operatorData = {
        ...state.identity,
        ...state.services,
        ...state.pricing,
        ...state.operations,
        campaignId,
        setupComplete: true,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // You may want to include additional fields
      };

      // Save to Firestore
      await setDoc(operatorRef, operatorData, { merge: true });

      // Optionally update the campaign to link this operator
      const campaignRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignRef, {
        [`operators.${operatorId}`]: {
          name: state.identity.name,
          status: "active",
          joinedAt: serverTimestamp(),
        },
      });

      // Redirect to dashboard or success page
      router.push("/operator/dashboard");
    } catch (err: any) {
      setError(err.message || "Submission failed.");
      throw err; // Re-throw so the component can catch it
    }
  }, [state, operatorId, campaignId, db, router]);

  // ─── Return ──────────────────────────────────────────────
  return {
    currentStep,
    state,
    updateState,
    goToStep,
    nextStep,
    previousStep,
    submitSetup,
    isLoading,
    error,
    campaignConstraints,
  };
}