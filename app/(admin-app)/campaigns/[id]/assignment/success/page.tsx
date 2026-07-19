// /app/campaigns/[id]/assignment-success/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, Mail } from "lucide-react";

export default function AssignmentSuccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white">Operator Assigned!</h1>
        <p className="text-white/60">
          The operator has been successfully assigned to this campaign.
          <br />
          They will receive a notification and can begin onboarding.
        </p>

        <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Mail className="h-4 w-4 text-emerald-400" />
            <span>Notification sent to operator</span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <span>Status: OPERATOR_ASSIGNED</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="px-6 py-3 bg-emerald-600 rounded-xl text-white font-medium hover:bg-emerald-700 transition-colors"
          >
            View Campaign
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-white/10 rounded-xl text-white/70 hover:bg-white/20 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}