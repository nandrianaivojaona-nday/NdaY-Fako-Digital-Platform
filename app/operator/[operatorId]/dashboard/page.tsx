"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { useAuth } from "@/hooks/useAuth";
import {
  Truck,
  Users,
  MapPin,
  BarChart3,
  Calendar,
  Clock,
  Leaf,
  Coins,
  CheckCircle,
} from "lucide-react";

// Types
interface Operator {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  // ... other fields
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  assignedOperatorId: string;
  createdAt: string;
}

export default function OperatorDashboard() {
  const params = useParams();
  const operatorId = params.operatorId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = getDb();

  const [operator, setOperator] = useState<Operator | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadDashboardData() {
      try {
        // Fetch operator data
        const operatorRef = doc(db, "operators", operatorId);
        const operatorSnap = await getDoc(operatorRef);
        if (!operatorSnap.exists()) {
          setError("Operator not found");
          return;
        }
        setOperator({ id: operatorSnap.id, ...operatorSnap.data() } as Operator);

        // Fetch campaigns assigned to this operator
        const campaignsQuery = query(
          collection(db, "campaigns"),
          where("assignedOperatorId", "==", operatorId)
        );
        const campaignsSnap = await getDocs(campaignsQuery);
        const campaignsData: Campaign[] = [];
        campaignsSnap.forEach((doc) => {
          campaignsData.push({ id: doc.id, ...doc.data() } as Campaign);
        });
        setCampaigns(campaignsData);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [operatorId, user, authLoading, db, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-solid mx-auto" />
          <p className="mt-4 text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-300 font-medium">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-emerald-600 rounded-lg text-white text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!operator) {
    return <div className="p-6 text-white">Operator not found</div>;
  }

  // Calculate some metrics
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE" || c.status === "ASSIGNED");
  const completedCampaigns = campaigns.filter((c) => c.status === "COMPLETED");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {operator.name}
          </h1>
          <p className="text-white/50 text-sm">
            {operator.address} · {operator.email}
          </p>
        </div>
        <button
          onClick={() => router.push(`/operator/${operatorId}/setup`)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition"
        >
          Manage Settings
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-full">
            <Truck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-white/50 text-sm">Total Campaigns</p>
            <p className="text-white text-2xl font-bold">{campaigns.length}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-full">
            <Calendar className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <p className="text-white/50 text-sm">Active</p>
            <p className="text-white text-2xl font-bold">{activeCampaigns.length}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <p className="text-white/50 text-sm">Completed</p>
            <p className="text-white text-2xl font-bold">{completedCampaigns.length}</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-full">
            <Users className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <p className="text-white/50 text-sm">Collectors</p>
            <p className="text-white text-2xl font-bold">--</p>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Your Campaigns</h2>
          <button
            onClick={() => router.push(`/operator/${operatorId}/campaigns`)}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            View All →
          </button>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-white/40 text-sm">No campaigns assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition cursor-pointer"
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
              >
                <div>
                  <p className="text-white font-medium">{campaign.name}</p>
                  <p className="text-white/40 text-xs">
                    Status:{" "}
                    <span
                      className={`${
                        campaign.status === "ACTIVE" || campaign.status === "ASSIGNED"
                          ? "text-emerald-400"
                          : campaign.status === "COMPLETED"
                          ? "text-blue-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </p>
                </div>
                <span className="text-white/30 text-sm">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => router.push(`/operator/${operatorId}/vehicles`)}
          className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-center"
        >
          <Truck className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
          <span className="text-white/70 text-sm">Vehicles</span>
        </button>
        <button
          onClick={() => router.push(`/operator/${operatorId}/collectors`)}
          className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-center"
        >
          <Users className="h-6 w-6 text-blue-400 mx-auto mb-1" />
          <span className="text-white/70 text-sm">Collectors</span>
        </button>
        <button
          onClick={() => router.push(`/operator/${operatorId}/wms`)}
          className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-center"
        >
          <BarChart3 className="h-6 w-6 text-purple-400 mx-auto mb-1" />
          <span className="text-white/70 text-sm">WMS</span>
        </button>
        <button
          onClick={() => router.push(`/operator/${operatorId}/offers`)}
          className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-center"
        >
          <Leaf className="h-6 w-6 text-green-400 mx-auto mb-1" />
          <span className="text-white/70 text-sm">Offers</span>
        </button>
      </div>
    </div>
  );
}