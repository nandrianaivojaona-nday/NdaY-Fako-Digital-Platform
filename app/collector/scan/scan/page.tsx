"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  Scan,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

type ScannedHousehold = {
  id: string;
  citizen: string;
  fokontany: string;
  sector: string;
  status: string;
};

const [db, setDb] = useState<any>(null);

useEffect(() => {
  const firestore = getDb();
  setDb(firestore);
}, []);

export default function CollectorMobileView() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScannedHousehold | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (scannedId: string) => {
    try {
      setIsScanning(true);
      setError(null);
      setLastScanned(null);

      const ref = doc(db, "households", scannedId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setError("No household found for this QR code.");
        return;
      }

      const data = snap.data();

      setLastScanned({
        id: snap.id,
        citizen: data.citizenName ?? "Unknown citizen",
        fokontany: data.fokontanyName ?? "Unknown fokontany",
        sector: data.sectorName ?? "Unknown sector",
        status: data.subscriptionStatus ?? "Unknown status",
      });
    } catch (err: any) {
      console.error("Scan fetch error:", err);
      setError(err.message || "Failed to fetch scan data.");
    } finally {
      setIsScanning(false);
    }
  };

  const mockScan = () => {
    handleScan("HH-9928");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-slate-900 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                Collector
              </p>
              <h1 className="mt-1 text-xl font-bold">Andry R.</h1>
            </div>
            <div className="rounded-xl bg-teal-500/10 p-3">
              <Scan className="h-6 w-6 text-teal-400" />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-800 p-3">
            <p className="text-xs text-slate-400">Current Sector</p>
            <p className="mt-1 font-semibold">Ankadifotsy S2</p>
          </div>

          {!isScanning && !lastScanned && (
            <div className="mt-6 text-center">
              <h2 className="text-lg font-bold">Ready to Collect</h2>
              <button
                onClick={mockScan}
                className="mt-4 w-full rounded-xl bg-teal-600 py-4 font-bold hover:bg-teal-700"
              >
                OPEN CAMERA SCANNER
              </button>
            </div>
          )}

          {isScanning && (
            <div className="mt-6 rounded-xl border border-teal-500/30 bg-teal-500/10 p-6 text-center">
              <p className="font-medium text-teal-200">Scanning Bin QR Code...</p>
              <button
                onClick={() => setIsScanning(false)}
                className="mt-4 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {lastScanned && (
            <div className="mt-6 rounded-2xl bg-slate-800 p-5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-300">
                  {lastScanned.status}
                </span>
                <button onClick={() => setLastScanned(null)}>
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-400">ID</p>
                <p className="font-bold">{lastScanned.id}</p>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <User className="mt-1 h-5 w-5 text-teal-400" />
                <div>
                  <p className="text-sm text-slate-400">Citizen</p>
                  <p className="font-semibold">{lastScanned.citizen}</p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-teal-400" />
                <div>
                  <p className="text-sm text-slate-400">Location</p>
                  <p className="font-semibold">
                    {lastScanned.fokontany} - {lastScanned.sector}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setLastScanned(null)}
                className="mt-6 w-full rounded-xl bg-green-600 py-4 font-bold hover:bg-green-700"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  CONFIRM COLLECTION
                </span>
              </button>

              <button
                onClick={() => setLastScanned(null)}
                className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-bold text-red-400"
              >
                <AlertTriangle className="h-4 w-4" />
                Report Issue (e.g. Bin Broken)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
