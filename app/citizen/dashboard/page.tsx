"use client";

import Logo from "@/components/Logo";
import { QrCode, MapPin, Calendar, Leaf, History, CreditCard } from "lucide-react";

export default function CitizenDashboard() {
  const userStats = {
    name: "Jean Bureau",
    fokontany: "Ankadifotsy",
    sector: "Sector 2",
    plan: "Eco-Standard",
    nextPickup: "Tuesday, Aug 12",
    impactScore: 850,
    wasteCollected: "124 kg"
  };

  return (
    <div className="page-container pb-10">
      <header className="header">
        <div className="header-logo"><Logo /></div>
        <h1>My Citizen Portal</h1>
        <p className="subtitle">Tracking your contribution to a cleaner Commune</p>
      </header>

      <div className="grid-3">
        {/* --- QR IDENTIFICATION CARD --- */}
        <div className="card flex flex-col items-center justify-center border-teal-500/40 bg-teal-500/5">
          <h3 className="mb-4">Household QR ID</h3>
          <div className="bg-white p-4 rounded-xl shadow-2xl">
            <QrCode size={160} className="text-gray-900" />
          </div>
          <p className="mt-4 text-xs opacity-60 text-center">
            Show this to your collector or print and stick it on your bin.
          </p>
          <button className="button w-full mt-4 bg-white/10 border border-white/20">Download QR</button>
        </div>

        {/* --- SERVICE STATUS --- */}
        <div className="card space-y-4">
          <h3 className="flex items-center gap-2"><Calendar className="text-teal-400" /> Service Status</h3>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm opacity-60">Next Collection</p>
            <p className="text-xl font-bold">{userStats.nextPickup}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm opacity-60">Operator</p>
            <p className="font-semibold">GreenCity Logistics</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-white/5 rounded text-center">
              <p className="text-[10px] uppercase">Fokontany</p>
              <p className="text-sm">{userStats.fokontany}</p>
            </div>
            <div className="flex-1 p-2 bg-white/5 rounded text-center">
              <p className="text-[10px] uppercase">Sector</p>
              <p className="text-sm">{userStats.sector}</p>
            </div>
          </div>
        </div>

        {/* --- ENVIRONMENTAL IMPACT --- */}
        <div className="card bg-linear-to-br from-green-600/20 to-teal-600/20">
          <h3 className="flex items-center gap-2"><Leaf className="text-green-400" /> My Impact</h3>
          <div className="text-center py-6">
            <p className="text-4xl font-black text-white">{userStats.impactScore}</p>
            <p className="text-teal-300 font-bold uppercase tracking-widest text-xs">Eco-Points Earned</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm border-b border-white/10 pb-1">
              <span>Total Waste Recycled:</span>
              <span className="font-bold">{userStats.wasteCollected}</span>
            </div>
            <p className="text-[11px] opacity-70 italic text-center mt-2">
              You've prevented 45kg of CO2 emissions this month!
            </p>
          </div>
        </div>
      </div>

      {/* --- HISTORY LIST --- */}
      <section className="section mt-10">
        <h2 className="flex items-center gap-2"><History size={24} /> Recent Collections</h2>
        <div className="card mt-4 overflow-hidden p-0!">
          <table className="w-full text-left">
            <thead className="bg-white/10 text-xs uppercase text-teal-300">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Collector</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5">
                <td className="p-4">Aug 09, 08:45 AM</td>
                <td className="p-4">Andry R.</td>
                <td className="p-4"><span className="text-green-400 text-xs px-2 py-1 bg-green-400/10 rounded">Verified</span></td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="p-4">Aug 05, 09:12 AM</td>
                <td className="p-4">Andry R.</td>
                <td className="p-4"><span className="text-green-400 text-xs px-2 py-1 bg-green-400/10 rounded">Verified</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}