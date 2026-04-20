"use client";

import { useEffect, useMemo, useState } from "react";
import { X, User, MapPin, Truck, Clock, ThumbsUp } from "lucide-react";

// ─── Type ─────────────────────────────────────────────────────────────────────

export type SubscriberDraft = {
  id: string;
  subscriberName: string;
  subscriberType:
    | "HOUSEHOLD"
    | "BUILDING"
    | "HOTEL"
    | "SCHOOL"
    | "COMMERCIAL"
    | "ADMIN_OFFICE"
    | "PRIVATE_OFFICE";
  zone: string;
  gps: string;
  estimatedWasteKgPerWeek: number;
  collectionFrequency: "WEEKLY" | "TWICE_WEEKLY" | "DAILY" | "IRREGULAR";
  distanceToCollectionPointMeters: number;
  distanceToPredumpingMeters: number;
  distanceToDumpingMeters: number;
  travelTimeMinutes: number;
  serviceTimeMinutes: number;
  roadCondition: "GOOD" | "FAIR" | "POOR";
  vehicleAccess: "YES" | "LIMITED" | "NO";
  willingnessToJoin: "YES" | "MAYBE" | "NO" | "UNKNOWN";
  feeToleranceAr: number;
  comments: string;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  value: SubscriberDraft;
  onChange: (next: SubscriberDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputClass(focused?: boolean) {
  return [
    "w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white outline-none transition",
    focused
      ? "border-emerald-500/50"
      : "border-white/10 focus:border-emerald-500/40",
  ].join(" ");
}

const selectClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/40 transition appearance-none";

// ─── Main component ───────────────────────────────────────────────────────────

export default function SubscriberSheet({ value, onChange, onClose, onSave }: Props) {
  const [activeSection, setActiveSection] = useState<number>(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function set<K extends keyof SubscriberDraft>(key: K, val: SubscriberDraft[K]) {
    onChange({ ...value, [key]: val });
  }

  const totalRouteTime = useMemo(
    () => value.travelTimeMinutes + value.serviceTimeMinutes,
    [value.travelTimeMinutes, value.serviceTimeMinutes]
  );

  const completionPercent = useMemo(() => {
    const required: (keyof SubscriberDraft)[] = [
      "subscriberName",
      "subscriberType",
      "zone",
      "estimatedWasteKgPerWeek",
      "collectionFrequency",
      "roadCondition",
      "vehicleAccess",
      "willingnessToJoin",
    ];
    const filled = required.filter((k) => {
      const v = value[k];
      if (typeof v === "string") return v.trim().length > 0;
      if (typeof v === "number") return v > 0;
      return v !== undefined;
    });
    return Math.round((filled.length / required.length) * 100);
  }, [value]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-[90%] w-[min(960px,92vw)] overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl"
      >
        {/* ── Left: form ─────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/40">
                Subscriber sheet
              </p>
              <h3 className="mt-1 text-base font-black text-white">
                {value.subscriberName || "New subscriber"}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white/60">{completionPercent}%</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10"
                aria-label="Close sheet"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-white/[0.02] px-5 py-3">
            {SECTIONS.map((section, index) => (
              <button
                key={section.label}
                type="button"
                onClick={() => setActiveSection(index)}
                className={[
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition",
                  activeSection === index
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/75",
                ].join(" ")}
              >
                <section.icon size={13} />
                {section.label}
              </button>
            ))}
          </div>

          {/* Active section form */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {activeSection === 0 && (
              <FormSection title="Identity" description="Who and what type of subscriber this is.">
                <Field label="Subscriber name" required>
                  <input
                    value={value.subscriberName}
                    onChange={(e) => set("subscriberName", e.target.value)}
                    placeholder="e.g. Rakoto Jean — Ankadifotsy 14"
                    className={inputClass()}
                  />
                </Field>

                <Field label="Subscriber type" required>
                  <select
                    value={value.subscriberType}
                    onChange={(e) =>
                      set("subscriberType", e.target.value as SubscriberDraft["subscriberType"])
                    }
                    className={selectClass}
                  >
                    <option value="HOUSEHOLD">Household</option>
                    <option value="BUILDING">Building / Immeuble</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="SCHOOL">School</option>
                    <option value="COMMERCIAL">Commercial outlet</option>
                    <option value="ADMIN_OFFICE">Admin office</option>
                    <option value="PRIVATE_OFFICE">Private office</option>
                  </select>
                </Field>

                <Field label="Collection frequency" required>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { val: "WEEKLY", label: "Weekly" },
                        { val: "TWICE_WEEKLY", label: "Twice/week" },
                        { val: "DAILY", label: "Daily" },
                        { val: "IRREGULAR", label: "Irregular" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => set("collectionFrequency", opt.val)}
                        className={[
                          "rounded-xl border px-3 py-3 text-xs font-black uppercase transition",
                          value.collectionFrequency === opt.val
                            ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                            : "border-white/10 bg-white/5 text-white/40 hover:bg-white/8",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Estimated waste (kg/week)" required>
                  <input
                    type="number"
                    min={0}
                    value={value.estimatedWasteKgPerWeek}
                    onChange={(e) => set("estimatedWasteKgPerWeek", Number(e.target.value))}
                    className={inputClass()}
                  />
                </Field>
              </FormSection>
            )}

            {activeSection === 1 && (
              <FormSection title="Location" description="Physical location, zone, and GPS reference.">
                <Field label="Zone / Fokontany">
                  <input
                    value={value.zone}
                    onChange={(e) => set("zone", e.target.value)}
                    placeholder="e.g. Ankadifotsy, Zone C"
                    className={inputClass()}
                  />
                </Field>

                <Field label="GPS / Landmark">
                  <input
                    value={value.gps}
                    onChange={(e) => set("gps", e.target.value)}
                    placeholder="e.g. -18.9145, 47.5362 or near Maternité Befelatanana"
                    className={inputClass()}
                  />
                </Field>
              </FormSection>
            )}

            {activeSection === 2 && (
              <FormSection title="Route & distances" description="Route timing and distance measurements from subscriber to dumping point.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Distance to collection point (m)">
                    <input
                      type="number"
                      min={0}
                      value={value.distanceToCollectionPointMeters}
                      onChange={(e) =>
                        set("distanceToCollectionPointMeters", Number(e.target.value))
                      }
                      className={inputClass()}
                    />
                  </Field>

                  <Field label="Distance to pre-dumping site (m)">
                    <input
                      type="number"
                      min={0}
                      value={value.distanceToPredumpingMeters}
                      onChange={(e) =>
                        set("distanceToPredumpingMeters", Number(e.target.value))
                      }
                      className={inputClass()}
                    />
                  </Field>

                  <Field label="Distance to final dumping (m)">
                    <input
                      type="number"
                      min={0}
                      value={value.distanceToDumpingMeters}
                      onChange={(e) =>
                        set("distanceToDumpingMeters", Number(e.target.value))
                      }
                      className={inputClass()}
                    />
                  </Field>

                  <Field label="Travel time (min)">
                    <input
                      type="number"
                      min={0}
                      value={value.travelTimeMinutes}
                      onChange={(e) => set("travelTimeMinutes", Number(e.target.value))}
                      className={inputClass()}
                    />
                  </Field>

                  <Field label="Service time at door (min)">
                    <input
                      type="number"
                      min={0}
                      value={value.serviceTimeMinutes}
                      onChange={(e) => set("serviceTimeMinutes", Number(e.target.value))}
                      className={inputClass()}
                    />
                  </Field>
                </div>

                <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300/70">
                    Calculated total stop time
                  </p>
                  <p className="mt-2 text-2xl font-black text-sky-200">
                    {totalRouteTime} min
                  </p>
                  <p className="mt-1 text-xs text-sky-300/55">
                    Travel + service time combined for this subscriber
                  </p>
                </div>
              </FormSection>
            )}

            {activeSection === 3 && (
              <FormSection title="Access & conditions" description="Road quality and physical access for collection vehicle or porter.">
                <Field label="Road condition" required>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { val: "GOOD", label: "Good", color: "emerald" },
                        { val: "FAIR", label: "Fair", color: "amber" },
                        { val: "POOR", label: "Poor", color: "rose" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => set("roadCondition", opt.val)}
                        className={[
                          "rounded-xl border px-3 py-3 text-xs font-black uppercase transition",
                          value.roadCondition === opt.val
                            ? opt.color === "emerald"
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : opt.color === "amber"
                                ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                                : "border-rose-500/30 bg-rose-500/20 text-rose-300"
                            : "border-white/10 bg-white/5 text-white/40 hover:bg-white/8",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Vehicle access" required>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { val: "YES", label: "Yes", color: "emerald" },
                        { val: "LIMITED", label: "Limited", color: "amber" },
                        { val: "NO", label: "No", color: "rose" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => set("vehicleAccess", opt.val)}
                        className={[
                          "rounded-xl border px-3 py-3 text-xs font-black uppercase transition",
                          value.vehicleAccess === opt.val
                            ? opt.color === "emerald"
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : opt.color === "amber"
                                ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                                : "border-rose-500/30 bg-rose-500/20 text-rose-300"
                            : "border-white/10 bg-white/5 text-white/40 hover:bg-white/8",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </FormSection>
            )}

            {activeSection === 4 && (
              <FormSection
                title="Willingness & fees"
                description="Subscriber's intention to join the campaign and their fee ceiling."
              >
                <Field label="Willingness to join" required>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { val: "YES", label: "Confirmed yes", color: "emerald" },
                        { val: "MAYBE", label: "Maybe / undecided", color: "amber" },
                        { val: "NO", label: "Declined", color: "rose" },
                        { val: "UNKNOWN", label: "Not contacted", color: "neutral" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => set("willingnessToJoin", opt.val)}
                        className={[
                          "rounded-xl border px-3 py-3 text-xs font-black uppercase transition",
                          value.willingnessToJoin === opt.val
                            ? opt.color === "emerald"
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : opt.color === "amber"
                                ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                                : opt.color === "rose"
                                  ? "border-rose-500/30 bg-rose-500/20 text-rose-300"
                                  : "border-white/20 bg-white/10 text-white/80"
                            : "border-white/10 bg-white/5 text-white/40 hover:bg-white/8",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Fee tolerance (Ar / month)">
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={value.feeToleranceAr}
                    onChange={(e) => set("feeToleranceAr", Number(e.target.value))}
                    placeholder="e.g. 3000"
                    className={inputClass()}
                  />
                </Field>

                <Field label="Comments / notes">
                  <textarea
                    value={value.comments}
                    onChange={(e) => set("comments", e.target.value)}
                    rows={4}
                    placeholder="Anything else relevant about this subscriber…"
                    className={`${inputClass()} resize-none`}
                  />
                </Field>
              </FormSection>
            )}
          </div>

          {/* Footer navigation */}
          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-5 py-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={activeSection === 0}
                onClick={() => setActiveSection((s) => s - 1)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={activeSection === SECTIONS.length - 1}
                onClick={() => setActiveSection((s) => s + 1)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white disabled:opacity-30"
              >
                Next →
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white"
              >
                Save subscriber
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: mini summary ─────────────────────────────────────── */}
        <aside className="hidden w-[240px] shrink-0 flex-col gap-5 border-l border-white/10 bg-black/25 p-5 lg:flex">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/40">
              Live summary
            </p>
            <p className="mt-3 truncate text-base font-black text-white">
              {value.subscriberName || "—"}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {value.subscriberType} · {value.zone || "no zone"}
            </p>
          </div>

          <div className="space-y-3">
            <SummaryRow label="Waste/week" value={`${value.estimatedWasteKgPerWeek} kg`} />
            <SummaryRow label="Frequency" value={value.collectionFrequency} />
            <SummaryRow label="Travel time" value={`${value.travelTimeMinutes} min`} />
            <SummaryRow label="Service time" value={`${value.serviceTimeMinutes} min`} />
            <SummaryRow label="Total stop" value={`${totalRouteTime} min`} highlight />
            <SummaryRow label="Road" value={value.roadCondition} />
            <SummaryRow label="Vehicle access" value={value.vehicleAccess} />
            <SummaryRow label="Willingness" value={value.willingnessToJoin} />
            <SummaryRow label="Fee ceiling" value={value.feeToleranceAr ? `${value.feeToleranceAr.toLocaleString()} Ar` : "—"} />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              Completion
            </p>
            <div className="mt-3 text-2xl font-black text-white">{completionPercent}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SECTIONS = [
  { label: "Identity", icon: User },
  { label: "Location", icon: MapPin },
  { label: "Route", icon: Truck },
  { label: "Access", icon: Clock },
  { label: "Willingness", icon: ThumbsUp },
];

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-black text-white">{title}</h4>
        <p className="mt-1 text-sm text-white/55">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center gap-1 text-sm font-semibold text-white/80">
        {label}
        {required ? <span className="text-emerald-400">*</span> : null}
      </div>
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
      <span className="text-white/55">{label}</span>
      <span className={["font-bold", highlight ? "text-sky-300" : "text-white"].join(" ")}>
        {value}
      </span>
    </div>
  );
}
