"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { useAuth } from "@/hooks/useAuth";

export default function AssignOperatorPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const db = getDb();

  const [campaign, setCampaign] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const campaignRef = doc(db, "campaigns", campaignId);
        const campaignSnap = await getDoc(campaignRef);
        if (!campaignSnap.exists()) {
          setError("Campaign not found");
          return;
        }
        setCampaign({ id: campaignSnap.id, ...campaignSnap.data() });

        const operatorsRef = collection(db, "operators");
        const operatorsSnap = await getDocs(operatorsRef);
        const ops: any[] = [];
        operatorsSnap.forEach((doc) => {
          ops.push({ id: doc.id, ...doc.data() });
        });
        setOperators(ops);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [campaignId, user, authLoading, db, router]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperatorId) {
      setError("Please select an operator");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const campaignRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignRef, {
        assignedOperatorId: selectedOperatorId,
        status: "ASSIGNED",
        updatedAt: new Date().toISOString(),
      });

      const operatorRef = doc(db, "operators", selectedOperatorId);
      await updateDoc(operatorRef, {
        assignedCampaignId: campaignId,
        updatedAt: new Date().toISOString(),
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/campaigns");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">Error: {error}</div>;
  }

  if (!campaign) {
    return <div className="p-6 text-white">Campaign not found</div>;
  }

  if (success) {
    return <div className="p-6 text-emerald-400">✅ Operator assigned successfully!</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Assign Operator</h1>
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
        <p className="text-white/70">Campaign: {campaign.name}</p>
        <form onSubmit={handleAssign} className="mt-4 space-y-4">
          <select
            value={selectedOperatorId}
            onChange={(e) => setSelectedOperatorId(e.target.value)}
            className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white"
            required
          >
            <option value="">Select an operator</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name} ({op.email})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 rounded-lg text-white disabled:opacity-50"
          >
            {isSubmitting ? "Assigning..." : "Assign"}
          </button>
        </form>
      </div>
    </div>
  );
}