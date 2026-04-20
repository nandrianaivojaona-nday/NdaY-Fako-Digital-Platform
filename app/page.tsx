"use client"

import { useState, useEffect } from "react"
// import fokontanyData from "@/seed/pilot/nday_fako_pilots.json"
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Brand from "../components/Brand";
import CampaignTicker from "@/components/campaigns/CampaignTicker";
import CampaignCard from "@/components/campaigns/CampaignCard";
import type { Operator } from "@/types/operator";
import {
  getPublicOperators,
  getGlobalImpact,
  getOperatorImpact,
  getCampaigns,
} from "@/lib/queries";
import Link from "next/link";
// 🔥 ICONS
import {
  Map,
  Users,
  WeightIcon,
  BookMarked,
  HouseIcon,
  CheckCircle,
  BookCheck,
  ChartGantt,
  Coins,
  Recycle,
  Truck,
  BarChart3,
  Globe,
  Leaf,
  House,
  Landmark,
  Building2,
  QrCode,
  ScanLine
} from "lucide-react"
import { ExtendedCampaign as Campaign } from "@/lib/types";

type GlobalImpact = {
  households: number;
  kg: number;
  som: number;
};

export default function Page() {

  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is logged in, redirect to their operator dashboard
    if (!loading && appUser) {
      // You might want to fetch the operator ID from your backend
      // For now, redirect to a generic dashboard or home
      router.push('/');
    }
  }, [appUser, loading, router]);

 // State declarations - FIXED: Added campaigns state
 const [campaigns, setCampaigns] = useState<Campaign[]>([]);
 const [campaignsState] = useState<Campaign[]>([]);
 const [selectedFokontany, setSelectedFokontany] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [globalImpact, setGlobalImpact] = useState<GlobalImpact>({
    households: 0,
    kg: 0,
    som: 0,
  });
  const [operators, setOperators] = useState<Operator[]>([]);
  

  useEffect(() => {
    async function loadData() {
      const gi = await getGlobalImpact();
      const ops = await getPublicOperators();
      setGlobalImpact(gi);
      setOperators(ops);
    }
    loadData();
  }, []);

  // In your component, replace the mock data with real data
useEffect(() => {
  async function loadCampaigns() {
    const campaigns = await getCampaigns();
    setCampaigns(campaigns);
  }
  loadCampaigns();
}, []);

  


  // load Data from FireStore

  useEffect(() => {
    async function loadData() {
      // don't fetch while auth is loading to avoid unnecessary calls
      if (loading) return;
      try {
      const [gi, ops, cams] = await Promise.all([
        getGlobalImpact(),
        getPublicOperators(),
        getCampaigns()
      ]);
      setGlobalImpact(gi);
      setOperators(ops);
      setCampaigns(cams as Campaign[]);
    } catch (error) {
      console.error("Failed to load public data:", error);
      // Optionally show a toast notification to the user
    }
  }
    loadData();
  }, []);

  // Operator Card Component - fetches its own impact data

  function OperatorCard({ operator }: { operator: Operator }) {
    const [impact, setImpact] = useState<any>(null);

    useEffect(() => {
      async function loadImpact() {
        const data = await getOperatorImpact(operator.id);
        setImpact(data);
      }
      loadImpact();
    }, [operator.id]);

    if (!impact) return <div className="card">Loading...</div>;

    return (
      <div className="card">
        <h3>{operator.name}</h3>
        <p>{operator.city}</p>
        <p>{operator.type}</p>
        <p>Households: {impact.households}</p>
        <p>Kg: {impact.kg}</p>
        <p>SOM: {impact.som}%</p>
        <a href={`/operator/${operator.id}`} className="button">
          View
        </a>
      </div>
    );
  }


  return (
    <div className="h-screen overflow-hidden">
      <div className="app-root h-full">
        <div className="app-overlay h-full flex flex-col">

          {/* FIXED HEADER SECTION - NEVER SCROLLS */}
          <div className="flex-shrink-0 z-50">
            {/* Campaign Ticker */}
            <div className="fixed top-0 left-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10{Cam">
              <CampaignTicker
                campaigns={campaigns}
                onSelectCampaign={(id: string) => {
                  const found = campaigns.find(c => c.id === id);
                  setSelectedCampaign(found || null);
                }}
                onSelectFokontany={setSelectedFokontany}
              />
            </div>

            {/* Main Header - Fixed below ticker */}
            <div className="fixed top-[72px] left-0 w-full z-40 bg-black/20 backdrop-blur-md border-b border-white/10">
              <header className="px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  {/* LEFT — Brand */}
                  <div className="shrink-0">
                    <Brand suffix="Fako Ecosystem" size={28} />
                  </div>

                  {/* CENTER — Text */}
                  <div className="flex-1 text-center px-4 text-white">
                    <h1 className="text-3xl font-bold mb-1">
                      Digital Waste Infrastructure for Madagascar
                    </h1>
                    <p className="opacity-80 text-sm">
                      From household collection to circular economy — fully traceable, measurable, and scalable.
                    </p>
                  </div>

                  {/* RIGHT — Join Button */}
                  <div className="shrink-0">
                    <a href="/join" className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors">
                      Join
                    </a>
                  </div>
                </div>
              </header>
            </div>
          </div>

          {/* 🔥 ADD THIS: The Selected Campaign Overlay */}
          {selectedCampaign && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setSelectedCampaign(null)} // Close when clicking backdrop
            >
              <div
                className="relative max-w-xl w-full"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the card itself
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  Close ✕
                </button>

                {/* Render the CampaignCard */}
                <CampaignCard
                  campaign={selectedCampaign}
                  isExpanded={true}
                  onAssess={(campaign) => {
                    router.push(`/assessment/${campaign.id}`);
                  }}
                />

              </div>
            </div>
          )}

          {/* SCROLLABLE MAIN CONTENT - This is the ONLY thing that scrolls */}
          <main className="flex-1 overflow-y-auto mt-[136px] mb-16">
            <div className="max-w-7xl mx-auto px-6">

              {/* ========================= */}
              {/* PLATFORM CORE */}
              {/* ========================= */}
              <section className="section">
                <h2 className="section-title text-center mb-8">
                  <Brand suffix="Platform Core" size={28} />
                </h2>

                <div className="grid-3">
                  {/* 1. QR Tracking & Assets */}
                  <div className="card group">
                    <QrCode className="card-icon" />
                    <h3>QR Infrastructure</h3>
                    <p>Digital Identity & traceability</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Asset & Personnel Management
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">Human Resources & EPIs</strong>
                          QR codes embedded on collector badges, uniforms, and personal protective equipment (EPIs) for shift verification.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Smart Logistics Assets</strong>
                          Scannable colored bins and colored bags (where applicable) to enforce and track proper waste segregation at the source.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Digital Proof-of-Service</strong>
                          QR-based verification at every point of the waste collection and disposal process, creating a transparent audit trail for operators and municipalities.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Subscriber security and safety</strong>
                          The QR system enhances safety by ensuring that only authorized personnel are performing waste collection tasks, reducing the risk of intrusions/accidents and improving overall service quality.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Offline Functionality</strong>
                          All QR scanning functionalities are designed to work offline, ensuring uninterrupted service in areas with limited connectivity. Data syncs automatically when a connection is available.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Integration with Existing Systems</strong>
                          The QR tracking system can be integrated with existing fleet management or ERP software used by operators, allowing for seamless data exchange and minimizing disruption to current workflows.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Scalability & Customization</strong>
                          The QR system can be scaled to accommodate additional asset types (e.g., transfer stations, landfill equipment) and customized to include specific data fields relevant to different municipalities or operators.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Data Analytics & Reporting</strong>
                          The QR tracking data feeds into analytics dashboards that provide insights on collection efficiency, route optimization, and service compliance, enabling data-driven decision-making for operators and municipal authorities.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 2. Territorial Logistics */}
                  <div className="card group">
                    <Truck className="card-icon" />
                    <h3>Territorial Logistics</h3>
                    <p>Fleet & routing</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Fleet & Infrastructure Tracking
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">Fleets & Vehicles</strong>
                          GPS and capacity tracking for collection fleet (brouettes, trucks, tricycles, or transfer vehicles).
                        </li>
                        <li>
                          <strong className="text-green-200 block">Fokontany Deposits</strong>
                          Monitoring fill-levels and maintenance of local territorial waste containers assigned per Fokontany.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Communal Dumpings</strong>
                          Management of final discharge weights, transfer stations, and landfill logistics at the Commune level.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 3. End-to-End Monitoring */}
                  <div className="card group">
                    <ScanLine className="card-icon" />
                    <h3>Lifecycle Monitoring</h3>
                    <p>End-to-end tracking</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Complete Traceability
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">1. Subscription</strong>
                          Citizen onboarding, fee tracking, and service assignment to operators.
                        </li>
                        <li>
                          <strong className="text-green-200 block">2. Collection</strong>
                          Real-time QR scans at household pickup verifying time and location (GPS ensures security).
                        </li>
                        <li>
                          <strong className="text-green-200 block">3. Transit</strong>
                          Fleet tracking from neighborhood collection routes to consolidation points.
                        </li>
                        <li>
                          <strong className="text-green-200 block">4. Final Dumping</strong>
                          Verified weight logs and authorized disposal at the communal dumping site.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 4. Impact & Sorting Data */}
                  <div className="card relative group">
                    <div className="card-head">
                      <BarChart3 className="card-icon" size={28} />
                      <h3>Impact & Sorting Data</h3>
                    </div>
                    <p>Business indicators and environmental yields</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Business & Circular Impact
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">Service Operating Margin (SOM)</strong>
                          A core business indicator tracking the financial sustainability and profitability of waste collection operations.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Market Reach & Penetration</strong>
                          Analyzing the Serviceable Obtainable Market to measure actual versus potential household coverage in each sector.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Sorting Yield Benefits</strong>
                          Quantifying how source-segregated waste increases the value of recyclables and reduces operational costs for the circular economy.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Environmental Benchmarks</strong>
                          Tracking total tonnage (Kg) and organic recovery rates to validate national environmental reporting.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 5. Territorial Authorities */}
                  <div className="card relative group">
                    <div className="card-head">
                      <Landmark className="card-icon" size={28} />
                      <h3>Territorial Authorities</h3>
                    </div>
                    <p>Multi-level governance and oversight</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Governance Portals
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <Link href="/authorities/national" className="flex items-center hover:text-green-300 transition-colors">
                            <strong className="text-green-200 mr-2">National:</strong> Policy, SDGs & Wash Oversight
                          </Link>
                        </li>
                        <li>
                          <Link href="/authorities/regional" className="flex items-center hover:text-green-300 transition-colors">
                            <strong className="text-green-200 mr-2">Regional:</strong> Inter-communal Coordination
                          </Link>
                        </li>
                        <li>
                          <Link href="/authorities/municipality" className="flex items-center hover:text-green-300 transition-colors">
                            <strong className="text-green-200 mr-2">Commune:</strong> Urban Monitoring & Dumping
                          </Link>
                        </li>
                        <li>
                          <Link href="/authorities/fokontany" className="flex items-center hover:text-green-300 transition-colors">
                            <strong className="text-green-200 mr-2">Fokontany:</strong> Local Containers & Citizens
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* ========================= */}
              {/* ECOSYSTEM */}
              {/* ========================= */}
              <section className="section">
                <h2 className="text-center mb-8">
                  <Brand suffix="Ecosystem Actors" size={28} />
                </h2>

                <div className="grid-3">
                  <div className="card">
                    <div className="card-head">
                      <Landmark className="card-icon" size={28} />
                      <h3>National Authorities</h3>
                    </div>
                    <p>Policy & Oversight</p>
                    <div className="card-details">
                      <h4>WASH & Environment Oversight</h4>
                      <ul>
                        <li>• <strong>Compliance Tracking:</strong> Monitor adherence to national environmental standards and waste disposal laws.</li>
                        <li>• <strong>SDG Reporting:</strong> Auto-generate data for Sustainable Development Goals (SDG 6 and 12).</li>
                        <li>• <strong>Public Health Alerts:</strong> Track waste-related health risks to trigger sanitation interventions.</li>
                        <li>• <strong>Resource Allocation:</strong> Data-driven insights for national budget planning in the WASH sector.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <Building2 className="card-icon" size={28} />
                      <h3>Municipalities</h3>
                    </div>
                    <p>Urban monitoring</p>
                    <div className="card-details">
                      <h4>Core Functionalities</h4>
                      <ul>
                        <li>• Real-time heatmaps</li>
                        <li>• Route optimization</li>
                        <li>• Penalty management</li>
                        <li>• Citizen feedback loop</li>
                      </ul>
                    </div>
                  </div>

                  <Link href="/operator" className="card">
                    <div className="card-head">
                      <Truck className="card-icon" size={28} />
                      <Coins className="card-icon" size={28} />
                      <h3>Waste Operators</h3>
                    </div>
                    <p>Collection programs & Logistics</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Operator Core Functions @ Onboarding
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">Fleet & Route Management</strong>
                          Assign collectors to specific zones and track truck GPS/movement in real-time.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Digital Verification</strong>
                          Move from paper logs to QR-based verification for every household pickup.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Automated Billing</strong>
                          Sync collection data with payment records to track service fee compliance.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Performance Analytics</strong>
                          Access dashboards showing daily tonnage, missed pickups, and fuel efficiency.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Flexible Integration</strong>
                          Download the NdaY' Operator App or connect your existing fleet software via our secure API.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Territory Mapping</strong>
                          Manage collection rights across specific Communes, Fokontany, or individual Sectors.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Verification Logs</strong>
                          Daily digital "proof-of-service" reports required for municipal performance payments.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Equipment Tracking</strong>
                          Register trucks and bins to specific geographic sectors for optimized logistics.
                        </li>
                      </ul>
                    </div>
                  </Link>

                  <div className="card">
                    <div className="card-head">
                      <Leaf className="card-icon" size={28} />
                      <Coins className="card-icon" size={28} />
                      <h3>Collectors</h3>
                    </div>
                    <p>Field QR Identification & pickup</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Collector Functionalities
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">QR Identification</strong>
                          Each collector is issued a unique QR ID linked to their assigned Fokontany or Sector.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Point-of-Collection Scan</strong>
                          Instant verification of household pickups by scanning bin QR codes (Offline-first support).
                        </li>
                        <li>
                          <strong className="text-green-200 block">Sector Performance</strong>
                          Compare collection rates between different Sectors to identify underserved areas.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Incident Reporting</strong>
                          Report illegal dumping or broken bins immediately via the NdaY' Mobile App.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <House className="card-icon" size={28} />
                      <h3>Citizens</h3>
                    </div>
                    <p>Subscription, Sorting & Requests</p>
                    <div className="card-details">
                      <h4 className="mb-2 font-bold text-white border-b border-white/20 pb-1">
                        Citizen Journey
                      </h4>
                      <ul className="space-y-3">
                        <li>
                          <strong className="text-green-200 block">Digital Subscription</strong>
                          Register via the NdaY' Web/Mobile portal by selecting your Commune, Fokontany, and Sector to be matched with an authorized operator.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Unique Household QR</strong>
                          Receive a unique QR code for your bin or doorway. This is your "Digital Address" for all waste-related services.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Pickup Verification</strong>
                          Get real-time notifications when your waste is collected, ensuring transparency in service fee payments.
                        </li>
                        <li>
                          <strong className="text-green-200 block">Impact & Rewards</strong>
                          Track your "Environmental Score" based on sorting habits and earn "Green Credits" for proper recycling.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <Recycle className="card-icon" size={28} />
                      <h3>Recycling Sector</h3>
                    </div>
                    <p>Circular economy</p>
                  </div>
                </div>
              </section>

              {/* ========================= */}
              {/* FLOW */}
              {/* ========================= */}
              <section className="section">
                <h2 className="text-center mb-8">
                  <Brand suffix="Operational Flow" size={28} />
                </h2>

                <div className="grid-3">
                  <a href="/citizen" className="card link-card">
                    <div className="card-head">
                      <House className="card-icon" size={28} />
                    </div>
                    Citizen subscribes
                  </a>

                  <div className="card">
                    <Truck className="card-icon" size={28} />
                    Operator manages
                  </div>

                  <div className="card">
                    <ScanLine className="card-icon" size={28} />
                    Collector scans QR
                  </div>

                  <div className="card">
                    <CheckCircle className="card-icon" size={28} />
                    <Truck className="card-icon" size={28} />
                    Pickup verified
                  </div>

                  <div className="card">
                    <Recycle className="card-icon" size={28} />
                    <BookCheck className="card-icon" size={28} />
                    Waste recycled
                  </div>

                  <div className="card">
                    <ChartGantt className="card-icon" size={28} />
                    Impact reported
                  </div>
                </div>
              </section>

              {/* ========================= */}
              {/* IMPACT */}
              {/* ========================= */}
              <section className="section">
                <h2 className="text-center mb-8">
                  <Brand suffix="Impact: Environmental Monitoring & Reporting" size={28} />
                </h2>

                <div className="grid-3">
                  <div className="card impact-card">
                    <strong>{globalImpact.households.toLocaleString()}</strong>
                    <HouseIcon className="card-icon" size={28} />
                    <p>Households served</p>
                  </div>

                  <div className="card">
                    <strong>{globalImpact.kg.toLocaleString()}</strong>
                    <WeightIcon className="card-icon" size={28} />
                    <p>Kg collected</p>
                  </div>

                  <div className="card">
                    <strong>{globalImpact.som}%</strong>
                    <BookMarked className="card-icon" size={28} />
                    <p>SOM</p>
                  </div>
                </div>
              </section>

              {/* ========================= */}
              {/* OPERATORS */}
              {/* ========================= */}
              <section className="section">
                <h2 className="text-center mb-8">
                  <Brand suffix="Operators Network" size={28} />
                </h2>

                <div className="grid-3">
                  {operators.map((op) => (
                    <OperatorCard key={op.id} operator={op} />
                  ))}
                </div>
              </section>

              {/* ========================= */}
              {/* CIRCULAR ECONOMY */}
              {/* ========================= */}
              <section className="section pb-24">
                <h2 className="text-center mb-8">
                  <Brand suffix="Circular Economy" size={28} />
                </h2>

                <div className="grid-3 flow-grid">
                  <div className="card">
                    <img src="/assets/images/plastic-recycling.png" className="h-10 w-10 mb-2" alt="Plastic recycling" />
                    Plastic recycling
                  </div>
                  <div className="card">
                    <img src="/assets/images/compost.png" className="h-10 w-10 mb-2" alt="Compost" />
                    Compost
                  </div>
                  <div className="card">
                    <img src="/assets/images/circular-economy.png" className="h-10 w-10 mb-2" alt="Circular economy" />
                    Circular economy
                  </div>
                  <div className="card">
                    <img src="/assets/images/carbon-credit.png" className="h-10 w-10 mb-2" alt="Carbon credits" />
                    Carbon credits
                  </div>
                </div>
              </section>
            </div>
          </main>

          {/* FIXED FOOTER - NEVER SCROLLS */}
          <footer className="fixed bottom-0 left-0 w-full z-50 bg-black/40 backdrop-blur-md border-t border-white/10 py-4">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm opacity-80">
                  © {new Date().getFullYear()} NdaY'Fako — Digital Waste Ecosystem — Madagascar
                </p>

                {/* Optional: Social Links or Additional Info */}
                <div className="flex gap-6 text-sm opacity-70">
                  <a href="/privacy" className="hover:opacity-100 transition-opacity">Privacy</a>
                  <a href="/terms" className="hover:opacity-100 transition-opacity">Terms</a>
                  <a href="/contact" className="hover:opacity-100 transition-opacity">Contact</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}