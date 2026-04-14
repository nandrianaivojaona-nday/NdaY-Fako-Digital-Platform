"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, X, Home } from "lucide-react";
import Link from "next/link";

export function PageNavigation() {
  const router = useRouter();

  return (
    <div className="mb-8 flex w-full items-center justify-between border-b border-blue-400/10 pb-4">
      {/* Back Function */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-blue-300 transition-colors hover:text-white"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="flex gap-6">
        {/* Exit to Home */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-blue-300 transition-colors hover:text-white"
        >
          <Home size={18} />
          Home
        </Link>

        {/* Cancel/Exit State */}
        <button
          onClick={() => router.push('/')} // Or specific dashboard
          className="flex items-center gap-2 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
        >
          <X size={18} />
          Exit
        </button>
      </div>
    </div>
  );
}
import { Layers, Users, Map } from "lucide-react";

export default function RegionalAuthorityPage() {
  return (
    
    <div className="flex flex-col items-center px-6 pb-20 pt-12 text-blue-50">
      <div className="w-full max-w-6xl">
        {/* CRITICAL: Added the component call here */}
                <PageNavigation />
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            Regional Coordination
          </h1>
          <p className="mt-4 text-lg text-blue-200">Inter-Communal Waste Infrastructure Management</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="glass-card rounded-xl border border-blue-400/20 bg-blue-950/40 p-8 backdrop-blur-md transition-all hover:bg-blue-900/50">
            <div className="flex items-center gap-4 mb-6">
              <Layers className="text-blue-400" size={32} />
              <h2 className="text-2xl font-bold text-white">Infrastructure Oversight</h2>
            </div>
            <ul className="space-y-4 text-blue-100/90">
              <li>• Oversight of regional transfer stations and shared landfill sites.</li>
              <li>• Monitoring inter-communal waste transit logistics and fleet health.</li>
              <li>• Coordination of regional environmental health interventions.</li>
            </ul>
          </section>

          <section className="glass-card rounded-xl border border-blue-400/20 bg-blue-950/40 p-8 backdrop-blur-md transition-all hover:bg-blue-900/50">
            <div className="flex items-center gap-4 mb-6">
              <Users className="text-blue-400" size={32} />
              <h2 className="text-2xl font-bold text-white">Operator Licensing</h2>
            </div>
            <ul className="space-y-4 text-blue-100/90">
              <li>• Managing certifications for multi-zone waste operators.</li>
              <li>• Performance auditing of private partners within the regional jurisdiction.</li>
              <li>• Dispute resolution between neighboring communal service areas.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}