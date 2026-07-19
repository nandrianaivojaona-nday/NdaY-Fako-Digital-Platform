// /components/operator-assignment/AssignmentActions.tsx
"use client";

import type { Campaign } from "@/types/campaign";
import { Loader2 } from "lucide-react";

interface Props {
  selectedOperatorId: string | null;
  onAssign: () => void;
  isAssigning: boolean;
  campaign: Campaign | null;
}

export default function AssignmentActions({
  selectedOperatorId,
  onAssign,
  isAssigning,
  campaign,
}: Props) {
  const isDisabled = !selectedOperatorId || isAssigning;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">
            {selectedOperatorId ? (
              <span className="text-emerald-300">✓ Operator selected</span>
            ) : (
              "Please select an operator to assign"
            )}
          </p>
        </div>

        <button
          onClick={onAssign}
          disabled={isDisabled}
          className={`px-6 py-3 rounded-xl text-white font-medium transition-all flex items-center gap-2 ${
            isDisabled
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:scale-[1.02]"
          }`}
        >
          {isAssigning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              Assign Operator
              <span className="text-white/60 text-xs ml-2">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}