"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, X, Home, ShieldCheck, FileSpreadsheet, Globe } from "lucide-react";
import PageNavigation from "@/components/PageNavigation";


export default function NationalAuthorityPage() {
  return (
    <div className="flex flex-col items-center px-6 pb-20 pt-12 text-blue-50">
      <div className="w-full max-w-6xl">
        
        {/* CRITICAL: Added the component call here */}
        <PageNavigation />

        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            National Oversight Portal
          </h1>
          <p className="mt-4 text-lg text-blue-200">WASH & Environmental Policy Governance</p>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
          <section className="glass-card rounded-xl border border-blue-400/20 bg-blue-950/40 p-8 backdrop-blur-md transition-all hover:bg-blue-900/50">
            <ShieldCheck className="mb-4 text-blue-400" size={40} />
            <h2 className="mb-4 text-xl font-bold text-white">Policy Compliance</h2>
            <p className="text-sm text-blue-100/80">
              Monitor national adherence to environmental standards and legislative frameworks across all regions.
            </p>
          </section>

          <section className="glass-card rounded-xl border border-blue-400/20 bg-blue-950/40 p-8 backdrop-blur-md transition-all hover:bg-blue-900/50">
            <Globe className="mb-4 text-blue-400" size={40} />
            <h2 className="mb-4 text-xl font-bold text-white">SDG Reporting</h2>
            <p className="text-sm text-blue-100/80">
              Automated data aggregation for Sustainable Development Goals (SDG 6 and 12) reporting at the state level.
            </p>
          </section>

          <section className="glass-card rounded-xl border border-blue-400/20 bg-blue-950/40 p-8 backdrop-blur-md transition-all hover:bg-blue-900/50">
            <FileSpreadsheet className="mb-4 text-blue-400" size={40} />
            <h2 className="mb-4 text-xl font-bold text-white">Strategic Planning</h2>
            <p className="text-sm text-blue-100/80">
              Access nationwide data-driven insights to optimize resource allocation for the WASH sector budget.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}