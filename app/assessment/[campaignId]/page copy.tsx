"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAssessmentDraft } from "@/hooks/useAssessmentDraft";
import { watchDraftSync } from "@/lib/watchDraftSync";
import {
  scoreMarketDemand,
  scoreOperability,
  scoreBankability,
  scoreRisk,
} from "@/lib/scoring";
import { buildAssessmentDocument } from "@/lib/document-builder";
import {
  AssessmentStep,
  MarketDemandInputs,
  OperabilityInputs,
  BankabilityInputs,
  RiskInputs,
  Campaign,
  OperatorDecision,
} from "@/types/campaign";

import BriefStep from "./_steps/BriefStep";
import MarketDemandStep from "./_steps/MarketDemandStep";
import OperabilityStep from "./_steps/OperabilityStep";
import BankabilityStep from "./_steps/BankabilityStep";
import RiskStep from "./_steps/RiskStep";
import DocumentStep from "./_steps/DocumentStep";
import DecisionStep from "./_steps/DecisionStep";

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

type DraftHookResult = ReturnType<typeof useAssessmentDraft>;

export default function AssessmentPage() {



  const params = useParams<{ campaignId: string }>();
  const campaignId = params?.campaignId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const userId = user?.uid;
  const isReadyForDraft = Boolean(campaignId && userId);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignSource, setCampaignSource] = useState<"cache" | "server" | "unknown">("unknown");
  const [syncStatus, setSyncStatus] = useState<"idle" | "cached" | "pending" | "synced">("idle");

  ;
  const canLoadDraft = Boolean(campaignId && userId);




  const draftState: DraftHookResult = useAssessmentDraft(
    isReadyForDraft ? campaignId! : "",
    isReadyForDraft ? userId! : "",
  );

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

  useEffect(() => {
    if (authLoading) return;

    if (!campaignId) {
      setCampaign(null);
      setCampaignLoading(false);
      setCampaignError("Missing campaign ID");
      setCampaignSource("unknown");
      return;
    }

    if (!userId) {
      setCampaign(null);
      setCampaignLoading(false);
      setCampaignError(null);
      setCampaignSource("unknown");
      return;
    }

    setCampaignLoading(true);
    setCampaignError(null);

    const q = query(
      collection(db, "campaigns"),
      where("campaignId", "==", campaignId)
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.empty) {
          setCampaign(null);
          setCampaignError("Campaign not found");
          setCampaignSource("unknown");
          setCampaignLoading(false);
          return;
        }

        const docSnap = snap.docs[0];
        setCampaign(docSnap.data() as Campaign);
        setCampaignSource(docSnap.metadata.fromCache ? "cache" : "server");
        setCampaignError(null);
        setCampaignLoading(false);
      },
      (error) => {
        setCampaign(null);
        setCampaignError(error.message || "Failed to load campaign");
        setCampaignSource("unknown");
        setCampaignLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, campaignId, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!campaignId || !userId) {
      setSyncStatus("idle");
      return;
    }

    const unsubscribe = watchDraftSync(campaignId, userId, (status) => {
      if (status.hasPendingWrites) {
        setSyncStatus("pending");
      } else if (!status.fromCache) {
        setSyncStatus("synced");
      } else {
        setSyncStatus("cached");
      }
    });

    return () => unsubscribe();
  }, [authLoading, campaignId, userId]);

  useEffect(() => {
    if (!campaignId || !userId) return;

    const handleOnline = () => {
      void syncNow();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [campaignId, userId, syncNow]);

  const isLoading =
    authLoading || campaignLoading || (isReadyForDraft ? draftLoading : false);

  const currentStep: AssessmentStep = draft?.currentStep ?? "BRIEF";
  const stepIndex = Math.max(0, STEP_ORDER.indexOf(currentStep));

  const progressPct = useMemo(() => {
    return Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);
  }, [stepIndex]);

  async function handleMarketDemand(inputs: MarketDemandInputs) {
    const output = scoreMarketDemand(inputs);
    await save({
      marketDemandInputs: inputs,
      marketDemandOutput: output,
    });
    await syncNow();
    await advance();
  }

  async function handleOperability(inputs: OperabilityInputs) {
    const result = scoreOperability(inputs);
    await save({
      operabilityInputs: inputs,
      operabilityAssessment: result,
    });
    await syncNow();
    await advance();
  }

  async function handleBankability(inputs: BankabilityInputs) {
    const result = scoreBankability(inputs);
    await save({
      bankabilityInputs: inputs,
      bankabilityAssessment: result,
    });
    await syncNow();
    await advance();
  }

  async function handleRisk(inputs: RiskInputs) {
    const result = scoreRisk(inputs);
    await save({
      riskInputs: inputs,
      riskAssessment: result,
    });
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
    await save({
      decision,
      decisionNotes: notes,
    });

    await syncNow();
    router.push("/dashboard");
  }

  if (isLoading) {
    return <div className="p-6 text-white">Loading assessment...</div>;
  }

  if (!userId) {
    return <div className="p-6 text-white">Please log in to continue.</div>;
  }

  if (campaignError) {
    return <div className="p-6 text-red-300">{campaignError}</div>;
  }

  if (!campaign || !draft) {
    return <div className="p-6 text-white">Unable to load assessment.</div>;
  }

  if (!user || !userProfile) {
    return <div>Loading assessment context...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 text-sm text-white/60">
          Step {stepIndex + 1} of {STEP_ORDER.length}
        </div>

        <div className="text-xl font-bold text-white">
          {STEP_LABELS[currentStep]}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
            Campaign source: {campaignSource}
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
            Sync: {syncing ? "syncing..." : syncStatus}
          </span>

          {syncError && (
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-200">
              {syncError}
            </span>
          )}
        </div>
      </div>

      <div>
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
            onBack={back}
            onSubmit={handleMarketDemand}
          />
        )}

        {currentStep === "OPERABILITY" && (
          <OperabilityStep
            draft={draft}
            onBack={back}
            onSubmit={handleOperability}
          />
        )}

        {currentStep === "BANKABILITY" && (
          <BankabilityStep
            draft={draft}
            onBack={back}
            onSubmit={handleBankability}
          />
        )}

        {currentStep === "RISK" && (
          <RiskStep
            draft={draft}
            onBack={back}
            onSubmit={handleRisk}
          />
        )}

        {currentStep === "DOCUMENT" && (
          <DocumentStep
            draft={draft}
            onBack={back}
            onGenerate={handleGenerateDocument}
          />
        )}

        {currentStep === "DECISION" && (
          <DecisionStep
            draft={draft}
            onBack={back}
            onDecide={handleDecision}
          />
        )}
      </div>
    </div>
  );
}
