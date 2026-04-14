"use client";

import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, X, Home, Layers, Users, Map, Truck,
  BarChart3, FileText, LocateFixed 
} from "lucide-react";
import Link from "next/link";

export function PageNavigation() {
  const router = useRouter();
  return (
    <div className="mb-8 flex w-full items-center justify-between border-b border-blue-400/20 pb-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-white transition-colors">
        <ArrowLeft size={18} /> Back
      </button>
      <div className="flex gap-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-white transition-colors">
          <Home size={18} /> Home
        </Link>
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
          <X size={18} /> Exit
        </button>
      </div>
    </div>
  );
}

export default function RegionalDashboard() {
  const params = useParams();
  const regionId = params.regionId;

  const subRoutes = [
    { name: "Dashboard", icon: <Layers />, path: "dashboard", desc: "Regional Overview" },
    { name: "Metrics", icon: <BarChart3 />, path: "metrics", desc: "Aggregated Statistics" },
    { name: "Operators", icon: <Truck />, path: "operators", desc: "Multi-Zone Partners" },
    { name: "Reports", icon: <FileText />, path: "reports", desc: "Regional Analytics" },
    { name: "Zones", icon: <Map />, path: "zones", desc: "Inter-Communal Mapping" },
  ];

  return (
    <div className="flex flex-col items-center px-6 pb-20 pt-12 text-blue-50">
      <div className="w-full max-w-6xl">
        <PageNavigation />

        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            Regional Authority: {regionId}
          </h1>
          <p className="mt-4 text-lg text-blue-200 font-medium">Inter-Communal Coordination & Infrastructure</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {subRoutes.map((route) => (
            <Link 
              key={route.path} 
              href={`/authorities/regional/${regionId}/${route.path}`}
              className="glass-card flex flex-col items-center rounded-xl border border-blue-400/20 bg-blue-950/40 p-6 text-center backdrop-blur-md transition-all hover:bg-blue-900/50 hover:scale-105"
            >
              <div className="mb-4 text-blue-400">
                {route.icon}
              </div>
              <h3 className="text-lg font-bold text-white">{route.name}</h3>
              <p className="mt-2 text-xs text-blue-200/70">{route.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}