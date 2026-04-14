"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Home, ArrowLeft, X, ArrowRight, Loader2, 
  BarChart3, Target, TrendingUp, TrendingDown, Building2 
} from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FokontanyData {
    id: string;
    name: string;
    code: string;           // From DB: "FKTO1"
    status: string;         // From DB: "ACTIVE"
    municipalityId: string; // From DB: "CUA"
    arrondissementId: string; // From DB: "ARRO4-CUA"
    performance: number;    // Calculated metric for benchmarking
}

export default function FokontanyConsolidatedPage() {
  const [fokontanyList, setFokontanyList] = useState<FokontanyData[]>([]);
  const [selectedFokId, setSelectedFokId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const fokRef = collection(db, "fokontany");
        const q = query(fokRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            // Mocking performance for the demo; replace with real DB metric if available
            performance: (docData as any).performance ?? Math.floor(Math.random() * 40) + 60 
          };
        }) as FokontanyData[];
        
        setFokontanyList(data);
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // --- BENCHMARK CALCULATIONS ---
  const globalAverage = useMemo(() => {
    if (fokontanyList.length === 0) return 0;
    return fokontanyList.reduce((acc, curr) => acc + curr.performance, 0) / fokontanyList.length;
  }, [fokontanyList]);

  const selectedFok = useMemo(() => 
    fokontanyList.find(f => f.id === selectedFokId), 
  [selectedFokId, fokontanyList]);

  const performanceDelta = selectedFok ? selectedFok.performance - globalAverage : 0;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 px-6 pb-20 pt-12 text-blue-50">
      <div className="mx-auto max-w-6xl">
        
        {/* BENCHMARK DASHBOARD HEADER */}
        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
              <Target size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Global Average</span>
            </div>
            <div className="text-4xl font-bold text-white">{globalAverage.toFixed(1)}%</div>
            <p className="text-xs text-blue-300/60 mt-2 font-mono uppercase">
              Consolidated Performance Across {fokontanyList.length} Units
            </p>
          </div>

          <div className={`rounded-2xl border p-6 transition-all duration-500 ${selectedFok ? 'border-white/20 bg-white/5 shadow-lg shadow-blue-500/10' : 'border-dashed border-white/10 bg-transparent'}`}>
            <div className="flex items-center gap-3 text-blue-200 mb-2">
              <BarChart3 size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Comparative View</span>
            </div>
            {selectedFok ? (
              <>
                <div className="text-3xl font-bold text-white truncate">{selectedFok.name}</div>
                <div className={`mt-2 flex items-center gap-1 text-sm font-bold ${performanceDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {performanceDelta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {performanceDelta >= 0 ? '+' : ''}{performanceDelta.toFixed(1)}% vs Global Average
                </div>
              </>
            ) : (
              <div className="text-sm text-blue-300/40 italic py-2">Select a Fokontany to benchmark performance...</div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-2xl bg-white/5 text-center">
             <Building2 className="text-blue-500/40 mb-2" size={32} />
             <button 
                onClick={() => setSelectedFokId(null)}
                className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors disabled:opacity-30"
                disabled={!selectedFokId}
             >
                Reset Benchmarking
             </button>
          </div>
        </div>

        {/* INTERACTIVE LIST */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fokontanyList.map((fok) => {
            const isSelected = selectedFokId === fok.id;
            return (
              <div 
                key={fok.id} 
                onClick={() => setSelectedFokId(fok.id)}
                className={`group cursor-pointer rounded-xl border p-5 transition-all ${
                  isSelected 
                  ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500" 
                  : "border-white/5 bg-white/5 hover:border-blue-400/50"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-mono text-blue-300/40 uppercase">CODE: {fok.code}</span>
                    <h3 className="font-bold text-white text-lg">{fok.name}</h3>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${fok.status === "ACTIVE" ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-yellow-400"}`} />
                </div>
                
                {/* Visual Delta Bar */}
                <div className="space-y-2 mb-6">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div 
                      className={`h-full transition-all duration-700 ${fok.performance >= globalAverage ? 'bg-blue-400' : 'bg-slate-500'}`} 
                      style={{ width: `${fok.performance}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-blue-300/60 uppercase">
                    <span>Performance</span>
                    <span>{fok.performance}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[9px] text-blue-300/30 uppercase">{fok.arrondissementId}</span>
                  <Link 
                    href={`/fokontany/${fok.id}/dashboard`}
                    className="flex items-center gap-1 text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    GO TO DASHBOARD <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}