"use client";

import { useState } from "react";
import { AssessmentDraft, Campaign, OperatorDecision } from "@/types/campaign";

type Props = {
  draft: AssessmentDraft;
  campaign: Campaign | null;
  onDecide: (decision: OperatorDecision, notes?: string) => Promise<void>;
  onBack: () => Promise<void>;

};

const OPTIONS: { value: OperatorDecision; label: string; color: string }[] = [
  {
    value: "PROCEED",
    label: "✅ Proceed as Operator",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    value: "PROCEED_WITH_CONDITIONS",
    label: "⚠️ Proceed with Conditions",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    value: "HOLD",
    label: "⏸️ Hold — Review Later",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  },
  {
    value: "DECLINE",
    label: "✖️ Decline Opportunity",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
];

export default function DecisionStep({ draft, onDecide, onBack }: Props) {
  const [selected, setSelected] = useState<OperatorDecision | null>(null);
  const [notes, setNotes] = useState("");

  const scores = draft.scores;
  const doc = draft.generatedDocumentJson;

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">🎯 Operator Decision</h2>
        <p className="text-sm text-white/70">
          Make the final operator decision based on the assessment outputs and
          generated recommendation.
        </p>
      </div>

      {scores && (
        <div className="grid gap-4 md:grid-cols-4">
          <ScoreBox label="Demand" value={scores.demand ?? 0} />
          <ScoreBox label="Operability" value={scores.operability ?? 0} />
          <ScoreBox label="Bankability" value={scores.bankability ?? 0} />
          <ScoreBox label="Risk" value={scores.riskAdjusted ?? 0} highlight />
        </div>
      )}

      {doc && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs uppercase tracking-widest text-white/50">
            Recommendation
          </div>
          <div className="mt-2 text-sm text-white">{doc.recommendation}</div>
        </div>
      )}

      <div className="grid gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${opt.color} ${
              selected === opt.value
                ? "scale-[1.02] ring-2 ring-white/30"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add conditions, rationale, or next steps..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void onBack()}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={() => selected && void onDecide(selected, notes)}
          disabled={!selected}
          className="button rounded-xl bg-emerald-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          Confirm Decision
        </button>
      </div>
    </div>
  );
}

function ScoreBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs uppercase tracking-widest text-white/50">
        {label}
      </div>
    </div>
  );
}
