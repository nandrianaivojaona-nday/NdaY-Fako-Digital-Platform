'use client';

import { useSearchParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";

// Step Components
import IdentityStep from "./setup/_steps/IdentityStep";
import ServicesStep from "./setup/_steps/ServicesStep";
import PricingStep from "./setup/_steps/PricingStep";
import OperationsStep from "./setup/_steps/OperationsStep";
import ActivationStep from "./setup/_steps/ActivationStep";
import { useOperatorSetup } from "@/hooks/useOperatorSetup";

// Icons
import {
  User,
  Truck,
  Coins,
  Settings,
  Rocket,
  CheckCircle,
} from "lucide-react";

type SetupStep = "identity" | "services" | "pricing" | "operations" | "activation";

const STEPS: { id: SetupStep; label: string; icon: React.ComponentType }[] = [
  { id: "identity", label: "Identity", icon: User },
  { id: "services", label: "Services", icon: Truck },
  { id: "pricing", label: "Pricing", icon: Coins },
  { id: "operations", label: "Operations", icon: Settings },
  { id: "activation", label: "Activation", icon: Rocket },
];

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@ndayfako.mg";

export default function OperatorSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = searchParams.get("campaignId");
  const operatorId = searchParams.get("operatorId");

  const {
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
  } = useOperatorSetup({ campaignId, operatorId });

  // Redirect if no campaign or operator ID
  useEffect(() => {
    if (!campaignId || !operatorId) {
      router.push("/operator/dashboard");
    }
  }, [campaignId, operatorId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-solid mx-auto" />
          <p className="text-white/60">Loading setup configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center bg-red-500/20 rounded-xl p-6 max-w-md">
          <p className="text-red-300 font-medium">⚠️ {error}</p>
          <button
            onClick={() => router.push("/operator/dashboard")}
            className="mt-4 px-4 py-2 bg-emerald-600 rounded-lg text-white text-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-linear-to-b from-neutral-900 to-black">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Set Up Your Service</h1>
          <p className="text-white/50 text-sm">
            Complete these steps to launch your waste collection service
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/40">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isPast = currentStepIndex > index;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => isPast && goToStep(step.id)}
                className={`flex flex-col items-center gap-1 flex-1 group ${isPast ? "cursor-pointer" : "cursor-default"
                  }`}
                disabled={!isPast}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all text-xl ${isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : isPast
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/10 text-white/30"
                    }`}
                >
                  {isPast && !isActive ? (
                    <CheckCircle />
                  ) : (
                    <Icon />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${isActive
                      ? "text-emerald-400"
                      : isPast
                        ? "text-white/50"
                        : "text-white/20"
                    }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          {currentStep === "identity" && (
            <IdentityStep
              state={state}
              updateState={updateState}
              onNext={nextStep}
            />
          )}

          {currentStep === "services" && (
            <ServicesStep
              state={state}
              updateState={updateState}
              onBack={previousStep}
              onNext={nextStep}
            />
          )}

          {currentStep === "pricing" && (
            <PricingStep
              state={state}
              updateState={updateState}
              constraints={campaignConstraints}
              onBack={previousStep}
              onNext={nextStep}
            />
          )}

          {currentStep === "operations" && (
            <OperationsStep
              state={state}
              updateState={updateState}
              onBack={previousStep}
              onNext={nextStep}
            />
          )}

          {currentStep === "activation" && (
            <ActivationStep
              state={state}
              onBack={previousStep}
              onSubmit={submitSetup}
              operatorId={operatorId}
              campaignId={campaignId}
            />
          )}
        </div>

        {/* Help Text */}
        <a
          href={`mailto:${supportEmail}?subject=Support%20Request%20from%20NdaY%20Platform`}
          className="text-white/40 hover:text-white/70 transition-colors underline-offset-2 hover:underline"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}