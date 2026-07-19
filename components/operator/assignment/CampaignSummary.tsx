// /components/operator-assignment/CampaignSummaryCard.tsx
"use client";

import type { Campaign } from "@/types/campaign";
import { MapPin, Calendar, Users, Coins, TrendingUp } from "lucide-react";

export default function CampaignSummaryCard({ campaign }: { campaign: Campaign }) {
  return (
    <div className="p-4 border rounded-2xl space-y-4 bg-white/5 backdrop-blur-sm sticky top-6">
      <h2 className="font-semibold text-white">Campaign Summary</h2>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">Name</p>
          <p className="text-white font-medium">{campaign.name}</p>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-emerald-400 mt-1" />
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Location</p>
            <p className="text-white text-sm">
              {campaign.fokontany || "Not specified"}
              {campaign.zone && `, ${campaign.zone}`}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-emerald-400 mt-1" />
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Duration</p>
            <p className="text-white text-sm">
              {campaign.startDate
                ? new Date(campaign.startDate).toLocaleDateString()
                : "TBD"}{" "}
              →
              {campaign.endDate
                ? new Date(campaign.endDate).toLocaleDateString()
                : "TBD"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Coins className="h-4 w-4 text-emerald-400 mt-1" />
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Pricing Framework</p>
            <p className="text-white text-sm">
              {campaign.pricingFramework?.mode || "BOUNDED"}
            </p>
            <p className="text-white/60 text-xs">
              {campaign.pricingFramework?.min?.toLocaleString()} –{" "}
              {campaign.pricingFramework?.max?.toLocaleString()} MGA
              <br />
              Recommended: {campaign.pricingFramework?.recommended?.toLocaleString()} MGA
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400 mt-1" />
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Commission</p>
            <p className="text-white text-sm">
              {campaign.financialRules?.commission || 10}%
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-emerald-400 mt-1" />
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Requirements</p>
            <p className="text-white text-sm">
              {campaign.operatorRequirements?.collectors || 10} collectors
              <br />
              {campaign.operatorRequirements?.frequency || "weekly"} collection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}