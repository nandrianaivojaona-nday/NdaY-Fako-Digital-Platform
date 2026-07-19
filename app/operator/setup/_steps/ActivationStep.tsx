"use client";

import { useState } from "react";
import { Rocket, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ActivationStepProps {
  state: any;
  onBack: () => void;
  onSubmit: () => Promise<void> | void;
  operatorId?: string | null;
  campaignId?: string | null;
}

export default function ActivationStep({
  state,
  onBack,
  onSubmit,
  operatorId,
  campaignId,
}: ActivationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (submitted) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit();
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Activate Your Service</h2>
      </div>

      {submitted ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Setup Complete!</h3>
          <p className="text-white/60">
            Your operator profile has been successfully created. You can now start managing your services.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.href = "/operator/dashboard"}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = `/campaign/${campaignId}`}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition"
            >
              View Campaign
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <p className="text-sm text-white/70">You are about to activate:</p>
            <ul className="text-sm text-white/50 space-y-1">
              <li>• <strong className="text-white">Operator ID:</strong> {operatorId || "N/A"}</li>
              <li>• <strong className="text-white">Campaign ID:</strong> {campaignId || "N/A"}</li>
              <li>• <strong className="text-white">Services:</strong> {(state.services?.selectedTypes || []).join(", ") || "None"}</li>
              <li>• <strong className="text-white">Coverage:</strong> {state.services?.coverage || "Not set"}</li>
            </ul>
          </div>

          {submitError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Submission Error</p>
                <p className="text-sm text-red-300/70">{submitError}</p>
              </div>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-sm text-amber-300/80 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>
                Once activated, your service will be visible to citizens and authorities.
                You can modify these details later from your dashboard.
              </span>
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t border-white/10">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Activate Service
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}