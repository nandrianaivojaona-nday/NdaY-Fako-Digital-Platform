"use client";

import { useMemo, useState } from "react";
import { AssessmentDraft, Campaign, MarketDemandInputs } from "@/types/campaign";

type Props = {
  draft: AssessmentDraft;
  campaign: Campaign;
  onSubmit: (inputs: MarketDemandInputs) => Promise<void>;
  onBack: () => Promise<void>;
};

export default function MarketDemandStep({ draft, onSubmit, onBack }: Props) {
  const initial = draft.marketDemandInputs;

  const [form, setForm] = useState<MarketDemandInputs>({
    householdCount: initial?.householdCount ?? 1200,
    wasteGenerationKgPerHhPerWeek: initial?.wasteGenerationKgPerHhPerWeek ?? 3,
    expectedRecoveryRate: initial?.expectedRecoveryRate ?? 35,
    existingCollectionGapPercent: initial?.existingCollectionGapPercent ?? 55,
    localRecyclingOutletAccess: initial?.localRecyclingOutletAccess ?? true,
    estimatedMonthlyThroughputKg: initial?.estimatedMonthlyThroughputKg ?? 1800,
  });

  const estimatedOpportunity = useMemo(() => {
    if (
      form.householdCount === undefined ||
      form.wasteGenerationKgPerHhPerWeek === undefined ||
      form.expectedRecoveryRate === undefined
    ) {
      return null;
    }

    return Math.round(
      form.householdCount *
        form.wasteGenerationKgPerHhPerWeek *
        (form.expectedRecoveryRate / 100) *
        4.3
    );
  }, [form]);

  function update<K extends keyof MarketDemandInputs>(
    key: K,
    value: MarketDemandInputs[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">📈 Market & Demand</h2>
        <p className="text-sm text-white/70">
          Estimate whether this territory has enough household demand and
          recoverable waste volume to justify field operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Household count"
          hint="Estimated households covered by the campaign"
          value={form.householdCount ?? 0}
          onChange={(v) => update("householdCount", Number(v))}
        />

        <Field
          label="Waste generated / household / week (kg)"
          hint="Average recoverable waste volume per household"
          value={form.wasteGenerationKgPerHhPerWeek ?? 0}
          onChange={(v) =>
            update("wasteGenerationKgPerHhPerWeek", Number(v))
          }
        />

        <Field
          label="Expected recovery rate (%)"
          hint="Projected recovery share from available waste"
          value={form.expectedRecoveryRate ?? 0}
          onChange={(v) => update("expectedRecoveryRate", Number(v))}
        />

        <Field
          label="Existing collection gap (%)"
          hint="How underserved the area is today"
          value={form.existingCollectionGapPercent ?? 0}
          onChange={(v) => update("existingCollectionGapPercent", Number(v))}
        />

        <Field
          label="Estimated monthly throughput (kg)"
          hint="Projected waste throughput per month"
          value={form.estimatedMonthlyThroughputKg ?? 0}
          onChange={(v) => update("estimatedMonthlyThroughputKg", Number(v))}
        />
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/80">
          Recycling outlet access
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update("localRecyclingOutletAccess", true)}
            className={`rounded-xl border px-3 py-3 text-xs font-black uppercase transition ${
              form.localRecyclingOutletAccess
                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            Yes
          </button>

          <button
            type="button"
            onClick={() => update("localRecyclingOutletAccess", false)}
            className={`rounded-xl border px-3 py-3 text-xs font-black uppercase transition ${
              form.localRecyclingOutletAccess === false
                ? "border-red-500/30 bg-red-500/20 text-red-400"
                : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            No
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
        <Metric
          label="Offline projection"
          value={
            estimatedOpportunity !== null
              ? `${estimatedOpportunity.toLocaleString()} kg/month`
              : "Not available"
          }
        />
        <Metric
          label="Outlet access"
          value={form.localRecyclingOutletAccess ? "Available" : "Missing"}
        />
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
          Score Demand →
        </button>
      </div>
    </div>
  );
}

function Field({
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
