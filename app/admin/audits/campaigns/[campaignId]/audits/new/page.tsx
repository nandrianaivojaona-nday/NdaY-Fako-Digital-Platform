"use client";

import { useParams } from "next/navigation";

export default function NewAuditPage() {
  const params = useParams();

  const campaignId = params.campaignId as string;

  return (
    <div>
      campaign: {campaignId}
    </div>
  );
}