// /components/operator-assignment/AssignmentHeader.tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AssignmentHeader({ campaignId }: { campaignId: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={`/campaigns/${campaignId}/activate`}
          className="text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Assign Operator</h1>
          <p className="text-sm text-white/50">
            Select an operator to run this campaign
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
          Step 2 of 3
        </span>
      </div>
    </div>
  );
}