"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import SubscriptionCard from "@/components/citizen/SubscriptionCard";
import type { Subscription } from "@/lib/domain/subscription/types";

export default function SubscriptionsPage() {
  const { firebaseUser } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!firebaseUser) return;
    const token = await firebaseUser.getIdToken();
    const res = await fetch("/api/app/citizen/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSub(data?.id ? data : null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [firebaseUser]);

  async function handleCancel() {
    if (!firebaseUser || !sub) return;
    const token = await firebaseUser.getIdToken();
    await fetch("/api/app/citizen/subscriptions/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscriptionId: sub.id }),
    });
    await load();
  }

  if (loading) return <p className="p-10 text-white">Loading…</p>;

  return (
    <main className="min-h-screen bg-[#0b1220] text-white px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">My Subscription</h1>
        {sub ? (
          <SubscriptionCard subscription={sub} onCancel={handleCancel} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/70">No active subscription.</p>
            <a
              href="/citizen/subscribe/BASIC"
              className="mt-4 inline-block rounded-full bg-cyan-600 px-6 py-2 font-semibold text-white hover:bg-cyan-500"
            >
              Subscribe Now
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

