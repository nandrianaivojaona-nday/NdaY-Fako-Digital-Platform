"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Subscription } from "@/lib/domain/subscription/types";

type PaymentSnapshot = {
  status: string;
  holdType: string;
  totalAmountMGA: number;
  heldAmountMGA: number;
  authorizedAt: number | null;
  checkoutUrl: string | null;
  instructions: string | null;
  cancellationPending: boolean;
} | null;

export default function SubscriptionPaymentStatusPage() {
  const [reference, setReference] = useState<string | null>(null);
  const { firebaseUser } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payment, setPayment] = useState<PaymentSnapshot>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReference(new URLSearchParams(window.location.search).get("ref"));
  }, []);

  const refresh = useCallback(async () => {
    if (!firebaseUser || !reference) {
      setLoading(false);
      return;
    }
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/app/citizen/subscriptions?ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not verify the subscription payment");
      setSubscription(result.subscription as Subscription);
      setPayment(result.payment as PaymentSnapshot);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify the subscription payment");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, reference]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (subscription?.status !== "PENDING") return;
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh, subscription?.status]);

  async function cancelPendingPayment() {
    if (!firebaseUser || !subscription) return;
    setCanceling(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/app/citizen/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscriptionId: subscription.id, reason: "Payment request cancelled by citizen" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not cancel this payment request");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel this payment request");
    } finally {
      setCanceling(false);
    }
  }

  const cancellationPending = payment?.cancellationPending === true;
  const confirmed = subscription?.status === "ACTIVE" && !cancellationPending;
  const waiting = subscription?.status === "PENDING" && !cancellationPending;

  return (
    <main className="mx-auto max-w-xl px-5 py-12 text-white">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Subscription payment</p>
        <h1 className="mt-3 text-2xl font-bold">
          {loading ? "Checking payment…" : confirmed ? "Payment confirmed" : cancellationPending ? "Cancellation in progress" : waiting ? "Waiting for confirmation" : "Subscription status"}
        </h1>

        {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        {!reference && <p className="mt-4 text-sm text-white/70">The payment reference is missing. Return to your subscription page and try again.</p>}
        {subscription && (
          <>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {confirmed
                ? "The payment hold is validated. Your subscription is active and service cycles have been scheduled."
                : cancellationPending
                  ? "We are closing the payment request and releasing any remaining funds. This page checks for updates automatically."
                  : waiting
                  ? "We have your payment request. Service starts only after the provider confirms the funds or authorization. This page checks for updates automatically."
                  : `Current subscription state: ${subscription.status.toLowerCase().replaceAll("_", " ")}.`}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-black/20 p-4 text-sm">
              <div><dt className="text-white/50">Payment state</dt><dd className="mt-1 font-medium">{payment?.status ?? "Unknown"}</dd></div>
              <div><dt className="text-white/50">Amount</dt><dd className="mt-1 font-medium">{(payment?.totalAmountMGA ?? subscription.amountMGA).toLocaleString()} MGA</dd></div>
              <div><dt className="text-white/50">Method</dt><dd className="mt-1 font-medium">{subscription.paymentMethod.replaceAll("_", " ")}</dd></div>
              <div><dt className="text-white/50">Service</dt><dd className="mt-1 font-medium">{confirmed ? "Scheduled" : "Not started"}</dd></div>
            </dl>
            {waiting && payment?.instructions && <p className="mt-4 text-sm text-white/70">{payment.instructions}</p>}
            {waiting && payment?.checkoutUrl && (
              <a href={payment.checkoutUrl} className="mt-4 block rounded-xl bg-cyan-600 px-4 py-3 text-center text-sm font-semibold text-white">
                Continue payment
              </a>
            )}
            {(waiting || cancellationPending) && (
              <button type="button" onClick={() => void cancelPendingPayment()} disabled={canceling} className="mt-3 w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 disabled:opacity-50">
                {canceling ? "Cancelling…" : cancellationPending ? "Retry cancellation" : "Cancel payment request"}
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => { setLoading(true); void refresh(); }}
          disabled={loading || !reference}
          className="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          Refresh status
        </button>
      </section>
    </main>
  );
}
