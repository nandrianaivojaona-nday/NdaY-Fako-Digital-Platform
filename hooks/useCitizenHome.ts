"use client";

import { useEffect, useState } from "react";

export interface CitizenHomeData {
  citizenName: string;
  communeName: string;
  fokontanyName: string;
  householdQrPayload: string;
  subscription: {
    planTypeId: string;
    status: string;
    nextCollectionAt: number | null;
    collectionsRemaining: number;
  };
  impact: { recycledKgThisMonth: number; ecoPoints: number };
  bins: Array<{ id: string; stream: string; status: string }>;
  rewards: { pendingCompostKg: number };
}

export function useCitizenHome() {
  const [data, setData] = useState<CitizenHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/app/citizen/home", { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load citizen dashboard");
        return result as CitizenHomeData;
      })
      .then((result) => { if (!cancelled) setData(result); })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load citizen dashboard");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
