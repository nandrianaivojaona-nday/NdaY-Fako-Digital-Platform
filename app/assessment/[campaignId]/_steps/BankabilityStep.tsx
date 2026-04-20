"use client";

import { useMemo, useState } from "react";
import { AssessmentDraft, Campaign, BankabilityInputs } from "@/types/campaign";

type Props = {
  draft: AssessmentDraft;
  campaign: Campaign;
  onSubmit: (inputs: BankabilityInputs) => Promise<void>;
  onBack: () => Promise<void>;
};

export default function BankabilityStep({ draft, onSubmit, onBack }: Props) {
  const initial = draft.bankabilityInputs;

  const [form, setForm] = useState<BankabilityInputs>({
    expectedRevenueAr: initial?.expectedRevenueAr ?? 350000,
    expectedCostAr: initial?.expectedCostAr ?? 220000,
    rewardAdequacyScore: initial?.rewardAdequacyScore ?? 68,
    throughputConsistency: initial?.throughputConsistency ?? 62,
    cashflowStability: initial?.cashflowStability ?? 58,
    paybackPeriodMonths: initial?.paybackPeriodMonths ?? 12,
  });

  const margin = useMemo(() => {
    const revenue = form.expectedRevenueAr ?? 0;
    const cost = form.expectedCostAr ?? 0;
    return revenue - cost;
  }, [form]);

  const marginPct = useMemo(() => {
    const revenue = form.expectedRevenueAr ?? 0;
    if (!revenue) return 0;
    return Math.round((margin / revenue) * 100);
  }, [form, margin]);

  function update<K extends keyof BankabilityInputs>(
    key: K,
    value: BankabilityInputs[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">💰 Bankability</h2>
        <p className="text-sm text-white/70">
          Evaluate whether the campaign creates an economically attractive
          operating case through revenue, cost, incentives, and payback.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MoneyField
          label="Expected revenue (Ar)"
          hint="Projected monthly or cycle revenue"
          value={form.expectedRevenueAr ?? 0}
          onChange={(v) => update("expectedRevenueAr", Number(v))}
        />

        <MoneyField
          label="Expected cost (Ar)"
          hint="Projected operating cost"
          value={form.expectedCostAr ?? 0}
          onChange={(v) => update("expectedCostAr", Number(v))}
        />

        <ScoreField
          label="Reward adequacy"
          hint="How motivating the reward structure is"
          value={form.rewardAdequacyScore ?? 0}
          onChange={(v) => update("rewardAdequacyScore", v)}
          tone="emerald"
        />

        <ScoreField
          label="Throughput consistency"
          hint="How stable throughput is expected to be"
          value={form.throughputConsistency ?? 0}
          onChange={(v) => update("throughputConsistency", v)}
          tone="sky"
        />

        <ScoreField
          label="Cashflow stability"
          hint="How predictable incoming cashflow is"
          value={form.cashflowStability ?? 0}
          onChange={(v) => update("cashflowStability", v)}
          tone="amber"
        />

        <MoneyField
          label="Payback period (months)"
          hint="Estimated recovery time"
          value={form.paybackPeriodMonths ?? 0}
          onChange={(v) => update("paybackPeriodMonths", Number(v))}
        />
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-3">
        <Metric label="Revenue" value={`${form.expectedRevenueAr ?? 0} Ar`} />
        <Metric label="Cost" value={`${form.expectedCostAr ?? 0} Ar`} />
        <Metric label="Margin" value={`${margin} Ar (${marginPct}%)`} />
      </div>

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
          onClick={() => void onSubmit(form)}
          className="button rounded-xl bg-emerald-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
        >
          Score Bankability →
        </button>
      </div>
    </div>
  );
}

function MoneyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="text-xs text-white/60">{hint}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40"
      />
    </label>
  );
}

function ScoreField({
  label,
  hint,
  value,
  onChange,
  tone,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  tone: "emerald" | "sky" | "amber";
}) {
  const toneClass = {
    emerald: "accent-emerald-500",
    sky: "accent-sky-500",
    amber: "accent-amber-500",
  }[tone];

  return (
    <label className="space-y-2">
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="text-xs text-white/60">{hint}</div>
      <div className="text-sm font-bold text-white/80">{value}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${toneClass}`}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
