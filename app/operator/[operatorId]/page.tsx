"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Loader2,
  MapPinned,
  Users,
  Truck,
  BarChart3,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PageNavigation from "@/components/PageNavigation";

type Operator = {
  id: string;
  name?: string;
  legalName?: string;
  municipalityIds?: string[];
  fokontanyIds?: string[];
  sectorIds?: string[];
  regionId?: string;
  districtId?: string;
  status?: string;
  type?: string;
};

type Fokontany = {
  id: string;
  name: string;
  municipalityId: string;
  arrondissementId: string | null;
  type: "URBAN" | "RURAL";
  geometry?: string;
  sectorIds?: string[];
  tgs?: {
    cty: "MDG";
    reg: {
      name: string;
      iso: string;
      nrc: string;
    };
    dis: string;
    com: string;
    fkt: string;
  };
};

export default function OperatorHomePage() {
  const params = useParams<{ operatorId: string }>();
  const operatorId = params.operatorId;

  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [fokontany, setFokontany] = useState<Fokontany[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorId) return;

    async function fetchOperatorHome() {
      try {
        setLoading(true);
        setError(null);

        const operatorRef = doc(db, "operators", operatorId);
        const operatorSnap = await getDoc(operatorRef);

        if (!operatorSnap.exists()) {
          setError("Operator not found.");
          setOperator(null);
          setFokontany([]);
          return;
        }

        const operatorData = {
          id: operatorSnap.id,
          ...operatorSnap.data(),
        } as Operator;

        setOperator(operatorData);

        const assignedFokontanyIds = operatorData.fokontanyIds ?? [];

        if (assignedFokontanyIds.length > 0) {
          const fokSnap = await getDocs(collection(db, "fokontany"));
          const filtered = fokSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Fokontany))
            .filter((f) => assignedFokontanyIds.includes(f.id));

          setFokontany(filtered);
        } else {
          setFokontany([]);
        }
      } catch (err) {
        console.error("Operator page fetch error:", err);
        setError("Failed to load operator data.");
      } finally {
        setLoading(false);
      }
    }

    fetchOperatorHome();
  }, [operatorId]);

  const stats = useMemo(() => {
    const municipalityCount = new Set(fokontany.map((f) => f.municipalityId)).size;
    const arrondissementCount = new Set(
      fokontany.map((f) => f.arrondissementId).filter(Boolean)
    ).size;
    const sectorCount = fokontany.reduce(
      (acc, curr) => acc + (curr.sectorIds?.length ?? 0),
      0
    );

    return {
      fokontanyCount: fokontany.length,
      municipalityCount,
      arrondissementCount,
      sectorCount,
    };
  }, [fokontany]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
        </div>
      </main>
    );
  }

  if (error || !operator) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <PageNavigation />
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-2xl font-bold text-white">Operator Home</h1>
            <p className="mt-3 text-sm text-red-200/90">
              {error ?? "Unable to load this operator."}
            </p>
            <Link
              href="/operator"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to operators
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <PageNavigation />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/80">
                <Building2 className="h-4 w-4" />
                Operator home
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {operator.name || operator.legalName || operator.id}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Territorial operator overview connected to Firestore live data.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm">
              <div className="text-white/50">Status</div>
              <div className="mt-1 font-semibold text-white">
                {operator.status ?? "Unknown"}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <MapPinned className="h-4 w-4 text-teal-400" />
              Fokontany
            </div>
            <div className="mt-3 text-3xl font-bold">{stats.fokontanyCount}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Building2 className="h-4 w-4 text-teal-400" />
              Municipalities
            </div>
            <div className="mt-3 text-3xl font-bold">{stats.municipalityCount}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Truck className="h-4 w-4 text-teal-400" />
              Arrondissements
            </div>
            <div className="mt-3 text-3xl font-bold">{stats.arrondissementCount}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <BarChart3 className="h-4 w-4 text-teal-400" />
              Sectors
            </div>
            <div className="mt-3 text-3xl font-bold">{stats.sectorCount}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-teal-300/80">
            <Users className="h-4 w-4" />
            Assigned Fokontany
          </div>

          {fokontany.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-10 text-center text-sm text-white/60">
              No Fokontany linked to this operator yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fokontany.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-teal-300/70">
                    {item.type}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {item.name}
                  </h2>
                  <div className="mt-4 space-y-2 text-sm text-white/70">
                    <p>Municipality: {item.municipalityId}</p>
                    <p>Arrondissement: {item.arrondissementId ?? "N/A"}</p>
                    <p>Sectors: {item.sectorIds?.length ?? 0}</p>
                    <p>Region: {item.tgs?.reg?.name ?? "N/A"}</p>
                    <p>ISO: {item.tgs?.reg?.iso ?? "N/A"}</p>
                    <p>NRC: {item.tgs?.reg?.nrc ?? "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
