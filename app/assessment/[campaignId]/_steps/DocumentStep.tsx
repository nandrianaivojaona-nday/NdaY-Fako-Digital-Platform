"use client";

import { AssessmentDraft, Campaign } from "@/types/campaign";

type Props = {
  draft: AssessmentDraft;
  campaign: Campaign | null;
  onGenerate: () => Promise<void>;
  onBack: () => Promise<void>;
};

export default function DocumentStep({ draft, onGenerate, onBack }: Props) {
  const doc = draft.generatedDocumentJson;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white uppercase tracking-widest">
        📄 Project Document
      </h2>

      {doc ? (
        <div className="space-y-4">
          <div className="card">
            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-2">
              Executive Summary
            </p>
            <p className="text-sm text-white/70 leading-6">{doc.executiveSummary}</p>
          </div>

          <div className="card grid grid-cols-2 gap-3">
            <ScoreItem label="Overall" value={doc.scores.overall} />
            <ScoreItem label="Bankability" value={doc.scores.bankability} />
            <ScoreItem label="Operability" value={doc.scores.operability} />
            <ScoreItem label="Demand" value={doc.scores.demand} />
          </div>

          <div className="card">
            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-2">
              Recommendation
            </p>
            <p className="text-sm text-white/70">{doc.recommendation}</p>
          </div>

          <div className="card">
            <p className="text-[10px] uppercase font-bold text-amber-400 tracking-widest mb-2">
              Risk Decision
            </p>
            <p className="text-sm font-bold text-white">{doc.risk.goDecision}</p>
            {doc.risk.topRisks.map((r, i) => (
              <p key={i} className="text-xs text-white/50 mt-1">• {r}</p>
            ))}
          </div>

          <div className="card">
            <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest mb-2">
              Offline Status
            </p>
            <p className="text-xs text-white/50">
              {doc.offline.syncState === "PENDING_SYNC"
                ? "💾 Saved locally · Pending sync"
                : doc.offline.syncState === "SYNCED"
                ? "✅ Synced"
                : "📱 Available offline"}
            </p>
          </div>

          <button onClick={onBack} className="w-full py-3 rounded-xl border border-white/10 text-[10px] uppercase font-black tracking-widest hover:bg-white/5 transition">
            ← Review Scores
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card text-center py-10 text-white/40 text-sm">
            <p className="text-4xl mb-4">📑</p>
            <p>Your comprehensive project document will be generated here based on your assessment inputs.</p>
            <p className="text-[10px] mt-2 uppercase tracking-widest opacity-50">Works fully offline</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={onBack} className="py-3 rounded-xl border border-white/10 text-[10px] uppercase font-black tracking-widest hover:bg-white/5 transition">
              ← Back
            </button>
            <button onClick={onGenerate} className="button py-3 text-[10px] font-black uppercase tracking-widest">
              Generate Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center bg-white/5 rounded-xl p-3">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[9px] uppercase font-bold opacity-40 tracking-widest mt-1">{label}</p>
    </div>
  );
}
