"use client";

export default function CitizenHeader({
  name,
  communeName,
  fokontanyName,
}: {
  name: string;
  communeName: string;
  fokontanyName: string;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Salama" : hour < 18 ? "Tonga soa" : "Salama tompoko";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        {greeting}, {name.split(" ")[0]} 👋
      </h1>
      <p className="text-sm text-white/60">
        {communeName} · {fokontanyName}
      </p>
    </div>
  );
}
