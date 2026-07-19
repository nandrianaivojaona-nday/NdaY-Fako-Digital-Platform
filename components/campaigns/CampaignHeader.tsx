// /components/campaign/CampaignHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

export default function CampaignHeader({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<any>(null);
  const db = getDb();

  useEffect(() => {
    async function fetchCampaign() {
      const snap = await getDoc(doc(db, "campaigns", campaignId));
      if (snap.exists()) setCampaign(snap.data());
    }
    fetchCampaign();
  }, [campaignId, db]);

  if (!campaign) return <div className="h-12 animate-pulse bg-white/5 rounded" />;

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">Activate Campaign</h1>
        <p className="text-white/50">{campaign.name} • {campaign.fokontany}</p>
      </div>
      <div className="text-sm bg-white/10 px-3 py-1 rounded-full text-white/70">
        Status: {campaign.status}
      </div>
    </div>
  );
}