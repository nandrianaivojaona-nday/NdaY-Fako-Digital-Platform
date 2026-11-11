"use client";
import { useState } from "react";
import type {
  CommercialConfiguration,
  TerritorialSubscriptionOfferVersion,
  MaterialStream,
} from "@/lib/domain/subscription/offerTypes";
import { REFERENCE_PLAN_TYPES } from "@/lib/domain/subscription/planTypes";

export default function OfferEditor({
  version,
  onSave,
  onSaveDraft,
}: {
  version: TerritorialSubscriptionOfferVersion;
  onSave: (commercial: CommercialConfiguration) => Promise<void>;
  onSaveDraft?: () => Promise<void>;
}) {
  const [commercial, setCommercial] = useState<CommercialConfiguration>(version.commercial);
  const [saving, setSaving] = useState(false);

  const refPlan = REFERENCE_PLAN_TYPES[commercial.planTypeId];

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(commercial);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wider text-white/50">Plan Type (fixed)</p>
        <p className="text-lg font-semibold text-white">{refPlan.name}</p>
        <p className="text-sm text-white/60">{refPlan.description}</p>
      </div>

      {/* Price fields — only the relevant one is shown */}
      {commercial.billing === "monthly" && commercial.monthlyPriceMGA !== undefined && (
        <Field label="Monthly Price (MGA)">
          <input
            type="number"
            value={commercial.monthlyPriceMGA ?? 0}
            onChange={(e) =>
              setCommercial({ ...commercial, monthlyPriceMGA: Number(e.target.value) })
            }
            className="input"
          />
        </Field>
      )}

      {commercial.billing !== "monthly" && commercial.billing !== "per_pickup" && commercial.contractPriceMGA !== undefined && (
        <Field label="Contract Price (MGA)">
          <input
            type="number"
            value={commercial.contractPriceMGA ?? 0}
            onChange={(e) =>
              setCommercial({ ...commercial, contractPriceMGA: Number(e.target.value) })
            }
            className="input"
          />
        </Field>
      )}

      {(commercial.exchangeRequiredStreams !== undefined || commercial.exchangeCompensationKg !== undefined) && (
        <>
          <Field label="Required Material Streams">
            <div className="flex flex-wrap gap-2">
              {(["ORGANIC","CARBON","RECYCLABLE","GLASS","METAL","PLASTIC"] as MaterialStream[]).map((s) => {
                const selected = commercial.exchangeRequiredStreams?.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const current = commercial.exchangeRequiredStreams ?? [];
                      const next = selected ? current.filter((x) => x !== s) : [...current, s];
                      setCommercial({ ...commercial, exchangeRequiredStreams: next });
                    }}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      selected ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/5 text-white/70"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Quarterly Compost Reward (kg)">
            <input
              type="number"
              value={commercial.exchangeCompensationKg ?? 0}
              onChange={(e) =>
                setCommercial({ ...commercial, exchangeCompensationKg: Number(e.target.value) })
              }
              className="input"
            />
          </Field>
        </>
      )}

      {/* Service level */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Collection Frequency">
          <select
            value={commercial.serviceLevel.collectionFrequency}
            onChange={(e) =>
              setCommercial({
                ...commercial,
                serviceLevel: { ...commercial.serviceLevel, collectionFrequency: e.target.value as any },
              })
            }
            className="input"
          >
            {["DAILY","TWICE_WEEKLY","WEEKLY","BIWEEKLY","MONTHLY","CUSTOM"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={commercial.serviceLevel.priority}
            onChange={(e) =>
              setCommercial({
                ...commercial,
                serviceLevel: { ...commercial.serviceLevel, priority: e.target.value as any },
              })
            }
            className="input"
          >
            {["STANDARD","PRIORITY","SAME_DAY"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        <p className="font-semibold">Platform-controlled fields</p>
        <p className="text-amber-200/80">
          Platform fee ({refPlan.platformFeePercent}%), payment state machine, service-proof rules,
          and audit logging cannot be edited by operators.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-cyan-600 px-6 py-2 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
      {children}
    </div>
  );
}
