"use client"; // Critical: enables hooks and browser APIs

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
    BookCheck, QrCode, Truck, BarChart3, Landmark, Building2,
    ScanLine, House, Recycle, Leaf, Coins, CheckCircle,
    ChartGantt, WeightIcon, HouseIcon, BookMarked
} from "lucide-react";

import Logo from "./Logo";
import Brand from "./Brand";
import CampaignTicker from "@/components/campaigns/CampaignTicker";
import CampaignFeed from "@/components/campaigns/CampaignFeed";
import CampaignMap from "@/components/map/CampaignMap";
import { geoJson } from "leaflet";

export default function MyClientComponent({
    initialOperators,
    globalImpact,
    campaigns
}: any) {
    // Use hooks here
    const [selectedFokontany, setSelectedFokontany] = useState<string | null>(null);
    const selectedCampaign = campaigns.find(
        (c: any) => c.fokontany === selectedFokontany
    );
    const setSelectedCampaign = (campaign: any) => {
        // Function implementation can be added here if needed
    };

    const handleSelect = (name: string) => {
        setSelectedCampaign(campaigns.find((c: any) => c.fokontany === name) || null);
        setSelectedFokontany(name);
        setTimeout(() => {
            // Scroll to map safely in the browser
            const mapSection = document.getElementById("map-section");
            if (mapSection) {
                mapSection.scrollIntoView({ behavior: "smooth" });
            }
        }, 50);
    };

    const mapRef = useRef<HTMLDivElement | null>(null);
    // This safely filters out null/undefined features before passing them to the map
    const fokontanyFeatures = campaigns
        .map((c: any) => c.fokontanyFeature)
        .filter(Boolean);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                mapRef.current &&
                !mapRef.current.contains(event.target as Node)
            ) {
                // 👇 Close the map
                setSelectedCampaign(null);
                setSelectedFokontany(null);
            }
        }

        if (selectedCampaign) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedCampaign]);

    return (

        <div className="page-container">
            {/* Ticker like News */}
            <CampaignTicker campaigns={campaigns} onSelectFokontany={handleSelect} />

            <header className="header">
                <Brand suffix="Fako Digital Waste Management Ecosystem" size={30} />
                <p className="subtitle">Waste collection and recycling management platform</p>
            </header>


            {selectedCampaign && (
                <section id="map-section" className="section">
                    <div className="header">
                        <h2>🗺️ Campaign Map (Pilot SOM)</h2>
                        <p className="subtitle">
                            Focused on {selectedCampaign.fokontany}
                        </p>
                    </div>

                    <div className="section-block">
                        <CampaignMap
                            fokontanyFeatures={fokontanyFeatures}
                            selectedFokontany={selectedFokontany}
                        />

                    </div>

                    <div style={{ height: "20px" }} />

                    <div className="section-block">
                        <CampaignFeed
                            campaigns={campaigns}
                        // selectedFokontany={selectedFokontany}
                        />

                    </div>
                </section>
            )}

            {/* =----------------------------------------------------------------
                // GLOBAL Impact
                // =-----------------------------------------------------------------===*/}

            <section className="section">
                <div className="header"><h2>Global Impact</h2></div>
                <div className="grid-3">
                    <div className="card impact-card">
                        <div className="card-head"><HouseIcon size={28} className="card-icon" /><h3>Households served</h3></div>
                        <p className="title-stat">{globalImpact?.households ?? 0}</p>
                    </div>
                    <div className="card impact-card">
                        <div className="card-head"><WeightIcon size={28} className="card-icon" /><h3>Kg collected</h3></div>
                        <p className="title-stat">{globalImpact?.kg ?? 0}</p>
                    </div>
                    <div className="card impact-card">
                        <div className="card-head"><Coins size={28} className="card-icon" /><h3>SOM</h3></div>
                        <p className="title-stat">{globalImpact?.som ?? 0}%</p>
                    </div>
                </div>
            </section>

            {/* =----------------------------------------------------------------
                // Ecosystem
                // =-----------------------------------------------------------------===*/}




            {/* ========================= */}
            {/* PLATFORM */}
            {/* ========================= */}

            <section className="section-block">
                <h2 className="section-title">
                    <Brand suffix="Fako Platform" size={32} />
                </h2>

                <div className="grid-3">

                    {/* 1. QR Tracking & Assets */}
                    <div className="card relative group">
                        <div className="card-head">
                            <QrCode className="card-icon" size={28} />
                            <h3>QR Tracking & Assets</h3>
                        </div>
                        <p>Digital IDs for personnel and equipment</p>

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
                    <div className="card relative group">
                        <div className="card-head">
                            <Truck className="card-icon" size={28} />
                            <h3>Territorial Logistics</h3>
                        </div>
                        <p>Geographic waste flow management</p>

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
                    <div className="card relative group">
                        <div className="card-head">
                            <ScanLine className="card-icon" size={28} />
                            <h3>Lifecycle Monitoring</h3>
                        </div>
                        <p>Complete flow from subscription to dumping</p>

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

                <h2>Ecosystem Actors</h2>

                <div className="grid-3">

                    <div className="card">
                        <div className="card-head">
                            <Landmark className="card-icon" size={28} />
                            <h3>National Authorities</h3>
                        </div>
                        <p>Policy & Overshit</p>
                        {/* Hover Details */}
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
                        {/* NEW HOVER SECTION */}
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
                        {/* Hover Details */}
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

            {/* --------------------------------------------------------------
                How the system works section - can be added back in later if needed, but may be redundant with the CampaignTicker and CampaignFeed sections above
                -----------------------------------------------------------------*/}


            <section className="section">
                <div className="header">
                    <h2>How the system works</h2>
                </div>

                <div className="grid-3">
                    <div className="card">
                        <div className="card-head">
                            <BookCheck size={30} className="card-icon" />
                            <h3>Campaigns & Service Launch</h3>
                        </div>
                        <p>
                            Waste collection campaigns help validate local demand, organize service readiness, and prepare operators to launch in realistic territories.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Community and business demand validation</li>
                                <li><CheckCircle size={16} /> Operator readiness and launch preparation</li>
                                <li><CheckCircle size={16} /> Initial service planning by territory</li>
                                <li><CheckCircle size={16} /> Transition from campaign to active operations</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <QrCode size={30} className="card-icon" />
                            <h3>Field QR Identification & Pickup</h3>
                        </div>
                        <p>
                            Once service starts, households, bins, staff, and pickup points are identified and tracked directly in the field.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> QR-based identification of service points and assets</li>
                                <li><CheckCircle size={16} /> Pickup confirmation at each stop</li>
                                <li><CheckCircle size={16} /> Real-time verification of field activity</li>
                                <li><CheckCircle size={16} /> Stronger service traceability and proof of work</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <Truck size={30} className="card-icon" />
                            <h3>Collection Programs & Logistics</h3>
                        </div>
                        <p>
                            Operators execute routes, coordinate logistics, and move waste from pickup points to transfer, recovery, or disposal sites.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Route planning and shift organization</li>
                                <li><CheckCircle size={16} /> Crew and vehicle coordination</li>
                                <li><CheckCircle size={16} /> Waste flow management from source to destination</li>
                                <li><CheckCircle size={16} /> Reliable service execution across assigned zones</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/*} ===----------------------------------------------------------------
                // MARKET Analysis
                // =-----------------------------------------------------------------===*/}

            <section className="section">
                <div className="header">
                    <h2>Market Analysis</h2>
                    <p className="subtitle">
                        Helping operators understand where to launch, what to stake, and what they can realistically serve.
                    </p>
                </div>

                <div className="grid-3">
                    <div className="card">
                        <div className="card-head">
                            <ChartGantt size={30} className="card-icon" />
                            <h3>TAM, SAM & SOM</h3>
                        </div>
                        <p>
                            Market analysis narrows the full waste-generation opportunity into the exact territory an operator can realistically obtain and serve.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> TAM: all households, businesses, and institutions generating waste</li>
                                <li><CheckCircle size={16} /> SAM: reachable neighborhoods with workable access and service conditions</li>
                                <li><CheckCircle size={16} /> SOM: the exact obtainable territory current crews and equipment can fulfill</li>
                                <li><CheckCircle size={16} /> Territory selection aligned with practical operating capacity</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <House size={30} className="card-icon" />
                            <h3>Where Operators Should Stake</h3>
                        </div>
                        <p>
                            Operators should stake only the zones where they can maintain collection quality, route efficiency, and promised service frequency.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Prioritize high-density and high-yield service areas</li>
                                <li><CheckCircle size={16} /> Focus on streets that fit one shift and disposal turnaround</li>
                                <li><CheckCircle size={16} /> Avoid expanding into zones that weaken current performance</li>
                                <li><CheckCircle size={16} /> Match operator territory to real service commitments</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <WeightIcon size={30} className="card-icon" />
                            <h3>Capacity-Based Limits</h3>
                        </div>
                        <p>
                            The obtainable market is defined by tonnage, route time, fuel, crew size, and the frequency the operator can actually sustain.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Tonnage per route and vehicle capacity limits</li>
                                <li><CheckCircle size={16} /> Pickup density and yield per kilometer</li>
                                <li><CheckCircle size={16} /> Cycle time from first pickup to final offloading</li>
                                <li><CheckCircle size={16} /> Service frequency as the final test of obtainable coverage</li>
                            </ul>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head">
                            <HouseIcon size={30} className="card-icon" />
                            <h3>Example Territory Stake</h3>
                        </div>
                        <p>
                            A citywide market may be large, but the real operator stake is only the part that current crews can serve consistently within route and disposal limits.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> TAM can cover the whole city waste opportunity</li>
                                <li><CheckCircle size={16} /> SAM can narrow to one permitted and reachable zone</li>
                                <li><CheckCircle size={16} /> SOM can narrow further to the streets one crew can serve reliably</li>
                                <li><CheckCircle size={16} /> Stake size grows only when capacity and service quality also grow</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </section>

            <section className="section">
                <div className="header">
                    <h2>Environmental Monitoring & Reporting</h2>
                </div>

                <div className="grid-3">
                    <div className="card">
                        <div className="card-head">
                            <BarChart3 size={30} className="card-icon" />
                            <h3>Business indicators and environmental yields</h3>
                        </div>
                        <p>
                            Measure collection performance, recovery output, and environmental value created across operators and territories.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Track operational KPIs by zone and operator</li>
                                <li><CheckCircle size={16} /> Measure recovered waste and diversion performance</li>
                                <li><CheckCircle size={16} /> Monitor environmental and business yields</li>
                                <li><CheckCircle size={16} /> Provide evidence for decisions, reporting, and funding</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <Landmark size={30} className="card-icon" />
                            <h3>Multi-level governance and oversight</h3>
                        </div>
                        <p>
                            Give municipalities, partners, and regulators a shared view of what is happening across the service chain.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Monitor operators across multiple administrative levels</li>
                                <li><CheckCircle size={16} /> Validate service execution and compliance</li>
                                <li><CheckCircle size={16} /> Share trusted data with public and institutional stakeholders</li>
                                <li><CheckCircle size={16} /> Improve transparency and accountability</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <Building2 size={30} className="card-icon" />
                            <h3>Policy & Oversight</h3>
                        </div>
                        <p>
                            Turn field data into planning intelligence for regulation, expansion, and long-term waste management policy.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Support policy decisions with verified field data</li>
                                <li><CheckCircle size={16} /> Guide planning for service expansion and infrastructure</li>
                                <li><CheckCircle size={16} /> Strengthen oversight and policy enforcement</li>
                                <li><CheckCircle size={16} /> Build institutional reporting and strategic visibility</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="header">
                    <h2>Waste Processing & Recycling</h2>
                </div>

                <div className="grid-3">
                    <div className="card">
                        <div className="card-head">
                            <ScanLine size={30} className="card-icon" />
                            <h3>Urban monitoring</h3>
                        </div>
                        <p>
                            Track waste activity across neighborhoods, hotspots, service gaps, and operational territories.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Monitor waste flows by zone and route</li>
                                <li><CheckCircle size={16} /> Detect unmanaged areas and service gaps</li>
                                <li><CheckCircle size={16} /> Identify intervention priorities in the city</li>
                                <li><CheckCircle size={16} /> Improve targeting of field operations</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <Recycle size={30} className="card-icon" />
                            <h3>Circular economy</h3>
                        </div>
                        <p>
                            Redirect recyclable and recoverable waste into value chains that support reuse, recovery, and local economic activity.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Identify recyclable and recoverable material streams</li>
                                <li><CheckCircle size={16} /> Support reuse and recycling ecosystems</li>
                                <li><CheckCircle size={16} /> Track downstream value creation from collected waste</li>
                                <li><CheckCircle size={16} /> Connect waste operations to circular economy outcomes</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <Leaf size={30} className="card-icon" />
                            <h3>Processing & diversion</h3>
                        </div>
                        <p>
                            Move waste away from uncontrolled dumping through treatment, transformation, and measurable diversion pathways.
                        </p>

                        <div className="card-details">
                            <h4>Core functions</h4>
                            <ul>
                                <li><CheckCircle size={16} /> Track processed and diverted waste volumes</li>
                                <li><CheckCircle size={16} /> Support composting, recovery, and treatment pathways</li>
                                <li><CheckCircle size={16} /> Reduce landfill and dump-site dependence</li>
                                <li><CheckCircle size={16} /> Make downstream processing visible and measurable</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>


            {/* ... [Ecosystem and Platform sections from your original code] ... */}

            <section className="section">
                <div className="header"><h2>Waste Operators</h2></div>
                <div className="grid-3">
                    {initialOperators.length === 0 ? (
                        <div className="card"><h3>No operator available</h3></div>
                    ) : (
                        initialOperators.map((operator: any) => (
                            <div key={operator.id} className="card">
                                <div className="card-head">
                                    <BookMarked size={28} className="card-icon" />
                                    <h3>{operator.name}</h3>
                                </div>
                                <div className="operator-meta">
                                    <span className="operator-city">{operator.city}</span>
                                    <span className="operator-type">{operator.type}</span>
                                </div>
                                <div className="operator-metrics">
                                    <div className="operator-metric">
                                        <span className="operator-metric-label">Households</span>
                                        <span className="operator-metric-value">{operator.impact?.households ?? 0}</span>
                                    </div>
                                    <div className="operator-metric">
                                        <span className="operator-metric-label">Kg</span>
                                        <span className="operator-metric-value">{operator.impact?.kg ?? 0}</span>
                                    </div>
                                    <div className="operator-metric">
                                        <span className="operator-metric-label">SOM</span>
                                        <span className="operator-metric-value">{operator.impact?.som ?? 0}%</span>
                                    </div>
                                </div>
                                <div className="operator-action">
                                    <Link href={`/operators/${operator.id}`} className="button">View</Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <footer className="section">
                <a href="/login" className="button">Login / Operator / Collector / Municipality</a>
            </footer>
        </div>
    );


}