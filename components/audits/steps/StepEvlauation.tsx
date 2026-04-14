// components/audit/StepEvaluation.tsx
"use client";

import { StepProps } from "@/lib/audits/auditTypes";

export default function StepEvaluation({
  form,
  setForm,
  onNext,
}: StepProps) {

  const handleValidationAndNext = () => {
    if (!form.salesStatus) {
      alert("Please select a sales status to continue.");
      return;
    }
    // Trigger the parent's dissection logic
    if (onNext) onNext();
  };

  return (
    <div className="step-container">
      <h2>Step 4: Evaluation & Interest</h2>

      <div className="input-group">
        <label>Cluster/Sector Name</label>
        <input
          placeholder="e.g. Ankadimbahoaka"
          value={form.clusterName}
          onChange={(e) => setForm({ ...form, clusterName: e.target.value })}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="input-group mt-4">
        <label>Sales Status</label>
        <select
          value={form.salesStatus}
          onChange={(e) => setForm({ ...form, salesStatus: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="audited">Audited (No commitment)</option>
          <option value="interested">Interested</option>
          <option value="proposal_sent">Proposal Sent</option>
          <option value="accepted">Accepted (Ready for Deployment)</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <button 
        onClick={handleValidationAndNext}
        className="mt-6 bg-green-600 text-white px-4 py-2 rounded font-bold w-full"
      >
        Calculate ROI & View Recommendations
      </button>
    </div>
  );
}