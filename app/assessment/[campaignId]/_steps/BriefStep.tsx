"use client";

import { AssessmentDraft, Campaign, CampaignBrief } from "@/types/campaign";

type Props = {
  campaign: Campaign | null;
  draft: AssessmentDraft;
  save: (partial: Partial<AssessmentDraft>) => Promise<void>; 
  onNext: () => Promise<void>;
};

export default function BriefStep({ campaign, draft, save, onNext }: Props) {
  const brief = draft.brief ?? { campaignId: draft.campaignId };

  async function handleNext() {
    const b: CampaignBrief = {
      campaignId: draft.campaignId,
      territoryDescription: campaign?.fokontany ?? "",
      collectionMode: "Door-to-door",
      routeType: "Circular",
      expectedDurationDays: 30,
      baselineAssumptions: "Standard pilot assumptions",
    };

    await save({ brief: b });
    await onNext();
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">📋 Campaign Brief</h2>
        <p className="text-sm text-white/70">
          Review the core campaign context before scoring demand, operability,
          bankability, and risk.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Row label="Campaign" value={campaign?.name ?? draft.campaignId} />
        <Row
          label="Territory"
          value={campaign?.fokontany ?? brief.territoryDescription ?? "—"}
        />
        <Row
          label="Collection mode"
          value={brief.collectionMode ?? "Door-to-door"}
        />
        <Row label="Route type" value={brief.routeType ?? "Circular"} />
        <Row
          label="Expected duration"
          value={`${brief.expectedDurationDays ?? 30} days`}
        />
        <Row
          label="Assumptions"
          value={brief.baselineAssumptions ?? "Standard pilot assumptions"}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleNext()}
          className="button rounded-xl bg-emerald-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
        >
          Confirm Brief → Next
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
