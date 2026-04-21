"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Building2,
  Filter,
    X,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import PageNavigation from '@/components/PageNavigation'

interface FokontanyData {
  id: string;
  name: string;
  code: string;
  status: string;
  municipalityId: string;
  arrondissementId: string | null;
  type: "URBAN" | "RURAL";
  sectorIds?: string[];
  performance: number;
}



export default function AuthoritiesFokontanyPage() {
  const [allFokontany, setAllFokontany] = useState<FokontanyData[]>([]);
  const [loading, setLoading] = useState(true);

  // selections
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>("");
  const [selectedArrondissement, setSelectedArrondissement] =
    useState<string>("");
  const [selectedFokId, setSelectedFokId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const fokRef = collection(db, "fokontany");
        const snap = await getDocs(fokRef);

        const data: FokontanyData[] = snap.docs.map((doc): FokontanyData => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            name: d.name || "Unnamed",
            code: d.code || d.id || doc.id,
            status: d.status || "ACTIVE",
            municipalityId: d.municipalityId, // e.g. "ANA-ANTANANARIVO_RENIVOHITRA"
            arrondissementId: d.arrondissementId ?? null, // e.g. "ANA-CUA-ARR-4" or null
            type: d.type || "URBAN", // "URBAN" or "RURAL" from seed
            sectorIds: d.sectorIds ?? [],
            performance: d.performance ?? Math.floor(Math.random() * 40) + 60,
          };
        });[] = snap.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            name: d.name || "Unnamed",
            code: d.code || d.id || doc.id,
            status: d.status || "ACTIVE",
            municipalityId: d.municipalityId, // e.g. "ANA-ANTANANARIVO_RENIVOHITRA"
            arrondissementId: d.arrondissementId ?? null, // e.g. "ANA-CUA-ARR-4" or null
            type: d.type || "URBAN", // "URBAN" or "RURAL" from seed
            sectorIds: d.sectorIds ?? [],
            performance: d.performance ?? Math.floor(Math.random() * 40) + 60,
          };
        });

        setAllFokontany(data);
      } catch (err) {
        console.error("Firestore Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 1) list of municipalities from fokontany data
  const communes = useMemo(
    () =>
      Array.from(
        new Set(allFokontany.map((f) => f.municipalityId).filter(Boolean)),
      ).sort(),
    [allFokontany],
  );

  // 2) per‑commune urban/rural meta, inferred from fokontany.type
  const communeMeta = useMemo(() => {
    const meta: Record<string, { isUrban: boolean }> = {};
    allFokontany.forEach((f) => {
      if (!f.municipalityId) return;
      if (!meta[f.municipalityId]) {
        meta[f.municipalityId] = { isUrban: false };
      }
      if (f.type === "URBAN") {
        meta[f.municipalityId].isUrban = true;
      }
    });
    return meta;
  }, [allFokontany]);

  const selectedCommuneMeta = selectedCommuneId
    ? communeMeta[selectedCommuneId]
    : undefined;
  const isUrban = !!selectedCommuneMeta?.isUrban;

  // 3) unique arrondissements for selected urban commune
  const availableArrondissements = useMemo(() => {
    if (!selectedCommuneId || !isUrban) return [];
    return Array.from(
      new Set(
        allFokontany
          .filter(
            (f) =>
              f.municipalityId === selectedCommuneId &&
              f.arrondissementId &&
              f.type === "URBAN",
          )
          .map((f) => f.arrondissementId as string),
      ),
    ).sort();
  }, [allFokontany, selectedCommuneId, isUrban]);

  // 4) filtered fokontany for grid
  const filteredList = useMemo(() => {
    if (!selectedCommuneId) return [];

    return allFokontany.filter((f) => {
      if (f.municipalityId !== selectedCommuneId) return false;

      if (isUrban) {
        // Urban -> optionally filter by arrondissement
        if (selectedArrondissement) {
          return f.arrondissementId === selectedArrondissement;
        }
        return true;
      }

      // Rural -> no arrondissement layer
      return true;
    });
  }, [allFokontany, selectedCommuneId, selectedArrondissement, isUrban]);

  const benchmark = useMemo(() => {
    if (filteredList.length === 0) return 0;
    const total = filteredList.reduce(
      (acc, curr) => acc + curr.performance,
      0,
    );
    return total / filteredList.length;
  }, [filteredList]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 pb-20 pt-12 font-sans text-blue-50">
      <div className="mx-auto max-w-6xl">

        {/* CRITICAL: Added the component call here */}
                <PageNavigation />

        {/* HEADER */}
        <header className="mb-10 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div className="w-full space-y-4 md:w-2/3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/70">
              <Building2 className="h-4 w-4" />
              <span>Authorities · Fokontany Benchmark</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Communal Agglomeration Overview
            </h1>
            <p className="max-w-xl text-sm text-blue-200/80">
              Start with a Municipality. Urban communes expose Arrondissements,
              while rural communes go directly to Fokontany.
            </p>
          </div>

          <div className="flex gap-3 text-xs">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-blue-100/80 transition hover:border-blue-400/50 hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/0 px-3 py-2 text-blue-200/80 transition hover:border-blue-400/50 hover:bg-white/5 hover:text-white"
            >
              <Home className="h-3 w-3" />
              NdaY&apos;Fako Home
            </Link>
          </div>
        </header>

        {/* TOP FILTER BAR */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* SELECTORS */}
          <div className="space-y-4 rounded-2xl bg-white/5 p-5 shadow-sm shadow-black/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
                <Filter className="h-4 w-4" />
                Territory Selection
              </span>
            </div>

            {/* 1. Municipality */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                1. Municipality (Commune)
              </label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm outline-none transition-all focus:border-blue-500"
                value={selectedCommuneId}
                onChange={(e) => {
                  setSelectedCommuneId(e.target.value);
                  setSelectedArrondissement("");
                  setSelectedFokId(null);
                }}
              >
                <option value="">Select Municipality...</option>
                {communes.map((id) => {
                  const meta = communeMeta[id];
                  const labelStatus = meta?.isUrban ? "URBAN" : "RURAL";
                  return (
                    <option key={id} value={id} className="bg-slate-900">
                      {id} · {labelStatus}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Arrondissement (only when URBAN) */}
            {isUrban && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  2. Arrondissement (Urban only)
                </label>
                <select
                  disabled={
                    !selectedCommuneId || availableArrondissements.length === 0
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm outline-none transition-all disabled:opacity-40 focus:border-blue-500"
                  value={selectedArrondissement}
                  onChange={(e) => setSelectedArrondissement(e.target.value)}
                >
                  <option value="">All Arrondissements</option>
                  {availableArrondissements.map((a) => (
                    <option key={a} value={a} className="bg-slate-900">
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isUrban && selectedCommuneId && (
              <p className="pt-2 text-[11px] text-blue-200/80">
                This commune is inferred as <strong>Rural</strong> from pilot
                 it has no Arrondissements, Fokontany are listed directly.
              </p>
            )}
          </div>

          {/* BENCHMARK CARD */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-6 text-right shadow-inner shadow-blue-900/40">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-blue-300/80">
              Group Benchmark
            </span>
            <div className="text-4xl font-bold text.white">
              {benchmark.toFixed(1)}
            </div>
            <p className="mt-1 text-[10px] text-blue-300/70 italic">
              {filteredList.length} Fokontany in current view
            </p>
          </div>
        </div>

        {/* FOKONTANY GRID */}
        {!selectedCommuneId ? (
          <div className="rounded-3xl border-2 border-dashed border-white/5 bg-white/5/10 py-24 text-center">
            <Filter className="mx-auto mb-4 h-12 w-12 text-white/10" />
            <p className="font-medium text-blue-200/80">
              Please select a municipality to view its Fokontany.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-3xl border border.white/10 bg-white/5 py-16 text-center text-sm text-blue-200/80">
            No Fokontany found for this selection.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((fok) => (
              <div
                key={fok.id}
                onClick={() => setSelectedFokId(fok.id)}
                className={`group cursor-pointer rounded-xl border p-5 transition-all ${
                  selectedFokId === fok.id
                    ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500"
                    : "border-white/5 bg-white/5 hover:border-blue-400/50"
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-blue-300/60">
                      ID: {fok.code}
                    </span>
                    <h3 className="text-lg font-bold leading-tight text-white">
                      {fok.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-blue-200/80">
                      {fok.type === "URBAN" ? "Urban" : "Rural"} Fokontany ·{" "}
                      {fok.sectorIds?.length ?? 0} sectors
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-blue-200/70">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        fok.status === "ACTIVE"
                          ? "bg-green-400"
                          : "bg-yellow-400"
                      }`}
                    />
                    <span>{fok.status}</span>
                  </div>
                </div>

                <div className="mb-6 space-y-2">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full transition-all duration-700 ${
                        fok.performance >= benchmark
                          ? "bg-blue-400"
                          : "bg-slate-500"
                      }`}
                      style={{ width: `${fok.performance}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono uppercase text-blue-300/60">
                    <span>Performance</span>
                    <span>{fok.performance.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[9px] font-bold uppercase text-blue-300/40">
                    {fok.arrondissementId || "Communal Area"}
                  </span>
                  <Link
                    href={`/fokontany/${fok.id}/dashboard`}
                    className="flex items-center gap-1 text-xs font-bold text-blue-400 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Dashboard
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
