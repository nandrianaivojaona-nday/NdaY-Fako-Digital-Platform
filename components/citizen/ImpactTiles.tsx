"use client";

export default function ImpactTiles({
  recycledKgThisMonth,
  collectionsRemaining,
  ecoPoints,
}: {
  recycledKgThisMonth: number;
  collectionsRemaining: number;
  ecoPoints: number;
}) {
  const tiles = [
    { label: "Recycled", value: recycledKgThisMonth.toFixed(1), unit: "kg", tint: "emerald" },
    { label: "Collections left", value: String(collectionsRemaining), unit: "this cycle", tint: "cyan" },
    { label: "Éco-Points", value: String(ecoPoints), unit: "pts", tint: "amber" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"
        >
          <p className={`text-2xl font-bold ${
            t.tint === "emerald" ? "text-emerald-300"
            : t.tint === "amber" ? "text-amber-300"
            : "text-cyan-300"
          }`}>
            {t.value}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
            {t.unit}
          </p>
          <p className="text-xs text-white/60 mt-1">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
