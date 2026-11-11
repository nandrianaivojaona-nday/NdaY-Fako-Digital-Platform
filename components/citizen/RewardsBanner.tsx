"use client";

export default function RewardsBanner({ pendingCompostKg }: { pendingCompostKg: number }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
      <p className="text-xs uppercase tracking-wider text-amber-300">Reward available</p>
      <p className="mt-1 text-lg font-semibold text-white">
        🎁 {pendingCompostKg} kg compost
      </p>
      <p className="text-sm text-white/70">
        Ready to claim at your commune. Bring your ID.
      </p>
      <a
        href="/citizen/rewards"
        className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
      >
        See details
      </a>
    </div>
  );
}
