// /app/campaigns/[id]/activate/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useCampaignValidation } from "@/hooks/useCampaignValidation";
import CampaignHeader from "../../../../../../components/campaigns/CampaignHeader";
import PricingFrameworkCard from "../../../../../../components/campaigns/PricingFrameworkCard";
import FinancialRulesCard from "@/components/campaigns/FinancialRulesCard";
import OperatorRequirementsCard from "@/components/campaigns/OperatorRequirementsCard";
import SystemReadinessCard from "@/components/campaigns/SystemReadinessCard";
import ActivationFooter from "@/components/campaigns/ActivationFooter";

export default function CampaignActivationPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const { state, update, validateAndActivate } = useCampaignValidation(campaignId);

  if (!campaignId) return <div>Campaign ID missing</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <CampaignHeader campaignId={campaignId} />

      <div className="grid md:grid-cols-2 gap-6">
        <PricingFrameworkCard state={state} update={update} />
        <FinancialRulesCard state={state} update={update} />
        <OperatorRequirementsCard state={state} update={update} />
        <SystemReadinessCard state={state} />
      </div>

      <ActivationFooter state={state} onActivate={validateAndActivate} />
    </div>
  );
}