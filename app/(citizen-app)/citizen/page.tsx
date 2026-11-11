"use client";
import { useCitizenHome } from "@/hooks/useCitizenHome";
import CitizenHeader from "@/components/citizen/CitizenHeader";
import SubscriptionStatusCard from "@/components/citizen/SubscriptionStatusCard";
import ImpactTiles from "@/components/citizen/ImpactTiles";
import MyBinsGrid from "@/components/citizen/MyBinsGrid";
import RewardsBanner from "@/components/citizen/RewardsBanner";

export default function CitizenHomePage() {
  const { data, loading, error } = useCitizenHome();

  if (loading) return <div className="p-6 text-white/60">Loading…</div>;
  if (error)   return <div className="p-6 text-red-300">{error}</div>;
  if (!data)   return null;

  return (
    <div className="px-4 py-4 space-y-5">
      <CitizenHeader
        name={data.citizenName}
        communeName={data.communeName}
        fokontanyName={data.fokontanyName}
      />

      <SubscriptionStatusCard
        planTypeId={data.subscription.planTypeId}
        status={data.subscription.status}
        nextCollectionAt={data.subscription.nextCollectionAt}
        householdQrPayload={data.householdQrPayload}
      />

      <ImpactTiles
        recycledKgThisMonth={data.impact.recycledKgThisMonth}
        collectionsRemaining={data.subscription.collectionsRemaining}
        ecoPoints={data.impact.ecoPoints}
      />

      <MyBinsGrid bins={data.bins} compact />

      {data.rewards.pendingCompostKg > 0 && (
        <RewardsBanner pendingCompostKg={data.rewards.pendingCompostKg} />
      )}
    </div>
  );
}
