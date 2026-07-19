"use client";

import { ExtendedCampaign } from "@/types/types";

type Bankability = ExtendedCampaign["bankability"];

export function CampaignHoverPreview({
  bankability,
  status,
}: {
  bankability: Bankability;
  status?: string;
}) {
  const getStatusPillClass = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "VALIDATED":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "ONGOING":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "CRITICAL":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "COMPLETED":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // Only hard-stop if we truly have no bankability at all
  if (!bankability) return null;

  const scores = bankability.scores ?? {};
  const investment = bankability.investmentProfile ?? {};

  const overall =
    typeof scores.overall === "number" ? scores.overall : undefined;

  const levelLabel =
    typeof overall === "number" ? getLevel(overall) : "Not yet rated";

  const monthlyRevenue =
    typeof investment.monthlyRevenue === "number"
      ? investment.monthlyRevenue.toLocaleString("en-MG")
      : "—";

  const carbonCredits =
    typeof investment.carbonCreditsPotential === "number"
      ? `${investment.carbonCreditsPotential} tCO₂e`
      : "—";

  const riskLevel = investment.riskLevel ?? "Unknown";

  const roi =
    typeof investment.estimatedROI === "number"
      ? `${investment.estimatedROI}%`
      : "—";

  const riskColor =
    riskLevel === "Low"
      ? "text-green-400"
      : riskLevel === "Medium"
      ? "text-yellow-400"
      : riskLevel === "High"
      ? "text-red-400"
      : "text-gray-300";

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 rounded-xl bg-black/95 border border-white/10 backdrop-blur-xl z-70 shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      {/* Status badge */}
      {status && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">
            Status
          </span>
          <span
            className={
              "text-xs px-2 py-1 rounded-full border " +
              getStatusPillClass(status)
            }
          >
            {status}
          </span>
        </div>
      )}

      {/* Score */}
      <div className="mt-1">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">
          Bankability score
        </div>
        <div className="text-2xl font-bold mb-1 mt-1">
          {typeof overall === "number" ? `${overall}/100` : "—"}
        </div>
        <div className="text-sm opacity-80 mb-3">{levelLabel}</div>
      </div>

      {/* Metrics grid */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span>Monthly Revenue</span>
          <span className="font-mono">{monthlyRevenue} Ar</span>
        </div>

        <div className="flex justify-between items-center">
          <span>Carbon Credits</span>
          <span className="font-mono">{carbonCredits}</span>
        </div>

        <div className="flex justify-between items-center">
          <span>Risk Level</span>
          <span className={`font-semibold ${riskColor}`}>{riskLevel}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span>ROI</span>
          <span className="font-mono">{roi}</span>
        </div>
      </div>
    </div>
  );
}

function getLevel(score: number) {
  if (score >= 80) return "Highly Bankable";
  if (score >= 60) return "Viable";
  if (score >= 40) return "Risky";
  return "Not Ready";
}
