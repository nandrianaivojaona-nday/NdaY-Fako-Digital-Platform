"use client";
import { useState } from "react";
import type { TerritorialSubscriptionOffer, TerritorialSubscriptionOfferVersion } from "@/lib/domain/subscription/offerTypes";

export default function OfferApprovalPanel({
  offer,
  version,
  approvalRequestId,
  onApprove,
  onReject,
}: {
  offer: TerritorialSubscriptionOffer;
  version: TerritorialSubscriptionOfferVersion;
  approvalRequestId: string;
  onApprove: (note?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">
        CEO Approval — {offer.planTypeId} / v{version.versionNumber}
      </h3>
      <p className="text-sm text-white/70">
        Submitted by {version.submittedBy} on{" "}
        {version.submittedAt ? new Date(version.submittedAt).toLocaleString() : "—"}
      </p>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
        <pre className="whitespace-pre-wrap">{JSON.stringify(version.commercial, null, 2)}</pre>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm text-white/70 mb-2">Approval note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          <button
            onClick={async () => {
              setBusy("approve");
              try { await onApprove(note); } finally { setBusy(null); }
            }}
            disabled={busy !== null}
            className="mt-3 rounded-full bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-2">Rejection reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
          <button
            onClick={async () => {
              setBusy("reject");
              try { await onReject(reason); } finally { setBusy(null); }
            }}
            disabled={busy !== null || !reason}
            className="mt-3 rounded-full border border-red-400/40 bg-red-500/10 px-6 py-2 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
