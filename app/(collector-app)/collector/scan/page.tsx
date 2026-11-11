"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

type ScanResult = {
  id: string;
  citizen: string;
  fokontany: string;
  sector: string;
  status: string;
};



export default function CollectorScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fetchScannedData = async (scannedId: string) => {
    try {
      setIsScanning(true);
      setError(null);
      setLastScanned(null);

      const db = getDb();
      const snap = await getDoc(doc(db, "households", scannedId));

      if (!snap.exists()) {
        setError("No matching record found.");
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
      setError(err.message || "Failed to fetch scanned data.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleMockScan = async () => {
    await fetchScannedData("HH-9928");
  };

  return (
    <div>
      {!isScanning && !lastScanned && (
        <button onClick={handleMockScan}>OPEN CAMERA SCANNER</button>
      )}

      {isScanning && <p>Scanning Bin QR Code...</p>}

      {error && <p>{error}</p>}

      {lastScanned && (
        <div>
          <p>{lastScanned.status}</p>
          <p>ID: {lastScanned.id}</p>
          <p>Citizen: {lastScanned.citizen}</p>
          <p>
            Location: {lastScanned.fokontany} - {lastScanned.sector}
          </p>
        </div>
      )}
    </div>
  );
}
async function verifySubscription(citizenId: string): Promise<{
  ok: boolean;
  reason?: string;
  subscriptionId?: string;
}> {
  try {
    const res = await fetch(
      `/api/app/collector/verify-subscription?citizenId=${encodeURIComponent(citizenId)}`,
      { credentials: "include" }
    );
    if (!res.ok) {
      return { ok: false, reason: "Unable to verify subscription" };
    }
    const data = await res.json();
    if (!data.active) {
      return { ok: false, reason: "No active subscription for this household" };
    }
    return { ok: true, subscriptionId: data.subscriptionId };
  } catch {
    return { ok: false, reason: "Verification error" };
  }
}
