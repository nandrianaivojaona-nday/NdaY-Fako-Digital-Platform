"use client";

import { useState } from "react";
import { Campaign as BaseCampaign } from "@/types/campaign";
import { ExtendedCampaign } from "@/lib/types";
import {
  TrendingUp,
  BarChart3,
  HardHat,
  MapPinned,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";

// SSR-safe import for the Map to prevent hydration errors
const CampaignMap = dynamic(() => import("@/components/map/CampaignMap"), { ssr: false });


interface Props {
  campaign: ExtendedCampaign;
  onAssess?: (campaign: ExtendedCampaign) => void; // Optional callback for assessment action
  isExpanded?: boolean; // Used when selected from the Ticker
}

export default function CampaignCard({ campaign, onAssess, isExpanded = false }: Props) {
  const [showIntentionalMap, setShowIntentionalMap] = useState(false);
  const bank = campaign.bankability;
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleStakeTerritory = () => {
    const returnUrl = `/assessment/${campaign.id}?step=1&stake=true`;

    router.push(
      `/login?returnUrl=${encodeURIComponent(`/assessment/${campaign.id}?step=1`)}&message=${encodeURIComponent(
        "Log in to start or update your assessment."
      )}`
    );
  };

  return (
    <div className={`card ${isExpanded ? 'border-emerald-500/30 bg-emerald-950/10' : ''}`}>

      {/* 🧠 SECTION 1: VIABILITY (Bankability) */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-black text-white leading-none">
            {campaign.fokontany}
          </h3>
          <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mt-2">
            {bank.investmentProfile.riskLevel} • {bank.scores.overall}% Bankable
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-black ${campaign.status === "CRITICAL" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>
          {campaign.status}
        </div>
      </div>

      {/* 📊 SECTION 2: MARKET ANALYSIS */}
      <div className="operator-metrics mb-6">
        <div className="operator-metric">
          <span className="operator-metric-label text-white/75">Est. ROI</span>
          <span className="operator-metric-value text-white font-semibold">
            {bank.investmentProfile.estimatedROI}%
          </span>
        </div>

        <div className="operator-metric">
          <span className="operator-metric-label text-white/75">Monthly Rev</span>
          <span className="operator-metric-value text-emerald-300 font-semibold">
            {bank.investmentProfile.monthlyRevenue.toLocaleString()} Ar
          </span>
        </div>
      </div>

      {/* ⚙️ SECTION 3: OPERATIONAL READINESS */}
      <div className="space-y-3 mb-8 text-white">
        <ScoreLine label="Financial Viability" value={bank.scores.financial} color="bg-emerald-500" />
        <ScoreLine label="Environmental Impact" value={bank.scores.environmental} color="bg-green-500" />
        <ScoreLine label="Operational Setup" value={bank.scores.operational} color="bg-sky-500" />
      </div>


      {/* 🗺️ INTENTIONAL MAP SHOWING */}
      {showIntentionalMap && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-64 w-full rounded-2xl overflow-hidden border border-white/10">
            <CampaignMap selectedFokontany={campaign.fokontany} />
          </div>
        </div>
      )}

      {/* ACTIONS */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={handleStakeTerritory}
          className="button py-3 text-[10px] font-black uppercase hover:bg-emerald-600 transition-colors"
        >
          Stake Territory
        </button>

        <button
          type="button"
          onClick={() => setShowIntentionalMap((prev) => !prev)}
          className="flex items-center justify-center gap-2 py-3 px-4 text-[10px] font-black uppercase text-white bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition-all"
        >
          <MapPinned size={14} className="text-yellow-200" />
          <span className="text-yellow-100">
            {showIntentionalMap ? "Hide Map" : "View Map"}
          </span>
        </button>
      </div>

    </div>
  );

}

/** * Sub-component for the Score Progress Bars 
 * Aligned with NdaY' Visual Identity
 */
function ScoreLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] uppercase font-bold opacity-40 tracking-tighter">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}