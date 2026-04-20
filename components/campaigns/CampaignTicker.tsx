"use client";

import { useState } from "react";
import { CampaignHoverPreview } from "./CampaignHoverPreview";
import { ExtendedCampaign } from "@/lib/types";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Trophy,
  Flame,
  Leaf,
  Recycle
} from "lucide-react";

type Props = {
  campaigns: ExtendedCampaign[];
  onSelectCampaign: (id: string) => void;
  onSelectFokontany: (name: string) => void;
};

// Status to icon mapping
const getStatusIcon = (status: string) => {
  switch (status?.toUpperCase()) {
    case "VALIDATED":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "ONGOING":
      return <TrendingUp className="w-4 h-4 text-blue-400" />;
    case "CRITICAL":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "COMPLETED":
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case "CREATED":
      return <Clock className="w-4 h-4 text-gray-400" />;
    default:
      return <Recycle className="w-4 h-4 text-teal-400" />;
  }
};
// Status to background color mapping
const getStatusBgColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "VALIDATED":
      return "border-green-500/30 bg-green-500/10 hover:bg-green-500/20";
    case "ONGOING":
      return "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20";
    case "CRITICAL":
      return "border-red-500/30 bg-red-500/10 hover:bg-red-500/20";
    case "COMPLETED":
      return "border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20";
    case "CREATED":
      return "border-gray-500/30 bg-gray-500/10 hover:bg-gray-500/20";
    default:
      return "border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20";
  }
};
// Get bankability level color
const getBankabilityColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
};

export default function CampaignTicker({ campaigns, onSelectFokontany, onSelectCampaign }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // 🔥 DUPLICATION IS CRITICAL FOR INFINITE SCROLL
  const duplicated = [...campaigns, ...campaigns];
  return (
    <div className="campaign-ticker">
      <div className="campaign-ticker-track">
        {duplicated.map((campaign, index) => {
          const status = campaign.status || "ONGOING";
          const bankabilityScore = campaign.bankability?.scores?.overall || 0;

          return (
            <div
              key={`${campaign.id}-${index}`}
              className={`campaign-ticker-item ${getStatusBgColor(status)}`}
              onMouseEnter={() => setHoveredId(campaign.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling conflicts
                onSelectCampaign(campaign.id);
              }
            }
            >
              {/* Status Icon */}
              <div className="campaign-ticker-icon">
                {getStatusIcon(status)}
              </div>

              {/* Campaign Name */}
              <span className="campaign-ticker-name font-medium">
                {campaign.name}
              </span>

              {/* Bankability Score Badge */}
              <div className={`campaign-ticker-score ${getBankabilityColor(bankabilityScore)}`}>
                {bankabilityScore}
              </div>

              {/* Hover Preview */}
              {hoveredId === campaign.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-60"> {/* Increased z-index and margin */}
                <CampaignHoverPreview
                  bankability={campaign.bankability}
                  status={campaign.status}
                />
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}