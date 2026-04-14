"use client";

import { useState } from "react";
import { Scan, MapPin, User, CheckCircle2, AlertTriangle, X } from "lucide-react";

export default function CollectorMobileView() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null);

  const mockScan = () => {
    setIsScanning(true);
    // Simulate camera scan delay
    setTimeout(() => {
      setIsScanning(false);
      setLastScanned({
        id: "HH-9928",
        citizen: "Miora R.",
        fokontany: "Ankadifotsy",
        sector: "Sector 2",
        status: "Active Subscriber"
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#031c12] text-white p-4">
      {/* Top Status Bar */}
      <div className="flex justify-between items-center mb-6 bg-white/5 p-3 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center font-bold">AR</div>
          <div>
            <p className="text-xs opacity-60">Collector</p>
            <p className="font-bold text-sm">Andry R.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-60 italic">Current Sector</p>
          <p className="text-teal-400 text-sm font-bold">Ankadifotsy S2</p>
        </div>
      </div>

      {/* Main Action Area */}
      {!isScanning && !lastScanned && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-32 h-32 rounded-full border-4 border-teal-500/20 flex items-center justify-center animate-pulse">
             <Scan size={60} className="text-teal-400" />
          </div>
          <h2 className="text-xl font-bold">Ready to Collect</h2>
          <button 
            onClick={mockScan}
            className="button w-full py-6 text-xl font-black bg-teal-600 shadow-[0_0_20px_rgba(13,148,136,0.5)]"
          >
            OPEN CAMERA SCANNER
          </button>
        </div>
      )}

      {/* Scanning State Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-teal-400 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-teal-400 animate-scan shadow-[0_0_15px_#2dd4bf]"></div>
          </div>
          <p className="mt-10 text-xl font-bold animate-pulse">Scanning Bin QR Code...</p>
          <button onClick={() => setIsScanning(false)} className="mt-20 opacity-50"><X size={40} /></button>
        </div>
      )}

      {/* Result Card */}
      {lastScanned && (
        <div className="animate-in slide-in-from-bottom-5 duration-500">
          <div className="card bg-white border-none text-gray-900 mb-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
              <CheckCircle2 className="text-green-500" size={32} />
              <div>
                <h3 className="text-lg font-black">{lastScanned.status}</h3>
                <p className="text-sm opacity-60">ID: {lastScanned.id}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Citizen:</span>
                <span className="font-bold">{lastScanned.citizen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-bold">{lastScanned.fokontany} - {lastScanned.sector}</span>
              </div>
            </div>

            <button 
              onClick={() => setLastScanned(null)}
              className="button w-full bg-green-600 hover:bg-green-700 font-bold py-4 rounded-xl shadow-lg"
            >
              CONFIRM COLLECTION
            </button>
            <button 
              onClick={() => setLastScanned(null)}
              className="w-full mt-4 text-red-500 text-sm font-bold flex items-center justify-center gap-2"
            >
              <AlertTriangle size={16} /> Report Issue (e.g. Bin Broken)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}