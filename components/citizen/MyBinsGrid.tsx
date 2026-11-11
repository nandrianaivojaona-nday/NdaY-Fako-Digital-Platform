"use client";
import Link from "next/link";

interface BinSummary {
  id: string;
  stream: string;
  status: string;
}

const STREAM_STYLE: Record<string, { emoji: string; tint: string }> = {
  ORGANIC:    { emoji: "🟢", tint: "bg-emerald-500/20" },
  RECYCLABLE: { emoji: "🟡", tint: "bg-amber-500/20" },
  PLASTIC:    { emoji: "🔴", tint: "bg-red-500/20" },
  GLASS:      { emoji: "⚪", tint: "bg-white/20" },
  METAL:      { emoji: "🟣", tint: "bg-purple-500/20" },
  CARBON:     { emoji: "⚫", tint: "bg-gray-700/40" },
};

export default function MyBinsGrid({
  bins,
  compact = false,
}: {
  bins: BinSummary[];
  compact?: boolean;
}) {
  if (bins.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/50">
        Your bins will appear here once your subscription is active.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white/80">My bins</h3>
        <Link href="/citizen/bins" className="text-xs text-cyan-300">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {bins.slice(0, compact ? 3 : 12).map((bin) => {
          const style = STREAM_STYLE[bin.stream] ?? STREAM_STYLE.ORGANIC;
          return (
            <Link
              key={bin.id}
              href={`/citizen/bins/${encodeURIComponent(bin.id)}`}
              className={`flex flex-col items-center justify-center rounded-2xl border border-white/10 ${style.tint} py-4`}
            >
              <span className="text-2xl">{style.emoji}</span>
              <span className="mt-1 text-xs text-white/70 capitalize">
                {bin.stream.toLowerCase()}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
