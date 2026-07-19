// =============================
// FILE: ADMIN PAGE (Create Operator + Apps)
// Path: /app/admin/operators/new/page.tsx
// =============================

"use client";

import { useState, useEffect } from "react";
import { getDb } from "@/lib/firebase/firebaseApp";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function AdminCreateOperatorPage() {
  const { user, loading: authLoading } = useAuth();
  const appUser = user
  const router = useRouter();

  const [db, setDb] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    type: "private",
    region: "",
    contactEmail: "",
    municipalityId: "CUA", // default but editable later
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setDb(getDb());
  }, []);

  // 🔐 ADMIN GUARD
  if (authLoading) return <div className="p-6">Loading...</div>;

  if (!appUser || appUser.role !== "ADMIN") {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Access denied — Admins only
      </div>
    );
  }

  async function createOperator() {
    if (!db) return;
  
    // 🔒 Ensure appUser is defined (TypeScript-safe)
    if (!appUser) {
      alert("User not authenticated");
      return;
    }
  
    // ✅ Basic validation
    if (!form.name || !form.region || !form.contactEmail) {
      alert("Please fill all required fields");
      return;
    }
  
    setLoading(true);
  
    try {
      const operatorRef = doc(collection(db, "operators"));
  
      await setDoc(operatorRef, {
        id: operatorRef.id,
        name: form.name,
        type: form.type,
        region: form.region,
        municipalityId: form.municipalityId,
        contactEmail: form.contactEmail,
  
        onboardingStep: "profile",
        setupCompleted: false,
        readinessScore: 0,
  
        // ✅ Now safe
        createdBy: appUser.id,
  
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  
      // ... rest unchanged

      // =============================
      // 2. CREATE DEFAULT APPS
      // =============================
      const webAppRef = doc(collection(db, "apps"));
      const dashboardRef = doc(collection(db, "apps"));

      await Promise.all([
        setDoc(webAppRef, {
          id: webAppRef.id,
          operatorId: operatorRef.id,
          type: "web",
          status: "active",
          version: "v1",
          createdAt: serverTimestamp(),
        }),
        setDoc(dashboardRef, {
          id: dashboardRef.id,
          operatorId: operatorRef.id,
          type: "dashboard",
          status: "active",
          version: "v1",
          createdAt: serverTimestamp(),
        }),
      ]);

      // =============================
      // 3. OPTIONAL: CREATE EMPTY CAMPAIGN SHELL
      // =============================
      const campaignRef = doc(collection(db, "campaigns"));

      await setDoc(campaignRef, {
        id: campaignRef.id,
        operatorId: operatorRef.id,
        municipalityId: form.municipalityId,

        status: "DRAFT", // important for lifecycle
        isLocked: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // =============================
      // SUCCESS
      // =============================
      setSuccess(true);

      setForm({
        name: "",
        type: "private",
        region: "",
        contactEmail: "",
        municipalityId: "CUA",
      });

      // 👉 Redirect to setup page
      setTimeout(() => {
        router.push(`/operator/${operatorRef.id}/setup`);
      }, 1200);
    } catch (e) {
      console.error("Creation failed", e);
      alert("Operator creation failed");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 text-center">
          Create New Operator
        </h1>

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg text-center">
            ✅ Operator created successfully — redirecting to setup...
          </div>
        )}

        {/* FORM */}
        <div className="space-y-4">
          <input
            placeholder="Operator Name (e.g. NdaY-Fako Antananarivo)"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="w-full border p-3 rounded-lg"
          />

          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
            className="w-full border p-3 rounded-lg"
          >
            <option value="private">Private Operator</option>
            <option value="public">Public Operator</option>
            <option value="ngo">NGO / Partner</option>
          </select>

          <input
            placeholder="Region (e.g. Analamanga)"
            value={form.region}
            onChange={(e) =>
              setForm({ ...form, region: e.target.value })
            }
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="email"
            placeholder="Contact Email"
            value={form.contactEmail}
            onChange={(e) =>
              setForm({ ...form, contactEmail: e.target.value })
            }
            className="w-full border p-3 rounded-lg"
          />

          <input
            placeholder="Municipality ID (e.g. CUA)"
            value={form.municipalityId}
            onChange={(e) =>
              setForm({ ...form, municipalityId: e.target.value })
            }
            className="w-full border p-3 rounded-lg"
          />
        </div>

        {/* BUTTON */}
        <button
          onClick={createOperator}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white p-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating Operator..." : "Create Operator & Apps"}
        </button>
      </div>
    </div>
  );
}