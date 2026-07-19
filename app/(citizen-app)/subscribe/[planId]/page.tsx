"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { WASTE_COLLECT_PLAN_CATEGORIES } from "@/scripts/seed/waste_collect_plans";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

type Props = {
  params: Promise<{
    planId: string;
  }>;
};



export default function SubscribePage({ params }: Props) {
  const router = useRouter();
  const { planId } = use(params);
  const plan = findPlan(planId);

  const [operators, setOperators] = useState<any[]>([]);

  // Form State
  const [operatorId, setOperatorId] = useState("");
  const [commune, setCommune] = useState("");
  const [fokontany, setFokontany] = useState("");
  const [sector, setSector] = useState("");
  const [bins, setBins] = useState(1);

  // -----------------------------
  // Fetch operators from Firestore
  // -----------------------------
  useEffect(() => {
    async function loadOperators() {
      const [db, setDb] = useState<any>(null);

      useEffect(() => {
        const firestore = getDb();
        setDb(firestore);
      }, []);
      const snap = await getDocs(collection(db, "operators"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOperators(data);
    }
    loadOperators();
  }, []);

  if (!plan) {
    return (
      <div className="page-container flex justify-center items-center h-screen text-white">
        <h2>Plan not found</h2>
      </div>
    );
  }

  // -----------------------------
  // Session check
  // -----------------------------
  function getSession() {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(^| )session=([^;]+)/);
    return match ? match[2] : null;
  }

  function handleContinue() {
    if (!operatorId || !commune || !fokontany) {
      alert("Please fill in your location and select an operator.");
      return;
    }

    const session = getSession();

    if (!session) {
      const redirect = window.location.pathname;
      router.push(`/login?redirect=${redirect}`);
      return;
    }

    // Pass data to confirm page (could use Context, URL params, or local/session storage)
    router.push("/citizen/confirm");
  }

  // Shared input styling for glassmorphism
  const inputClass = "w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-colors";

  return (
    <div className="page-container">
      {/* ================= HEADER ================= */}
      <header className="header">
        <div className="header-logo">
          <Logo />
        </div>
        <h1>Complete Subscription</h1>
        <p className="subtitle">Set up your location to get matched with an operator</p>
      </header>

      <div className="grid-3">
        {/* ================= LEFT COL: PLAN DETAILS ================= */}
        <section className="section mt-0!">
          <div className="card h-full">
            <h3 className="text-teal-400 border-b border-white/10 pb-2 mb-4">Selected Plan</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/60 uppercase tracking-wide">Plan Name</p>
                <p className="text-xl font-bold">{plan.name}</p>
              </div>
              <div>
                <p className="text-sm text-white/60 uppercase tracking-wide">Pricing</p>
                <p className="text-lg">{plan.price} <span className="text-sm">/ {plan.billing}</span></p>
              </div>
              <div>
                <p className="text-sm text-white/60 uppercase tracking-wide">Ideal For</p>
                <p>{plan.idealFor}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= MID/RIGHT COL: FORM ================= */}
        <section className="section mt-0! col-span-1 sm:col-span-2">
          <div className="card space-y-6">

            {/* Location Hierarchy */}
            <div>
              <h3 className="text-teal-400 mb-3">1. Your Location</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  className={inputClass}
                  placeholder="Commune (e.g., Antananarivo Renivohitra)"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Fokontany"
                  value={fokontany}
                  onChange={(e) => setFokontany(e.target.value)}
                />
                <input
                  className={`${inputClass} sm:col-span-2`}
                  placeholder="Sector / Exact Address details"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                />
              </div>
            </div>

            {/* Operator Selection */}
            <div>
              <h3 className="text-teal-400 mb-3">2. Choose Operator</h3>
              <select
                className={`${inputClass} appearance-none cursor-pointer`}
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
              >
                <option value="" disabled className="text-gray-900">
                  Select an authorized operator in your area
                </option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id} className="text-gray-900">
                    {op.name} — {op.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Bins Selection */}
            <div>
              <h3 className="text-teal-400 mb-3">3. Number of QR Bins</h3>
              <input
                className={inputClass}
                type="number"
                value={bins}
                min={1}
                max={10}
                onChange={(e) => setBins(Number(e.target.value))}
              />
              <p className="text-xs text-white/50 mt-2">
                Each bin will receive a unique, scannable QR code.
              </p>
            </div>

            <button
              className="button w-full py-4 text-lg font-bold mt-4"
              onClick={handleContinue}
            >
              Continue to Confirmation
            </button>

          </div>
        </section>
      </div>
    </div>
  );
}

// -----------------------------
// Helpers
// -----------------------------
function findPlan(planId: string) {
  for (const cat of WASTE_COLLECT_PLAN_CATEGORIES) {
    for (const plan of cat.plans) {
      if (plan.id === planId) {
        return plan;
      }
    }
  }
  return null;
}