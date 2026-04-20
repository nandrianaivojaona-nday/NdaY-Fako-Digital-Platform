"use client";

/**
 * ============================================================================
 * COMPONENT: MyClientComponent
 * PROJECT: NdaY-Fako Digital Platform
 * LOGIC: Restored Full Market Analysis & Governance Portals
 * ============================================================================
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    BookCheck, QrCode, Truck, BarChart3, Landmark, Building2,
    ScanLine, House, Recycle, Leaf, Coins, CheckCircle,
    ChartGantt, WeightIcon, HouseIcon, ShieldCheck, MapPinned,
    Zap, Activity, Info, Globe, Database, HardHat, Server, BookMarked
} from "lucide-react";

import Brand from "./Brand";
import CampaignTicker from "@/components/campaigns/CampaignTicker";
import CampaignFeed from "@/components/campaigns/CampaignFeed";

export default function MyClientComponent({
    initialOperators,
    globalImpact,
    campaigns,
    user: initialUser
}: any) {
    const router = useRouter();
    const [user] = useState(initialUser ?? null);
    const [selectedFokontany, setSelectedFokontany] = useState<string | null>(null);

    const activeCampaign = useMemo(() => {
        if (!selectedFokontany) return null;
        return campaigns?.find((c: any) => c.fokontany === selectedFokontany) || null;
    }, [campaigns, selectedFokontany]);

    const handleSelect = (name: string) => {
        setSelectedFokontany(name);
        setTimeout(() => {
            const mapSection = document.getElementById("map-section");
            if (mapSection) mapSection.scrollIntoView({ behavior: "smooth" });
        }, 50);
    };

    return (
        <div className="app-root">
            <div className="app-overlay">
                <div className="page-container">
                    
                    {/* TICKER & HEADER */}
                    <header className="header mb-16 relative">
                        <CampaignTicker campaigns={campaigns} onSelectFokontany={handleSelect} onSelectCampaign={handleSelect} />

                        {activeCampaign && (
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-90 bg-white border border-emerald-500/20 shadow-2xl rounded-2xl p-6 text-black animate-in fade-in zoom-in duration-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Fokontany Activity</div>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeCampaign.status === 'ONGOING' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {activeCampaign.status}
                                    </div>
                                </div>
                                <div className="text-xl font-extrabold mb-1 text-slate-900 leading-tight">{activeCampaign.name}</div>
                                <div className="text-xs text-slate-500 mb-4">{activeCampaign.municipality} • {activeCampaign.fokontany}</div>
                                <CampaignFeed campaigns={[activeCampaign]} />
                                <button onClick={() => setSelectedFokontany(null)} className="w-full mt-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Close Panel</button>
                            </div>
                        )}

                        <div className="flex justify-center mt-12 mb-8">
                            <button onClick={() => router.push(user ? "/dashboard" : "/auth/onboarding")} className="button scale-110">
                                {user ? "System Dashboard" : "Join NdaY’Fako"}
                            </button>
                        </div>

                        <h1 className="title drop-shadow-xl text-center">
                            <Brand suffix="Fako" size={88} />
                        </h1>
                        <p className="subtitle text-center text-2xl font-light tracking-[0.2em] uppercase mt-2">Digital Waste Management Ecosystem</p>
                    </header>

                    <main className="flex flex-col gap-24 mt-16">

                        {/* 1. GLOBAL IMPACT */}
                        <section className="section">
                            <div className="grid-3">
                                <div className="card impact-card group">
                                    <div className="card-head"><HouseIcon size={40} className="card-icon text-emerald-400" /><h3>Households</h3></div>
                                    <p className="title-stat text-5xl font-black">{globalImpact?.households ?? 0}</p>
                                </div>
                                <div className="card impact-card group">
                                    <div className="card-head"><WeightIcon size={40} className="card-icon text-emerald-400" /><h3>Kg</h3></div>
                                    <p className="title-stat text-5xl font-black">{globalImpact?.kg ?? 0}</p>
                                </div>
                                <div className="card impact-card group">
                                    <div className="card-head"><Coins size={40} className="card-icon text-emerald-400" /><h3>SOM</h3></div>
                                    <p className="title-stat text-5xl font-black">{globalImpact?.som ?? 0}%</p>
                                </div>
                            </div>
                        </section>

                        {/* 2. MARKET ANALYSIS & STRATEGIC PLANNING (FULL RESTORE) */}
                        <section className="section-block p-12 bg-white/3 border border-white/10 rounded-[40px]">
                            <h2 className="section-title text-center text-5xl font-black mb-20 tracking-tighter">
                                Market Analysis
                            </h2>
                            <div className="grid-3 gap-10">
                                
                                {/* A. TAM/SAM/SOM Logic */}
                                <div className="card relative group bg-emerald-950/20">
                                    <div className="card-head border-b border-white/5 pb-4 mb-4">
                                        <ChartGantt className="card-icon text-emerald-300" size={32} />
                                        <h3 className="text-2xl font-bold">TAM, SAM & SOM</h3>
                                    </div>
                                    <div className="card-details space-y-4 overflow-y-auto max-h-120 pr-2 custom-scrollbar">
                                        <h4 className="font-bold text-white border-b border-white/20 pb-1 text-sm">Market Sizing Protocol</h4>
                                        <ul className="space-y-4 text-xs opacity-70">
                                            <li><strong className="text-emerald-300 block uppercase">Total Addressable Market (TAM)</strong>The entire population within municipal boundaries requiring sanitation and waste removal services.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Serviceable Addressable Market (SAM)</strong>Territories reachable through current road infrastructure and accessible by collection fleets.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Serviceable Obtainable Market (SOM)</strong>The specific neighborhood segments where current equipment and crew capacity can maintain daily frequency.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* B. Territorial Staking */}
                                <div className="card relative group bg-emerald-950/20">
                                    <div className="card-head border-b border-white/5 pb-4 mb-4">
                                        <MapPinned className="card-icon text-emerald-300" size={32} />
                                        <h3 className="text-2xl font-bold">Territorial Staking</h3>
                                    </div>
                                    <div className="card-details space-y-4 overflow-y-auto max-h-120 pr-2 custom-scrollbar">
                                        <h4 className="font-bold text-white border-b border-white/20 pb-1 text-sm">Deployment Strategy</h4>
                                        <ul className="space-y-4 text-xs opacity-70">
                                            <li><strong className="text-emerald-300 block uppercase">Route Optimization</strong>Mapping high-density vs. low-density zones to maximize fuel and labor efficiency.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Asset Allocation</strong>Assigning tricycles to narrow lanes and heavy trucks to main arteries.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Sectorization</strong>Creating exclusive operational zones for waste operators to ensure 100% coverage.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* C. Market Growth Portals */}
                                <div className="card relative group bg-emerald-950/20">
                                    <div className="card-head border-b border-white/5 pb-4 mb-4">
                                        <Activity className="card-icon text-emerald-300" size={32} />
                                        <h3 className="text-2xl font-bold">Growth Portals</h3>
                                    </div>
                                    <div className="card-details space-y-4 overflow-y-auto max-h-120 pr-2 custom-scrollbar">
                                        <h4 className="font-bold text-white border-b border-white/20 pb-1 text-sm">Interactive Analysis Links</h4>
                                        <ul className="space-y-4 text-xs opacity-70">
                                            <li><Link href="/market/demographics" className="hover:text-emerald-400 font-bold block border-b border-white/10 pb-2">Population & Density Trends</Link></li>
                                            <li><Link href="/market/revenue" className="hover:text-emerald-400 font-bold block border-b border-white/10 pb-2">Subscription & Collection Yields</Link></li>
                                            <li><Link href="/market/competitors" className="hover:text-emerald-400 font-bold block border-b border-white/10 pb-2">Operator Performance & Benchmarks</Link></li>
                                            <li><Link href="/market/capacity" className="hover:text-emerald-400 font-bold block border-b border-white/10 pb-2">Tonnage Forecasts & Landfill Life</Link></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. PLATFORM INFRASTRUCTURE (RESTORED DETAILS) */}
                        <section className="section-block p-12 bg-white/3 border border-white/10 rounded-[40px]">
                            <h2 className="section-title text-center text-5xl font-black mb-20 tracking-tighter">
                                Platform Infrastructure
                            </h2>
                            <div className="grid-3 gap-10">
                                {/* QR Tracking */}
                                <div className="card relative group bg-emerald-950/20">
                                    <div className="card-head border-b border-white/5 pb-4 mb-4">
                                        <QrCode className="card-icon text-emerald-300" size={32} />
                                        <h3 className="text-2xl font-bold">QR Tracking & Assets</h3>
                                    </div>
                                    <div className="card-details space-y-4 overflow-y-auto max-h-120 pr-2 custom-scrollbar">
                                        <ul className="space-y-4 text-xs opacity-70">
                                            <li><strong className="text-emerald-300 block uppercase">Human Resources</strong>Badges for shift verification.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Smart Assets</strong>Bags/Bins tracked for segregation.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Proof-of-Service</strong>Audit trails for every pickup.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Logistics */}
                                <div className="card relative group bg-emerald-950/20">
                                    <div className="card-head border-b border-white/5 pb-4 mb-4">
                                        <Truck className="card-icon text-emerald-300" size={32} />
                                        <h3 className="text-2xl font-bold">Territorial Logistics</h3>
                                    </div>
                                    <div className="card-details space-y-4 overflow-y-auto max-h-120 pr-2 custom-scrollbar">
                                        <ul className="space-y-4 text-xs opacity-70">
                                            <li><strong className="text-emerald-300 block uppercase">Fleet GPS</strong>Real-time vehicle tracking.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Deposit Points</strong>Fill-level monitoring.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Lifecycle */}
                                <div className="card relative group bg-emerald-950/20">
                                    <div className="card-head border-b border-white/5 pb-4 mb-4">
                                        <ScanLine className="card-icon text-emerald-300" size={32} />
                                        <h3 className="text-2xl font-bold">Lifecycle Protocol</h3>
                                    </div>
                                    <div className="card-details space-y-4 overflow-y-auto max-h-120 pr-2 custom-scrollbar">
                                        <ul className="space-y-4 text-xs opacity-70">
                                            <li><strong className="text-emerald-300 block uppercase">Onboarding</strong>Digital address assignment.</li>
                                            <li><strong className="text-emerald-300 block uppercase">Transit</strong>Verified transport to dumping.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. ACTIVE OPERATORS */}
                        <section className="section">
                            <h2 className="text-4xl font-black text-center mb-12">Active Waste Operators</h2>
                            <div className="grid-3">
                                {initialOperators?.map((operator: any) => (
                                    <div key={operator.id} className="card border-white/10 hover:border-emerald-500/30 transition-all">
                                        <div className="card-head mb-4">
                                            <BookMarked size={28} className="text-emerald-400" />
                                            <h3 className="font-bold">{operator.name}</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-lg">
                                            <div className="text-center"><span className="block text-[10px] opacity-40">Hous.</span><span className="text-sm font-bold">{operator.impact?.households ?? 0}</span></div>
                                            <div className="text-center"><span className="block text-[10px] opacity-40">Kg</span><span className="text-sm font-bold">{operator.impact?.kg ?? 0}</span></div>
                                            <div className="text-center"><span className="block text-[10px] opacity-40">SOM</span><span className="text-sm font-bold text-emerald-400">{operator.impact?.som ?? 0}%</span></div>
                                        </div>
                                        <Link href={`/operators/${operator.id}`} className="button w-full mt-4 text-center">View Profile</Link>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </main>

                    <footer className="py-24 mt-24 border-t border-white/10 text-center relative overflow-hidden">
                        <Brand suffix="Ecosystem" size={32} />
                        <p className="text-base max-w-2xl mx-auto mt-8 opacity-40 italic">NdaY' Fako Circular economy initiative of NdaY' Individual Enterprise.</p>
                        <div className="mt-16 text-[10px] font-mono opacity-20">&copy; {new Date().getFullYear()} NdaY' – Madagascar</div>
                    </footer>
                </div>
            </div>
        </div>
    );
}