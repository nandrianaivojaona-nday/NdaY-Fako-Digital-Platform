// /components/campaign/PricingFrameworkCard.tsx
"use client";

import { ValidationState, PricingMode } from "@/hooks/useCampaignValidation";

interface Props {
  state: ValidationState;
  update: (section: "pricing", data: Partial<ValidationState["pricing"]>) => void;
}

export default function PricingFrameworkCard({ state, update }: Props) {
  const pricing = state.pricing;

  return (
    <div className="p-4 border rounded-2xl space-y-3 bg-white/5 backdrop-blur-sm">
      <h2 className="font-semibold text-white">Pricing Framework</h2>
      <p className="text-xs text-white/50">Set boundaries for operator pricing</p>

      <select
        value={pricing.mode}
        onChange={(e) => update("pricing", { mode: e.target.value as PricingMode })}
        className="w-full border p-2 rounded bg-black/30 text-white"
      >
        <option value="FIXED">Fixed Price</option>
        <option value="BOUNDED">Bounded Range (Recommended)</option>
        <option value="GUIDED">Guided (Approval Required)</option>
      </select>

      <input
        type="number"
        placeholder="Minimum Price (MGA)"
        value={pricing.min}
        onChange={(e) => update("pricing", { min: +e.target.value })}
        className="w-full border p-2 rounded bg-black/30 text-white"
        disabled={pricing.mode === "FIXED"}
      />

      <input
        type="number"
        placeholder="Recommended Price (MGA)"
        value={pricing.recommended}
        onChange={(e) => update("pricing", { recommended: +e.target.value })}
        className="w-full border p-2 rounded bg-black/30 text-white"
      />

      <input
        type="number"
        placeholder="Maximum Price (MGA)"
        value={pricing.max}
        onChange={(e) => update("pricing", { max: +e.target.value })}
        className="w-full border p-2 rounded bg-black/30 text-white"
        disabled={pricing.mode === "FIXED"}
      />

      {pricing.mode === "GUIDED" && (
        <textarea
          placeholder="Deviation Justification Required"
          className="w-full border p-2 rounded bg-black/30 text-white"
        />
      )}

      {!pricing.valid && (
        <p className="text-red-400 text-sm">Min &lt; Recommended &lt; Max required</p>
      )}
    </div>
  );
}