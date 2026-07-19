import { Suspense } from "react";
import OperatorSetupContent from "../OperatorSetupContent";

function SetupFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-solid mx-auto" />
        <p className="text-white/60">Loading setup...</p>
      </div>
    </div>
  );
}

export default function OperatorSetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <OperatorSetupContent />
    </Suspense>
  );
}