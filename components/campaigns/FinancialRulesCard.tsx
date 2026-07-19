// /components/campaign/FinancialRulesCard.tsx
"use client";

import { ValidationState } from "@/hooks/useCampaignValidation";

interface Props {
  state: ValidationState;
  update: (section: "financial", data: Partial<ValidationState["financial"]>) => void;
}

export default function FinancialRulesCard({ state, update }: Props) {
  const financial = state.financial;

  return (
    <div className="p-4 border rounded-2xl space-y-3 bg-white/5 backdrop-blur-sm">
      <h2 className="font-semibold text-white">Financial Rules</h2>
      <p className="text-xs text-white/50">Commission & payment methods</p>

      <input
        type="number"
        placeholder="Commission (%)"
        value={financial.commission}
        onChange={(e) => update("financial", { commission: +e.target.value })}
        className="w-full border p-2 rounded bg-black/30 text-white"
        min={0}
        max={100}
      />

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={financial.methods.includes("mobile_money")}
            onChange={(e) => {
              const newMethods = e.target.checked
                ? [...financial.methods, "mobile_money"]
                : financial.methods.filter((m) => m !== "mobile_money");
              update("financial", { methods: newMethods });
            }}
          />
          Mobile Money
        </label>
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={financial.methods.includes("cash")}
            onChange={(e) => {
              const newMethods = e.target.checked
                ? [...financial.methods, "cash"]
                : financial.methods.filter((m) => m !== "cash");
              update("financial", { methods: newMethods });
            }}
          />
          Cash
        </label>
      </div>

      {!financial.valid && (
        <p className="text-red-400 text-sm">Commission must be between 0 and 100</p>
      )}
    </div>
  );
}