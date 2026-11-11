"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PlanSelector from "@/components/citizen/PlanSelector";
import { useAuth } from "@/hooks/useAuth";
import type { PaymentMethod } from "@/lib/domain/subscription/types";

export default function SubscribePage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null);

  async function handleSelect(input: { offerId: string; method: PaymentMethod; phone?: string }) {
    if (!firebaseUser) {
      router.push("/login?returnUrl=/citizen/subscribe");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/app/citizen/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId: input.offerId,
          paymentMethod: input.method,
          customerPhone: input.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const subscriptionId = data.subscriptionId ?? data.existingSubscriptionId;
        if (subscriptionId) setPendingSubscriptionId(subscriptionId);
        throw new Error(data.error ?? "Failed to create subscription");
      }
      if (data.payment?.redirectUrl) {
        window.location.href = data.payment.redirectUrl;
      } else {
        router.push(`/citizen/subscriptions?ref=${data.subscription.id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-white px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Choose your subscription</h1>
        <p className="text-white/60 mb-8">
          Select a plan and payment method. Cash payments are validated by your local operator.
        </p>
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
        {pendingSubscriptionId && (
          <a href={`/citizen/subscriptions?ref=${encodeURIComponent(pendingSubscriptionId)}`} className="mb-6 block rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Open the existing subscription status.
          </a>
        )}
        <PlanSelector onSelect={handleSelect} />
        {submitting && <p className="mt-4 text-white/60">Processing…</p>}
      </div>
    </main>
  );
}
