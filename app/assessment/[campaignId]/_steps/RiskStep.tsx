"use client";

import { useMemo, useState } from "react";
import { AssessmentDraft, Campaign, RiskInputs } from "@/types/campaign";

type Props = {
  draft: AssessmentDraft;
  campaign: Campaign;
  onSubmit: (inputs: RiskInputs) => Promise<void>;
  onBack: () => Promise<void>;
};

export default function RiskStep({ draft, onSubmit, onBack }: Props) {
  const initial = draft.riskInputs;

  const [form, setForm] = useState<RiskInputs>({
    territoryAccessRisk: initial?.territoryAccessRisk ?? 40,
    communityAdoptionRisk: initial?.communityAdoptionRisk ?? 35,
    volumeUncertaintyRisk: initial?.volumeUncertaintyRisk ?? 48,
    traceabilityRisk: initial?.traceabilityRisk ?? 42,
    partnerDependencyRisk: initial?.partnerDependencyRisk ?? 50,
    regulatoryRisk: initial?.regulatoryRisk ?? 30,
  });

  const averageRisk = useMemo(() => {
    const values = [
      form.territoryAccessRisk ?? 0,
      form.communityAdoptionRisk ?? 0,
      form.volumeUncertaintyRisk ?? 0,
      form.traceabilityRisk ?? 0,
      form.partnerDependencyRisk ?? 0,
      form.regulatoryRisk ?? 0,
    ];

    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [form]);

  const goSignal =
    averageRisk < 40 ? "GO" : averageRisk < 65 ? "GO WITH CONDITIONS" : "NO GO";

  function update<K extends keyof RiskInputs>(
    key: K,
    value: RiskInputs[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">🛡️ Risk & Compliance</h2>
        <p className="text-sm text-white/70">
          Assess the main blockers around territory access, community adoption,
          volume reliability, traceability, partnerships, and regulation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RiskField
          label="Territory access risk"
          hint="Risk of limited field access"
          value={form.territoryAccessRisk ?? 0}
          onChange={(v) => update("territoryAccessRisk", v)}
        />
        <RiskField
          label="Community adoption risk"
          hint="Risk of poor household or community uptake"
          value={form.communityAdoptionRisk ?? 0}
          onChange={(v) => update("communityAdoptionRisk", v)}
        />
        <RiskField
          label="Volume uncertainty risk"
          hint="Risk that volumes differ from expectation"
          value={form.volumeUncertaintyRisk ?? 0}
          onChange={(v) => update("volumeUncertaintyRisk", v)}
        />
        <RiskField
          label="Traceability risk"
          hint="Risk of weak tracking and accountability"
          value={form.traceabilityRisk ?? 0}
          onChange={(v) => update("traceabilityRisk", v)}
        />
        <RiskField
          label="Partner dependency risk"
          hint="Risk tied to external partners"
          value={form.partnerDependencyRisk ?? 0}
          onChange={(v) => update("partnerDependencyRisk", v)}
        />
        <RiskField
          label="Regulatory risk"
          hint="Risk of legal or compliance issues"
          value={form.regulatoryRisk ?? 0}
          onChange={(v) => update("regulatoryRisk", v)}
        />
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">
            Live risk posture
          </div>
          <div className="mt-2 text-3xl font-black text-white">{averageRisk}</div>
          <div className="text-sm text-white/70">Overall risk /100</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">
            Decision signal
          </div>
          <div className="mt-2 text-lg font-bold text-red-300">{goSignal}</div>
        </div>
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
          Score Risk →
        </button>
      </div>
    </div>
  );
}

function RiskField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
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
        className="w-full accent-red-500"
      />
    </label>
  );
}
