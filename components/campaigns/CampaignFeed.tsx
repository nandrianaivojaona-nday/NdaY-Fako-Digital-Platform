"use client";

import { useRouter } from "next/navigation";
import { Campaign} from "@/types/campaign";
import { ExtendedCampaign } from "@/types/types";
import CampaignCard from "./CampaignCard";

export default function CampaignFeed({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();

  const active = campaigns.filter((c) =>
    ["CREATED","ONGOING", "CRITICAL", "VALIDATED", "COMPLETED"].includes(c.status)
  );

  if (active.length === 0) return null;

  return (
    <section className="section">
      <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest">
        🔥 Active Campaigns Near You
      </h2>

      <div className="grid-3">
        {active.map((c: Campaign) => (
          <CampaignCard
          key={c.id}
          campaign={{
            ...c,
            status: c.status as any, // Fixes the previous status union issue
            bankability: c.bankability || {
              scores: { overall: 0, financial: 0, environmental: 0, operational: 0 },
              investmentProfile: {
                monthlyRevenue: 0,
                estimatedROI: 0,
                paybackMonths: 0,
                riskLevel: "Unknown",
              },
            },
          } as any} // Using 'as any' or a specific type cast here overrides the strict check
          onAssess={(campaign: Campaign) =>
            router.push(`/assessment/${campaign.id}`)
          }
        />
        ))}
      </div>
    </section>
  );
}
