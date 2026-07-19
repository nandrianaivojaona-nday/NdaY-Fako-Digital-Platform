import { Suspense } from "react";
import AssessmentContent from "./AssessmentContent";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-emerald-400 border-solid mx-auto" />
        <p className="mt-4 text-white/60">Loading assessment...</p>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AssessmentContent />
    </Suspense>
  );
}