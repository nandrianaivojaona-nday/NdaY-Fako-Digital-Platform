"use client";

// ============================================
// 1. IMPORTS (combined from both files)
// ============================================

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { useAuth } from "@/hooks/useAuth";
import { useAssessmentDraft } from "@/hooks/useAssessmentDraft";
import { watchDraftSync } from "@/lib/api/sync/watchDraftSync";
import {
  scoreMarketDemand,
  scoreOperability,
  scoreBankability,
  scoreRisk,
} from "@/lib/domain/scoring";
import { buildAssessmentDocument } from "@/lib/domain/document-builder";
import {
  AssessmentStep,
  MarketDemandInputs,
  OperabilityInputs,
  BankabilityInputs,
  RiskInputs,
  Campaign,
  OperatorDecision,
} from "@/types/campaign";

// Step components (ensure these exist at the relative path)
import BriefStep from "./_steps/BriefStep";
import MarketDemandStep from "./_steps/MarketDemandStep";
import OperabilityStep from "./_steps/OperabilityStep";
import BankabilityStep from "./_steps/BankabilityStep";
import RiskStep from "./_steps/RiskStep";
import DocumentStep from "./_steps/DocumentStep";
import DecisionStep from "./_steps/DecisionStep";

// ============================================
// 2. CONSTANTS
// ============================================

const STEP_LABELS: Record<AssessmentStep, string> = {
  BRIEF: "Campaign Brief",
  MARKET_DEMAND: "Market & Demand",
  OPERABILITY: "Operability",
  BANKABILITY: "Bankability",
  RISK: "Risk & Compliance",
  DOCUMENT: "Project Document",
  DECISION: "Operator Decision",
};

const STEP_ORDER: AssessmentStep[] = [
  "BRIEF",
  "MARKET_DEMAND",
  "OPERABILITY",
  "BANKABILITY",
  "RISK",
  "DOCUMENT",
  "DECISION",
];

// ============================================
// 3. MAIN COMPONENT
// ============================================

export default function AssessmentContent() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params?.campaignId;
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const stakeIntent = searchParams.get("stake") === "true";
  const requestedStep = searchParams.get("step");
  const db = getDb();

  // ─── State for campaign (shared between public & operator) ───
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignSource, setCampaignSource] = useState<
    "cache" | "server" | "unknown"
  >("unknown");
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "cached" | "pending" | "synced"
  >("idle");

  // ─── Load campaign data (used by both views) ───
  useEffect(() => {
    if (authLoading) return;
    if (!campaignId) {
      setCampaign(null);
      setCampaignLoading(false);
      setCampaignError("Missing campaign ID");
      return;
    }

    setCampaignLoading(true);
    setCampaignError(null);

    const campaignRef = doc(db, "campaigns", campaignId);

    const unsubscribe = onSnapshot(
      campaignRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          setCampaign(null);
          setCampaignError("Campaign not found");
          setCampaignSource("unknown");
          setCampaignLoading(false);
          return;
        }
        const data = snap.data() as Campaign;
        setCampaign(data);
        setCampaignSource(snap.metadata.fromCache ? "cache" : "server");
        setCampaignError(null);
        setCampaignLoading(false);
      },
      (error) => {
        console.error("Campaign listener error:", error);
        setCampaignError(error.message || "Failed to load campaign");
        setCampaignSource("unknown");
        setCampaignLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, campaignId, db]);

  // ─── Operator‑only: Draft management ───
  const canLoadDraft = Boolean(campaignId && userId);

  const {
    draft,
    loading: draftLoading,
    save,
    advance,
    back,
    syncNow,
    syncing,
    syncError,
  } = useAssessmentDraft(
    canLoadDraft ? campaignId! : "",
    canLoadDraft ? userId! : ""
  );

  // ─── Operator‑only: Draft sync watcher ───
  useEffect(() => {
    if (authLoading) return;
    if (!campaignId || !userId) {
      setSyncStatus("idle");
      return;
    }

    try {
      const unsubscribe = watchDraftSync(campaignId, userId, (status) => {
        if (status.hasPendingWrites) setSyncStatus("pending");
        else if (!status.fromCache) setSyncStatus("synced");
        else setSyncStatus("cached");
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Sync watcher error:", error);
      setSyncStatus("idle");
    }
  }, [authLoading, campaignId, userId]);

  // ─── Operator‑only: online sync ───
  useEffect(() => {
    if (!campaignId || !userId) return;
    const handleOnline = () => void syncNow();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [campaignId, userId, syncNow]);

  // ─── Loading state ───
  const isLoading =
    authLoading || campaignLoading || (canLoadDraft ? draftLoading : false);

  // ─── If campaign failed to load ───
  if (campaignError) {
    return <div className="p-6 text-red-400">Error: {campaignError}</div>;
  }

  if (isLoading || !campaign) {
    return <div className="p-6">Loading assessment...</div>;
  }

  // ─── 🟢 RENDER PUBLIC TEASER IF NOT AUTHENTICATED ───
  if (!user) {
    return (
      <div className="space-y-6 p-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-sm opacity-70">{campaign.fokontany}</p>
        </div>

        <div className="rounded-xl border border-white/10 p-6 bg-white/5">
          <p className="text-white/80">
            This campaign is open for operator assessment. Log in or create an
            account to stake your interest and begin the evaluation process.
          </p>
        </div>

        <button
          onClick={() => {
            const returnUrl = `/assessment/${campaignId}?step=BRIEF${
              stakeIntent ? "&stake=true" : ""
            }`;
            router.push(
              `/login?returnUrl=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent(
                "Log in to start or update your assessment."
              )}`
            );
          }}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
        >
          Stake In & Assess
        </button>
      </div>
    );
  }

  // ─── 🟢 RENDER FULL OPERATOR ASSESSMENT (authenticated) ───

  // If draft isn't loaded yet (but we have user), wait
  if (draftLoading) {
    return <div className="p-6">Loading your assessment draft...</div>;
  }

  if (!draft) {
    return <div className="p-6">Unable to load assessment draft.</div>;
  }

  // 🔥 FIX: cast to AssessmentStep
  const currentStep = (draft?.currentStep ?? "BRIEF") as AssessmentStep;
  const stepIndex = Math.max(0, STEP_ORDER.indexOf(currentStep));
  const progressPct = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);

  const getStepDescription = (step: string) => {
    const descriptions: Record<string, string> = {
      BRIEF: "Define campaign objectives and basic parameters",
      MARKET_DEMAND: "Assess waste generation and collection demand",
      OPERABILITY: "Evaluate operational feasibility and constraints",
      BANKABILITY: "Analyze financial viability and investment needs",
      RISK: "Identify and assess potential risks",
      DOCUMENT: "Generate assessment documentation",
      DECISION: "Make final campaign decision",
    };
    return descriptions[step] || "Complete assessment details";
  };

  // ─── Handler functions ───
  async function handleMarketDemand(inputs: MarketDemandInputs) {
    const output = scoreMarketDemand(inputs);
    await save({ marketDemandInputs: inputs, marketDemandOutput: output });
    await syncNow();
    await advance();
  }

  async function handleOperability(inputs: OperabilityInputs) {
    const result = scoreOperability(inputs);
    await save({ operabilityInputs: inputs, operabilityAssessment: result });
    await syncNow();
    await advance();
  }

  async function handleBankability(inputs: BankabilityInputs) {
    const result = scoreBankability(inputs);
    await save({ bankabilityInputs: inputs, bankabilityAssessment: result });
    await syncNow();
    await advance();
  }

  async function handleRisk(inputs: RiskInputs) {
    const result = scoreRisk(inputs);
    await save({ riskInputs: inputs, riskAssessment: result });
    await syncNow();
    await advance();
  }

  async function handleGenerateDocument() {
    if (!campaign || !draft) return;
    const generated = buildAssessmentDocument(draft, campaign);
    await save({
      generatedDocumentJson: generated,
      generatedAt: new Date().toISOString(),
    });
    await syncNow();
    await advance();
  }

  async function handleDecision(decision: OperatorDecision, notes?: string) {
    await save({ decision, decisionNotes: notes });
    const campaignRef = doc(db, "campaigns", campaignId!);
    await updateDoc(campaignRef, {
      status: "READY_FOR_REVIEW",
      assessment: { isComplete: true, completedAt: serverTimestamp() },
      updatedAt: serverTimestamp(),
    });
    await syncNow();
    router.push("/dashboard");
  }

  // ─── Operator UI ───
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Step indicator header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-300 backdrop-blur-sm">
              Step {stepIndex + 1} of {STEP_ORDER.length}
            </div>
            {stakeIntent && (
              <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Stake Intent Active
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <div
              className={`h-2 w-2 rounded-full ${
                syncing
                  ? "bg-blue-400 animate-pulse"
                  : syncStatus === "synced"
                  ? "bg-green-400"
                  : syncError
                  ? "bg-red-400"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-xs font-medium text-white/70">
              {syncing ? "Syncing..." : `Sync: ${syncStatus}`}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black bg-linear-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            {STEP_LABELS[currentStep]}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {getStepDescription(currentStep)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white/60">
              Assessment Progress
            </span>
            <span className="font-bold text-emerald-300">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
          <span className="text-xs font-medium text-white/60">
            Campaign source:
          </span>
          <span className="text-xs font-bold text-emerald-300 uppercase">
            {campaignSource}
          </span>
        </div>

        {syncError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 backdrop-blur-sm">
            <p className="text-sm font-medium text-red-300">
              Sync Error: {syncError}
            </p>
            <button
              onClick={() => syncNow()}
              className="text-xs text-red-300/50 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Step renderers */}
      {currentStep === "BRIEF" && (
        <BriefStep
          campaign={campaign}
          draft={draft}
          save={save}
          onNext={advance}
        />
      )}
      {currentStep === "MARKET_DEMAND" && (
        <MarketDemandStep
          draft={draft}
          campaign={campaign}
          onBack={back}
          onSubmit={handleMarketDemand}
        />
      )}
      {currentStep === "OPERABILITY" && (
        <OperabilityStep
          draft={draft}
          campaign={campaign}
          onBack={back}
          onSubmit={handleOperability}
        />
      )}
      {currentStep === "BANKABILITY" && (
        <BankabilityStep
          draft={draft}
          campaign={campaign}
          onBack={back}
          onSubmit={handleBankability}
        />
      )}
      {currentStep === "RISK" && (
        <RiskStep
          draft={draft}
          campaign={campaign}
          onBack={back}
          onSubmit={handleRisk}
        />
      )}
      {currentStep === "DOCUMENT" && (
        <DocumentStep
          draft={draft}
          campaign={campaign}
          onBack={back}
          onGenerate={handleGenerateDocument}
        />
      )}
      {currentStep === "DECISION" && (
        <DecisionStep
          draft={draft}
          campaign={campaign}
          onBack={back}
          onDecide={handleDecision}
        />
      )}
    </div>
  );
}