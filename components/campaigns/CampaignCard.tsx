"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  BarChart3,
  HardHat,
  MapPinned,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Campaign as BaseCampaign } from "@/types/campaign";
import { ExtendedCampaign } from "@/types/types";

const CampaignMap = dynamic(() => import("@/components/map/CampaignMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
      Loading map...
    </div>
  ),
});

interface Props {
  campaign: ExtendedCampaign;
  onAssess?: (campaign: ExtendedCampaign) => void;
  isExpanded?: boolean;
  fokontanyFeatures?: string;
  user?: {
    id: string;
    role: "ADMIN" | "AUTHORITY" | "OPERATOR" | "CITIZEN";
    operatorId?: string;
  };
}

export default function CampaignCard({
  campaign,
  onAssess,
  isExpanded = false,
  user,
}: Props) {
  const [showIntentionalMap, setShowIntentionalMap] = useState(false);

  const bank = campaign.bankability;
  const riskLevel = bank?.investmentProfile?.riskLevel ?? "Unknown";
  const overallScore = bank?.scores?.overall ?? 0;
  const monthlyRevenue = bank?.investmentProfile?.monthlyRevenue ?? 0;
  const estimatedROI = bank?.investmentProfile?.estimatedROI ?? 0;
  const financialScore = bank?.scores?.financial ?? 0;
  const hasBankability = !!bank?.investmentProfile && !!bank?.scores;

  const router = useRouter();

  const handleStakeTerritory = () => {
    const returnUrl = `/assessment/${campaign.id}?step=1&stake=true`;
    router.push(
      `/login?returnUrl=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent(
        "Log in to start or update your assessment."
      )}`
    );
  };

  const fokontanyFeatures = Array.isArray(campaign?.fokontanyFeatures)
    ? campaign.fokontanyFeatures
    : [];

  const canAssess =
    user?.role === "CITIZEN" ||
    user?.role === "ADMIN" ||
    user?.role === "AUTHORITY";

  return (
    <div
      className={[
        "card rounded-[1.75rem] border p-5 sm:p-6",
        "backdrop-blur-sm transition-all duration-300",
        isExpanded
          ? "border-emerald-500/30 bg-emerald-950/10"
          : "border-white/10 bg-slate-950/70",
      ].join(" ")}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black leading-none text-white">
            {campaign.fokontany || campaign.name || "Unknown Fokontany"}
          </h3>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {riskLevel} • {overallScore}% Bankable
          </p>
        </div>

        <div
          className={[
            "rounded-md px-2 py-1 text-[10px] font-black uppercase",
            campaign.status === "CRITICAL"
              ? "bg-red-500/20 text-red-400"
              : "bg-emerald-500/20 text-emerald-400",
          ].join(" ")}
        >
          {campaign.status || "ACTIVE"}
        </div>
      </div>

      <div className="operator-metrics mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="operator-metric rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="operator-metric-label mb-1 flex items-center gap-2 text-white/75">
            <TrendingUp size={14} />
            <span className="text-[10px] font-bold uppercase">Est. ROI</span>
          </span>
          <span className="operator-metric-value text-sm font-semibold text-emerald-300">
            {estimatedROI}%
          </span>
        </div>

        <div className="operator-metric rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="operator-metric-label mb-1 flex items-center gap-2 text-white/75">
            <BarChart3 size={14} />
            <span className="text-[10px] font-bold uppercase">Monthly Rev</span>
          </span>
          <span className="operator-metric-value text-sm font-semibold text-white">
            {Number(monthlyRevenue).toLocaleString()} Ar
          </span>
        </div>

        <div className="operator-metric rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="operator-metric-label mb-1 flex items-center gap-2 text-white/75">
            <HardHat size={14} />
            <span className="text-[10px] font-bold uppercase">Financial</span>
          </span>
          <span className="operator-metric-value text-sm font-semibold text-white">
            {financialScore}%
          </span>
        </div>

        <div className="operator-metric rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="operator-metric-label mb-1 flex items-center gap-2 text-white/75">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-bold uppercase">Bankability</span>
          </span>
          <span className="operator-metric-value text-sm font-semibold text-white">
            {hasBankability ? "Ready" : "Pending"}
          </span>
        </div>
      </div>

      <div className="mb-8 space-y-3 text-white">
        <ScoreLine
          label="Financial Viability"
          value={bank?.scores?.financial ?? 0}
          color="bg-emerald-500"
        />
        <ScoreLine
          label="Environmental Impact"
          value={bank?.scores?.environmental ?? 0}
          color="bg-green-500"
        />
        <ScoreLine
          label="Operational Setup"
          value={bank?.scores?.operational ?? 0}
          color="bg-sky-500"
        />
      </div>

      {showIntentionalMap && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-64 w-full overflow-hidden rounded-2xl border border-white/10">
            <CampaignMap
            key={campaign.id} campaignId={campaign.id}
              fokontanyFeatures={fokontanyFeatures}
              isVisible={showIntentionalMap}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={handleStakeTerritory}
          className="button inline-flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase hover:bg-emerald-600 transition-colors rounded-xl bg-emerald-500 text-white"
        >
          <ChevronRight size={14} />
          Stake Territory
        </button>

        {onAssess ? (
          <button
            type="button"
            onClick={() => onAssess(campaign)}
            className="button inline-flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl text-white"
          >
            <ShieldCheck size={14} />
            Assess
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIntentionalMap((prev) => !prev)}
            className="flex items-center justify-center gap-2 py-3 px-4 text-[10px] font-black uppercase text-white bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition-all col-span-2"
          >
            <MapPinned size={14} className="text-yellow-200" />
            <span className="text-yellow-100">
              {showIntentionalMap ? "Hide Map" : "View Map"}
            </span>
          </button>
        )}
      </div>

      {onAssess && (
        <button
          type="button"
          onClick={() => setShowIntentionalMap((prev) => !prev)}
          className="mt-3 flex w-full items-center justify-center gap-2 py-3 px-4 text-[10px] font-black uppercase text-white bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition-all"
        >
          <MapPinned size={14} className="text-yellow-200" />
          <span className="text-yellow-100">
            {showIntentionalMap ? "Hide Map" : "View Map"}
          </span>
        </button>
      )}
    </div>
  );
}

function ScoreLine({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] uppercase font-bold opacity-40 tracking-tighter">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
