"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";

import { StepProps } from "@/lib/audits/auditTypes";


const [db, setDb] = useState<any>(null);

useEffect(() => {
  const firestore = getDb();
  setDb(firestore);
}, []);

export default function StepRecommendation({
  form,
  setForm,
}: StepProps) {

  const [plans, setPlans] =
    useState<any[]>([]);


    useEffect(() => {
      async function loadFilteredPlans() {
        const plansRef = collection(db, "plans");
        // Dynamic Filter: Only show plans relevant to this building type
        const q = query(plansRef, where("category", "==", form.buildingType));
        const snap = await getDocs(q);
        setPlans(snap.docs.map(d => d.data()));
      }
      loadFilteredPlans();
    }, [form.buildingType]);


  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${form.isProfitable ? 'bg-green-100' : 'bg-red-100'}`}>
        <h3 className="font-bold">Deployment Score: {form.deploymentScore}%</h3>
        <p>{form.isProfitable ? "✅ Profitable Zone" : "⚠️ High Logistics Cost Expected"}</p>
      </div>

      <h2>Recommended Services</h2>

      <select
        value={form.planId}
        onChange={(e) =>
          setForm({
            ...form,
            planId: e.target.value,
          })
        }
        className="w-full p-2 border rounded"
      >

        <option>
          Select plan
        </option>

        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.price} Ar)
          </option>
        ))}

      </select>

    </div>
  );
}