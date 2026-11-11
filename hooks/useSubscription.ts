"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import type { Subscription } from "@/lib/domain/subscription/types";

export function useSubscription() {
  const { firebaseUser } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!firebaseUser) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/app/citizen/subscriptions/me", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load subscription");
      setSubscription(result?.id ? result as Subscription : null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load subscription");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => { void refreshSubscription(); }, [refreshSubscription]);

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription: subscription?.status === "ACTIVE",
    subscriptionPlanId: subscription?.planTypeId ?? null,
    subscriptionStatus: subscription?.status ?? "NONE",
    subscriptionNextCollection: subscription?.nextCollectionDate ?? null,
    refreshSubscription,
  };
}
