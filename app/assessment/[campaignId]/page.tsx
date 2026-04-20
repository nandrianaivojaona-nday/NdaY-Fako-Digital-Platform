"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, onSnapshot, query, where } from "firebase/firestore";
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

export default function AssessmentPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params?.campaignId;
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid;

  const stakeIntent = searchParams.get("stake") === "true";
  const requestedStep = searchParams.get("step");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaignSource, setCampaignSource] = useState<
    "cache" | "server" | "unknown"
  >("unknown");
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "cached" | "pending" | "synced"
  >("idle");

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

  const getStepDescription = (step: string) => {
    const descriptions: Record<string, string> = {
      BRIEF: 'Define campaign objectives and basic parameters',
      DEMAND: 'Assess waste generation and collection demand',
      OPERABILITY: 'Evaluate operational feasibility and constraints',
      BANKABILITY: 'Analyze financial viability and investment needs',
      RISK: 'Identify and assess potential risks',
      DOCUMENT: 'Generate assessment documentation',
      DECISION: 'Make final campaign decision'
    };
    return descriptions[step] || 'Complete assessment details';
  };

  useEffect(() => {
    if (authLoading) return;
    if (!campaignId) return;
    if (user) return;

    const params = new URLSearchParams();
    params.set(
      "returnUrl",
      `/assessment/${campaignId}?step=${requestedStep ?? "1"}${stakeIntent ? "&stake=true" : ""
      }`
    );
    params.set("message", "Log in to start or update your assessment.");

    router.replace(`/login?${params.toString()}`);
  }, [authLoading, user, campaignId, requestedStep, stakeIntent, router]);

  useEffect(() => {
    console.log("[AssessmentPage][Effect 2][campaign-listener] triggered", {
      authLoading,
      campaignId,
      userId,
    });

    if (authLoading) {
      console.log(
        "[AssessmentPage][Effect 2][campaign-listener] skipped: auth still loading"
      );
      return;
    }

    if (!campaignId) {
      console.warn(
        "[AssessmentPage][Effect 2][campaign-listener] skipped: missing campaignId"
      );
      setCampaign(null);
      setCampaignLoading(false);
      setCampaignError("Missing campaign ID");
      setCampaignSource("unknown");
      return;
    }

    if (!userId) {
      console.warn(
        "[AssessmentPage][Effect 2][campaign-listener] skipped: missing userId"
      );
      setCampaign(null);
      setCampaignLoading(false);
      setCampaignError(null);
      setCampaignSource("unknown");
      return;
    }

    const docId = `campaign_${campaignId}`;

    console.log(
      "[AssessmentPage][Effect 2][campaign-listener] starting Firestore listener",
      {
        docPath: `campaigns/${docId}`,
        campaignId,
        userId,
        mode: "direct-doc-read",
      }
    );

    setCampaignLoading(true);
    setCampaignError(null);

    const campaignRef = doc(db, "campaigns", docId);

    const unsubscribe = onSnapshot(
      campaignRef,
      { includeMetadataChanges: true },
      (snap) => {
        console.log(
          "[AssessmentPage][Effect 2][campaign-listener] snapshot received",
          {
            exists: snap.exists(),
            fromCache: snap.metadata.fromCache,
            hasPendingWrites: snap.metadata.hasPendingWrites,
            docId: snap.id,
          }
        );

        if (!snap.exists()) {
          console.warn(
            "[AssessmentPage][Effect 2][campaign-listener] campaign document not found",
            { docId, userId }
          );
          setCampaign(null);
          setCampaignError("Campaign not found");
          setCampaignSource("unknown");
          setCampaignLoading(false);
          return;
        }

        const data = snap.data() as Campaign;

        console.log(
          "[AssessmentPage][Effect 2][campaign-listener] campaign loaded",
          {
            docId: snap.id,
            fromCache: snap.metadata.fromCache,
            campaignId: data?.id,
            name: data?.name,
            fokontany: data?.fokontany,
          }
        );

        setCampaign(data);
        setCampaignSource(snap.metadata.fromCache ? "cache" : "server");
        setCampaignError(null);
        setCampaignLoading(false);
      },
      (error) => {
        console.error(
          "[AssessmentPage][Effect 2][campaign-listener] Firestore listener error",
          {
            code: error?.code ?? "unknown",
            message: error?.message ?? "Unknown Firestore error",
            docId,
            userId,
            mode: "direct-doc-read",
          },
          error
        );

        setCampaign(null);
        setCampaignError(error.message || "Failed to load campaign");
        setCampaignSource("unknown");
        setCampaignLoading(false);
      }
    );

    return () => {
      console.log(
        "[AssessmentPage][Effect 2][campaign-listener] cleanup: unsubscribing listener",
        { docId, userId }
      );
      unsubscribe();
    };
  }, [authLoading, campaignId, userId]);



  useEffect(() => {
    console.log("[AssessmentPage][Effect 3][draft-sync-watcher] triggered", {
      authLoading,
      campaignId,
      userId,
    });

    if (authLoading) {
      console.log(
        "[AssessmentPage][Effect 3][draft-sync-watcher] skipped: auth still loading"
      );
      return;
    }

    if (!campaignId || !userId) {
      console.warn(
        "[AssessmentPage][Effect 3][draft-sync-watcher] skipped: missing campaignId or userId",
        { campaignId, userId }
      );
      setSyncStatus("idle");
      return;
    }

    try {
      console.log(
        "[AssessmentPage][Effect 3][draft-sync-watcher] starting watcher",
        { campaignId, userId }
      );

      const unsubscribe = watchDraftSync(campaignId, userId, (status) => {
        console.log(
          "[AssessmentPage][Effect 3][draft-sync-watcher] status update",
          {
            hasPendingWrites: status.hasPendingWrites,
            fromCache: status.fromCache,
            campaignId,
            userId,
          }
        );

        if (status.hasPendingWrites) {
          setSyncStatus("pending");
        } else if (!status.fromCache) {
          setSyncStatus("synced");
        } else {
          setSyncStatus("cached");
        }
      });

      return () => {
        console.log(
          "[AssessmentPage][Effect 3][draft-sync-watcher] cleanup: unsubscribing watcher",
          { campaignId, userId }
        );
        unsubscribe();
      };
    } catch (error) {
      console.error(
        "[AssessmentPage][Effect 3][draft-sync-watcher] watcher setup error",
        {
          campaignId,
          userId,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        error
      );
      setSyncStatus("idle");
    }
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
    authLoading || campaignLoading || (canLoadDraft ? draftLoading : false);

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
    return <div>Loading assessment...</div>;
  }

  if (!userId) {
    return <div>Redirecting to login...</div>;
  }

  if (campaignError) {
    return <div>{campaignError}</div>;
  }

  if (!campaign || !draft) {
    return <div>Unable to load assessment.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Step Indicator Header */}
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

          {/* Sync Status */}
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <div className={`h-2 w-2 rounded-full ${syncing ? 'bg-blue-400 animate-pulse' :
                syncStatus === 'synced' ? 'bg-green-400' :
                  syncError? 'bg-red-400' : 'bg-gray-400'
              }`} />
            <span className="text-xs font-medium text-white/70">
              {syncing ? 'Syncing...' : `Sync: ${syncStatus}`}
            </span>
          </div>
        </div>

        {/* Main Title */}
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            {STEP_LABELS[currentStep]}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {getStepDescription(currentStep)}
          </p>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white/60">Assessment Progress</span>
            <span className="font-bold text-emerald-300">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Campaign Source Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
          <div className="rounded-full bg-white/10 p-1">
            <svg className="h-3 w-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9" />
            </svg>
          </div>
          <span className="text-xs font-medium text-white/60">Campaign source:</span>
          <span className="text-xs font-bold text-emerald-300 uppercase">{campaignSource}</span>
        </div>

        {/* Error Display */}
        {syncError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 backdrop-blur-sm">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-300">Sync Error</p>
              <p className="text-xs text-red-300/70">{syncError}</p>
            </div>
            <button className="text-xs text-red-300/50 hover:text-red-300">Retry</button>
          </div>
        )}
      </div>

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
