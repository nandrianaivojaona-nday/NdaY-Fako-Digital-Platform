"use client";

import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { WASTE_COLLECT_PLAN_CATEGORIES } from "@/scripts/seed/waste_collect_plans";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

// Default operator (used if no operators exist in Firestore)
const DEFAULT_OPERATOR = {
  id: "NDYF01",
  name: "NdaY'Fako Operator",
  city: "National Coverage",
  description: "Official Platform Service Provider",
};

export default function CitizenPage() {
  const [categoryId, setCategoryId] = useState(WASTE_COLLECT_PLAN_CATEGORIES[0]?.id || "");
  const [operators, setOperators] = useState<any[]>([DEFAULT_OPERATOR]);
  const [selectedOperatorId, setSelectedOperatorId] = useState(DEFAULT_OPERATOR.id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOperators() {
      try {
        const db = getDb();
        const querySnapshot = await getDocs(collection(db, "operators"));
        const fetchedOps = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // If we have Firestore operators, prepend the default one.
        // Or you could replace entirely – adjust as needed.
        if (fetchedOps.length > 0) {
          const finalOps = [DEFAULT_OPERATOR, ...fetchedOps];
          setOperators(finalOps);
          setSelectedOperatorId(DEFAULT_OPERATOR.id);
        } else {
          // Fallback: only default operator
          setOperators([DEFAULT_OPERATOR]);
          setSelectedOperatorId(DEFAULT_OPERATOR.id);
        }
      } catch (error) {
        console.error("Error fetching operators:", error);
        // Keep default operator on error
        setOperators([DEFAULT_OPERATOR]);
        setSelectedOperatorId(DEFAULT_OPERATOR.id);
      } finally {
        setLoading(false);
      }
    }

    fetchOperators();
  }, []);

  const category = WASTE_COLLECT_PLAN_CATEGORIES.find((c) => c.id === categoryId);

  // If no categories, show a fallback
  if (!WASTE_COLLECT_PLAN_CATEGORIES.length) {
    return <div className="p-6 text-white">No subscription plans available.</div>;
  }

  return (
    <div className="page-container">
      <header className="header">
        <div className="header-logo">
          <Logo />
        </div>
        <h1>Waste Collection Subscription</h1>
      </header>

      <section className="section">
        <h2>Service Operator</h2>
        <div className="card">
          {loading ? (
            <p>Loading service providers...</p>
          ) : operators.length > 1 ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm opacity-70">Select your preferred operator:</label>
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-teal-400"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id} className="text-gray-900">
                    {op.name} — {op.city}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-70">Current Operator:</p>
                <p className="text-xl font-bold text-teal-300">
                  {operators[0]?.name || "NdaY'Fako Operator"}
                </p>
              </div>
              <span className="text-xs bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30">
                Primary Provider
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <h2>Choose your plan</h2>
        <div className="tabs">
          {WASTE_COLLECT_PLAN_CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={c.id === categoryId ? "tab active" : "tab"}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {category && (
          <div className="grid-3">
            {category.plans.map((plan) => (
              <div key={plan.id} className="card">
                <h3>{plan.name}</h3>
                <p className="font-bold text-teal-400">{plan.price}</p>
                <a
                  href={`/citizen/subscribe/${plan.id}?operatorId=${selectedOperatorId}`}
                  className="button"
                >
                  Subscribe
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}