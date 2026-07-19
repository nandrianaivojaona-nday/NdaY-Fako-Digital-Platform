// /components/campaign/OperatorRequirementsCard.tsx
"use client";

import { ValidationState } from "@/hooks/useCampaignValidation";

interface Props {
  state: ValidationState;
  update: (section: "requirements", data: Partial<ValidationState["requirements"]>) => void;
}

export default function OperatorRequirementsCard({ state, update }: Props) {
  const req = state.requirements;

  return (
    <div className="p-4 border rounded-2xl space-y-3 bg-white/5 backdrop-blur-sm">
      <h2 className="font-semibold text-white">Operator Requirements</h2>
      <p className="text-xs text-white/50">Minimum capacity & SLA</p>

      <input
        type="number"
        placeholder="Minimum Collectors"
        value={req.collectors}
        onChange={(e) => update("requirements", { collectors: +e.target.value })}
        className="w-full border p-2 rounded bg-black/30 text-white"
        min={1}
      />

      <select
        value={req.frequency}
        onChange={(e) =>
          update("requirements", { frequency: e.target.value as any })
        }
        className="w-full border p-2 rounded bg-black/30 text-white"
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="on-demand">On-Demand</option>
      </select>

      {!req.valid && (
        <p className="text-red-400 text-sm">At least 1 collector required</p>
      )}
    </div>
  );
}