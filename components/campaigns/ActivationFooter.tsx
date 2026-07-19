// /components/campaign/ActivationFooter.tsx
"use client";

import { ValidationState } from "@/hooks/useCampaignValidation";

interface Props {
  state: ValidationState;
  onActivate: () => void;
}

export default function ActivationFooter({ state, onActivate }: Props) {
  const isValid =
    state.pricing.valid &&
    state.financial.valid &&
    state.requirements.valid &&
    state.system.ready;

  return (
    <div className="flex justify-end pt-4 border-t border-white/10">
      <button
        onClick={onActivate}
        disabled={!isValid}
        className={`px-6 py-3 rounded-xl text-white font-medium transition-all ${
          isValid
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg"
            : "bg-gray-600 cursor-not-allowed opacity-50"
        }`}
      >
        Validate & Open for Operator Assignment
      </button>
    </div>
  );
}