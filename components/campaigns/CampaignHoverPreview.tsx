"use client";
import { ExtendedCampaign } from "@/lib/types";

export function CampaignHoverPreview({
  bankability,
  status
}: {
  bankability: ExtendedCampaign["bankability"];
  status?: string;
}) {
  const getStatusPillClass = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "VALIDATED": return "bg-green-500/20 text-green-300 border-green-500/30";
      case "ONGOING": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "CRITICAL": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "COMPLETED": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // Safe fallback if bankability is undefined in edge cases
  if (!bankability) return null;
  if (!bankability?.investmentProfile || !bankability?.scores) {
    return null;
  }  

  // CampaignHoverPreview.tsx — REPLACE the entire return statement with:
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 rounded-xl bg-black/95 border border-white/10 backdrop-blur-xl z-[70] shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      {/* Status Badge */}
      {status && (
        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusPillClass(status)}`}>
          {status}
        </span>
      )}

      {/* Score */}
      <div className="text-2xl font-bold mb-1 mt-2">
        {bankability.scores.overall}/100
      </div>

      <div className="text-sm opacity-80 mb-3">
        {getLevel(bankability.scores.overall)}
      </div>

      {/* Metrics Grid */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span>💰 Monthly Revenue</span>
          <span className="font-mono">{bankability.investmentProfile.monthlyRevenue.toLocaleString()} Ar</span>
        </div>
        <div className="flex justify-between items-center">
          <span>♻️ Carbon Credits</span>
          <span className="font-mono">{bankability.investmentProfile.carbonCreditsPotential} tCO₂e</span>
        </div>
        <div className="flex justify-between items-center">
          <span>⚠️ Risk Level</span>
          <span className={`font-semibold ${bankability.investmentProfile.riskLevel === "Low" ? "text-green-400" :
              bankability.investmentProfile.riskLevel === "Medium" ? "text-yellow-400" :
                "text-red-400"
            }`}>
            {bankability.investmentProfile.riskLevel}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span>📈 ROI</span>
          <span className="font-mono">{bankability.investmentProfile.estimatedROI}%</span>
        </div>
      </div>
    </div>
  );
}

function getLevel(score: number) {
  if (score >= 80) return "🚀 Highly Bankable";
  if (score >= 60) return "✅ Viable";
  if (score >= 40) return "⚠️ Risky";
  return "🔴 Not Ready";
}