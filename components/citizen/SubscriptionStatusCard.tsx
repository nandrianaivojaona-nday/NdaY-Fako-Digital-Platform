"use client";
import { useState } from "react";
import HouseholdQRModal from "./HouseholdQRModal";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:       "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  PENDING:      "bg-amber-500/20 text-amber-300 border-amber-400/30",
  PENDING_CASH: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  EXPIRED:      "bg-red-500/20 text-red-300 border-red-400/30",
  PAUSED:       "bg-white/10 text-white/60 border-white/20",
  CANCELLED:    "bg-white/10 text-white/60 border-white/20",
};

export default function SubscriptionStatusCard({
  planTypeId,
  status,
  nextCollectionAt,
  householdQrPayload,
}: {
  planTypeId: string;
  status: string;
  nextCollectionAt: number | null;
  householdQrPayload: string;
}) {
  const [showQR, setShowQR] = useState(false);

  const planLabel = planTypeId.replace("HH_", "").replace("_", " ");
  const nextLabel = nextCollectionAt
    ? new Date(nextCollectionAt).toLocaleString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

  return (
    <>
      <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {planLabel}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
            {status.replace("_", " ")}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Next pickup</p>
          <p className="mt-1 text-xl font-semibold text-white">{nextLabel}</p>
        </div>

        <button
          onClick={() => setShowQR(true)}
          className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white active:bg-cyan-500"
        >
          Show my QR
        </button>
      </div>

      {showQR && (
        <HouseholdQRModal
          payload={householdQrPayload}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
