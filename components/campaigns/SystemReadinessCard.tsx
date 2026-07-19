// /components/campaign/SystemReadinessCard.tsx
"use client";

import { ValidationState } from "@/hooks/useCampaignValidation";

interface Props {
  state: ValidationState;
}

export default function SystemReadinessCard({ state }: Props) {
  return (
    <div className="p-4 border rounded-2xl space-y-2 bg-white/5 backdrop-blur-sm">
      <h2 className="font-semibold text-white">System Readiness</h2>
      <p className="text-xs text-white/50">Auto-checked prerequisites</p>

      <ul className="space-y-1">
        {state.system.checks.map((check, i) => (
          <li key={i} className="text-sm text-white/70 flex items-center gap-2">
            <span className="text-emerald-400">✓</span> {check}
          </li>
        ))}
      </ul>

      <div
        className={`mt-3 p-2 rounded text-sm font-medium ${
          state.system.ready
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-red-500/20 text-red-300"
        }`}
      >
        {state.system.ready ? "✅ System Ready" : "❌ System Not Ready"}
      </div>
    </div>
  );
}