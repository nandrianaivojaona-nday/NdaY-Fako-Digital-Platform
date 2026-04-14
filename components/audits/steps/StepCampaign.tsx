"use client";

import { useEffect, useState } from "react";

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { StepProps } from "@/lib/audits/auditTypes";

export default function StepCampaign({
  form,
  setForm,
}: StepProps) {

  const [campaigns, setCampaigns] = useState<any[]>([]);


  useEffect(() => {
    loadCampaigns();
  }, []);


  async function loadCampaigns() {

    const snap = await getDocs(
      collection(db, "audit_campaigns")
    );

    setCampaigns(
      snap.docs.map((d) => d.data())
    );
  }


  return (
    <div>

      <h2>Campaign</h2>

      <select
        value={form.campaignId}
        onChange={(e) =>
          setForm({
            ...form,
            campaignId: e.target.value,
          })
        }
      >

        <option value="">
          Select campaign
        </option>

        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}

      </select>

    </div>
  );
}