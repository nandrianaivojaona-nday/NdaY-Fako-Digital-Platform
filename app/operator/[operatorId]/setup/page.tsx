'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOperatorProfile } from '@/hooks/useOperatorProfile';
import { useCollectors } from '@/hooks/useCollectors';
import type { Collector } from '@/types/collector';
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

async function handleValidateAndLock(campaignId: string, operatorId: string) {
  const db = getDb(); // ✅ inside function
  const ref = doc(db, "campaigns", campaignId);

  await updateDoc(ref, {
    status: "LOCKED_ACTIVE",
    isLocked: true,
    lockedAt: serverTimestamp(),
    lockedBy: operatorId,
    updatedAt: serverTimestamp()
  });

  alert("Campaign is now ACTIVE and LOCKED");
}

export default function OperatorSetup() {
  const params = useParams();
  const operatorId = params.operatorId as string;

  const { user: appUser, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!appUser || (appUser.role !== 'ADMIN' && appUser.role !== 'OPERATOR')) {
    return <div className="p-8 text-center">Access denied</div>;
  }

  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    officeAddress: '',
  });

  const [collectors, setCollectors] = useState<Collector[]>([]);

  const { getCollectors, createCollector, deleteCollector } = useCollectors();

  const nameRef = useRef<HTMLInputElement>(null);
  const districtRef = useRef<HTMLInputElement>(null);
  const fokontanyRef = useRef<HTMLInputElement>(null);
  const fokontanyNameRef = useRef<HTMLInputElement>(null);
  const productivityRef = useRef<HTMLInputElement>(null);

  const [campaign, setCampaign] = useState<any>(null);

  useEffect(() => {
    async function loadCampaign() {
      const db = getDb(); // ✅ inside effect
      const ref = doc(db, "campaigns", `operator_${operatorId}`);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setCampaign({ id: snap.id, ...snap.data() });
      }
    }

    if (operatorId) loadCampaign();
  }, [operatorId]);

  useEffect(() => {
    if (step === 2 && operatorId) {
      getCollectors(operatorId).then(setCollectors);
    }
  }, [step, operatorId, getCollectors]);

  // ⚠️ keep this guard (unchanged logic)
  if (
    loading ||
    !appUser ||
    appUser.role !== 'ADMIN' ||
    appUser.operatorId !== operatorId
  ) {
    return <div className="p-8 text-center">Loading setup... or access denied</div>;
  }

  const handleProfileSave = async () => {
    try {
      const { updateProfile } = useOperatorProfile();
      await updateProfile(operatorId, profile);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const handleAddCollector = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameRef.current || !districtRef.current) return;

    const formData: Partial<Collector> = {
      name: nameRef.current.value,
      fokontanyName: fokontanyNameRef.current?.value || '',
      productivity: Number(productivityRef.current?.value || 0),
      role: "collector",
      status: "active",
    };

    try {
      await createCollector(operatorId, formData);
      const updated = await getCollectors(operatorId);
      setCollectors(updated);

      // Clear form
      if (nameRef.current) nameRef.current.value = '';
      if (districtRef.current) districtRef.current.value = '';
      if (fokontanyRef.current) fokontanyRef.current.value = '';
      if (fokontanyNameRef.current) fokontanyNameRef.current.value = '';
      if (productivityRef.current) productivityRef.current.value = '';

    } catch (error) {
      console.error('Add collector failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
          <div className="bg-white/10 p-4 rounded space-y-3">
            <h2 className="text-lg font-bold">Assigned Campaign</h2>
            <p><strong>Status:</strong> {campaign?.status}</p>
            {campaign?.status === "OPERATOR_ASSIGNED" && (
              <button
                onClick={() => handleValidateAndLock(campaign.id, operatorId)}
                className="px-4 py-2 bg-green-600 rounded"
              >
                Validate & Start Campaign
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ← Previous
            </button>
            <h1 className="text-3xl font-bold text-gray-900 text-center flex-1">
              Setup Wizard: Step {step} • {operatorId}
            </h1>
            <div className="w-20" />
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">1. Operator Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  placeholder="Operator Name (e.g. NdaY-Fako)"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 w-full"
                />
                <input
                  type="email"
                  placeholder="Contact Email"
                  value={profile.contactEmail}
                  onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                  className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 w-full"
                />
                <input
                  type="tel"
                  placeholder="Phone (+261 34 12 345 67)"
                  value={profile.contactPhone}
                  onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                  className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 w-full"
                />
                <textarea
                  placeholder="Office Address"
                  value={profile.officeAddress}
                  onChange={(e) => setProfile({ ...profile, officeAddress: e.target.value })}
                  className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 w-full h-28"
                />
              </div>
              <button
                onClick={handleProfileSave}
                className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
              >
                ✓ Save Profile → Collectors
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">2. Collectors (Need ≥1 active)</h2>
              <p className="text-gray-600">Add collectors for each Fokontany. Example: DIS04-FKT01.</p>

              <form onSubmit={handleAddCollector} className="bg-linear-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border-2 border-dashed border-emerald-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    ref={nameRef}
                    placeholder="Collector Name"
                    className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200"
                  />
                  <input
                    ref={districtRef}
                    placeholder="District (DIS04)"
                    className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200"
                  />
                  <input
                    ref={fokontanyRef}
                    placeholder="Fokontany (FKT01)"
                    className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200"
                  />
                  <input
                    ref={fokontanyNameRef}
                    placeholder="Fokontany Name"
                    className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200 md:col-span-2"
                  />
                  <input
                    ref={productivityRef}
                    placeholder="Productivity (60 households/day)"
                    className="p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-200 md:col-span-2"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-4 bg-linear-to-r from-emerald-600 to-green-700 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:from-emerald-700 hover:to-green-800"
                >
                  ➕ Add Collector
                </button>
              </form>

              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  Active Collectors <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">{
                    collectors.length
                  }</span>
                </h3>
                {collectors.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No collectors yet. Add one above!</p>
                ) : (
                  <div className="space-y-3">
                    {collectors.map((c: Collector) => (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
                        <div>
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-sm text-gray-600">{c.fokontanyName} • {c.productivity}</div>
                        </div>
                        <button
                          onClick={() => deleteCollector(c.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={collectors.length === 0}
                className="w-full bg-linear-to-r from-indigo-600 to-purple-700 text-white py-4 px-8 rounded-xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-800 shadow-lg hover:shadow-xl"
              >
                Next: Vehicles ({collectors.length}/1 required)
              </button>
            </div>
          )}

          {step > 2 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Step {step}: Vehicles/Areas</h2>
              <p className="text-gray-600 mb-8">Coming soon...</p>
              <button
                onClick={() => setStep(2)}
                className="bg-gray-600 text-white py-3 px-6 rounded-xl hover:bg-gray-700"
              >
                ← Back to Collectors
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}