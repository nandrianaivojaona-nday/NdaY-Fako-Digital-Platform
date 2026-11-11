"use client";
import type { Subscription } from "@/lib/domain/subscription/types";
import { REFERENCE_PLAN_TYPES } from "@/lib/domain/subscription/planTypes";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  PENDING: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  PENDING_CASH: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  PAUSED: "bg-slate-500/20 text-slate-300 border-slate-400/30",
  EXPIRED: "bg-red-500/20 text-red-300 border-red-400/30",
  CANCELLED: "bg-red-500/20 text-red-300 border-red-400/30",
};

export default function SubscriptionCard({
  subscription,
  onCancel,
  onRenew,
}: {
  subscription: Subscription;
  onCancel?: () => void;
  onRenew?: () => void;
}) {
  const style = STATUS_STYLE[subscription.status] ?? STATUS_STYLE.PENDING;
  const plan = REFERENCE_PLAN_TYPES[subscription.planTypeId];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {plan?.name ?? subscription.planTypeId}
          </h3>
          <p className="text-sm text-white/60">
            {plan?.description ?? "Territorial subscription service"}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${style}`}>
          {subscription.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Amount</p>
          <p className="text-white">{subscription.amountMGA.toLocaleString()} MGA</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Cycle</p>
          <p className="text-white">{subscription.billing.replaceAll("_", " ")}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Collections Remaining</p>
          <p className="text-white">{subscription.collectionsRemaining}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider">Valid Until</p>
          <p className="text-white">
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {onRenew && (
          <button
            onClick={onRenew}
            className="flex-1 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition"
          >
            Renew
          </button>
        )}
        {onCancel && subscription.status === "ACTIVE" && (
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
