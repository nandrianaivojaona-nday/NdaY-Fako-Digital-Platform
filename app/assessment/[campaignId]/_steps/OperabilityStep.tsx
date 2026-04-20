"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AssessmentDraft, Campaign, OperabilityInputs } from "@/types/campaign";
import OperabilityModal from "./OperabilityModal";
import { SubscriberDraft } from "./SubscriberSheet";  // import the type

type Props = {
  draft: AssessmentDraft;
  campaign: Campaign;
  onSubmit: (inputs: OperabilityInputs) => Promise<void>;
  onBack: () => Promise<void>;
  onNext?: () => Promise<void>;                    // Made optional
  onGenerateDocument?: () => Promise<void>;       // Made optional
  onSubmitAssessment?: () => Promise<void>;       // Made optional
  onDecide?: (decision: "PROCEED" | "PROCEED_WITH_CONDITIONS" | "HOLD" | "DECLINE", notes?: string) => Promise<void>; // Made optional
  onSaveDraft?: (partial: Partial<AssessmentDraft>) => Promise<void>; // Made optional
  onSaveAndExit?: () => Promise<void>;            // Made optional
  onChangeStep?: (step: "BRIEF" | "DEMAND" | "OPERABILITY" | "BANKABILITY" | "RISK" | "DOCUMENT" | "DECISION") => Promise<void>; // Made optional
};

function buildInitialForm(initial?: OperabilityInputs): OperabilityInputs {
  return {
    routeComplexity: initial?.routeComplexity ?? 45,
    accessibilityScore: initial?.accessibilityScore ?? 70,
    assetReadiness: initial?.assetReadiness ?? 60,
    workforceReadiness: initial?.workforceReadiness ?? 65,
    traceabilityReadiness: initial?.traceabilityReadiness ?? 55,
    monitoringEase: initial?.monitoringEase ?? 60,
    stakeholderCoordination: initial?.stakeholderCoordination ?? 58,
    operatorSlotFillRate: initial?.operatorSlotFillRate ?? 50,
  };
}

export default function OperabilityStep({ 
  draft, 
  onSubmit, 
  onBack, 
  onNext = async () => {},
  onGenerateDocument = async () => {},
  onSubmitAssessment = async () => {},
  onDecide = async () => {},
  onSaveDraft = async () => {},
  onSaveAndExit = async () => {},
  onChangeStep = async () => {},
}: Props) {
  const initialMetrics = draft.operabilityInputs;
  const initialSubscribers = (draft as any).subscribers || []; // if your AssessmentDraft type includes subscribers

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Metrics state (updated automatically by modal when subscribers change)
  const [savedMetrics, setSavedMetrics] = useState<OperabilityInputs>(() =>
    buildInitialForm(initialMetrics)
  );
  const [draftMetrics, setDraftMetrics] = useState<OperabilityInputs>(() =>
    buildInitialForm(initialMetrics)
  );

  // Subscriber state (the source of truth for derivation)
  const [subscribers, setSubscribers] = useState<SubscriberDraft[]>(initialSubscribers);

  // Keep local metrics in sync with saved metrics when modal closed
  useEffect(() => {
    setSavedMetrics(buildInitialForm(draft.operabilityInputs));
    if (!modalOpen) {
      setDraftMetrics(buildInitialForm(draft.operabilityInputs));
    }
  }, [draft.operabilityInputs, modalOpen]);

  // Also load subscribers from draft if they change externally
  useEffect(() => {
    setSubscribers((draft as any).subscribers || []);
  }, [draft]);

  const activeForm = modalOpen ? draftMetrics : savedMetrics;

  const liveScore = useMemo(() => {
    const values = [
      activeForm.routeComplexity !== undefined ? 100 - activeForm.routeComplexity : 50,
      activeForm.accessibilityScore ?? 50,
      activeForm.assetReadiness ?? 50,
      activeForm.workforceReadiness ?? 50,
      activeForm.traceabilityReadiness ?? 50,
      activeForm.monitoringEase ?? 50,
      activeForm.stakeholderCoordination ?? 50,
      activeForm.operatorSlotFillRate ?? 50,
    ];
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [activeForm]);

  // Called by modal when a metric changes (after derivation)
  const handleMetricChange = useCallback(<K extends keyof OperabilityInputs>(
    key: K,
    value: OperabilityInputs[K]
  ) => {
    setDraftMetrics((prev) => ({ ...prev, [key]: value }));
  },
    []
  );

  // Called by modal when subscriber list changes
  const handleSubscribersChange = (newSubscribers: SubscriberDraft[]) => {
    setSubscribers(newSubscribers);
    // Persist to draft (optional, but good for saving progress)
    onSaveDraft({ subscribers: newSubscribers } as Partial<AssessmentDraft>);
  };

  function handleOpenModal() {
    setDraftMetrics(savedMetrics);
    setModalOpen(true);
  }

  function handleCancelModal() {
    setDraftMetrics(savedMetrics);
    setModalOpen(false);
  }

  async function handleSaveModal() {
    setSaving(true);
    // Save both metrics and subscribers
    await onSubmit(draftMetrics);
    await onSaveDraft({ subscribers } as Partial<AssessmentDraft>);
    setSavedMetrics(draftMetrics);
    setSaving(false);
    setModalOpen(false);
  }

  async function handleScoreCurrent() {
    setSaving(true);
    await onSubmit(savedMetrics);
    setSaving(false);
  }

  return (
    <>
      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Operability</h2>
          <p className="text-sm text-white/70">
            Measure whether the campaign can realistically be executed with the
            available access, assets, workforce, and monitoring conditions.
          </p>
        </div>

        {/* Live Score */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs uppercase tracking-widest text-white/50">
            Live operability projection
          </div>
          <div className="mt-2 text-3xl font-black text-white">{liveScore}</div>
          <div className="text-sm text-white/70">Estimated operability /100</div>
          <div className="mt-2 text-sm font-semibold text-emerald-300">
            {liveScore >= 80
              ? "Strong"
              : liveScore >= 60
                ? "Viable"
                : liveScore >= 40
                  ? "Weak"
                  : "Not recommended"}
          </div>
        </div>

        {/* Read-only fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField
            label="Route complexity"
            hint="Linked to route difficulty in the modal"
            value={activeForm.routeComplexity ?? 0}
          />
          <ReadOnlyField
            label="Accessibility score"
            hint="Linked to access conditions in the modal"
            value={activeForm.accessibilityScore ?? 0}
          />
          <ReadOnlyField
            label="Asset readiness"
            hint="Linked to bins, transport, and support assets"
            value={activeForm.assetReadiness ?? 0}
          />
          <ReadOnlyField
            label="Workforce readiness"
            hint="Linked to operator preparedness"
            value={activeForm.workforceReadiness ?? 0}
          />
          <ReadOnlyField
            label="Traceability readiness"
            hint="Linked to tracking and collection visibility"
            value={activeForm.traceabilityReadiness ?? 0}
          />
          <ReadOnlyField
            label="Monitoring ease"
            hint="Linked to supervision practicality"
            value={activeForm.monitoringEase ?? 0}
          />
          <ReadOnlyField
            label="Stakeholder coordination"
            hint="Linked to actor alignment"
            value={activeForm.stakeholderCoordination ?? 0}
          />
          <ReadOnlyField
            label="Operator slot fill rate"
            hint="Linked to staffing feasibility"
            value={activeForm.operatorSlotFillRate ?? 0}
          />
        </div>

        {/* Buttons */}
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
            onClick={handleOpenModal}
            className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-bold text-white"
          >
            Manage subscribers & derive metrics
          </button>

          <button
            type="button"
            onClick={() => void handleScoreCurrent()}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
          >
            {saving ? "Saving..." : "Score Operability →"}
          </button>
        </div>
      </div>

      {/* Modal - now receives correct props */}
      {modalOpen && (
        <OperabilityModal
          value={draftMetrics}
          subscribers={subscribers}
          onMetricChange={handleMetricChange}
          onSubscribersChange={handleSubscribersChange}
          onClose={handleCancelModal}
          onCancel={handleCancelModal}
          onSave={handleSaveModal}
          saving={saving}
        />
      )}
    </>
  );
}

function ReadOnlyField({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-2 text-xs text-white/50">{hint}</div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
    </div>
  );
}