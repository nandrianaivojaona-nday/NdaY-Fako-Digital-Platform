"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export default function AdminCampaignPage() {
  const params = useParams();
  const campaignId = params?.campaignId as string;

  const db = getDb();

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [operatorId, setOperatorId] = useState("");

  useEffect(() => {
    if (!campaignId) return;

    const fetchCampaign = async () => {
      const ref = doc(db, "campaigns", campaignId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setCampaign(snap.data());
      }

      setLoading(false);
    };

    fetchCampaign();
  }, [campaignId]);

  // ✅ Approve Campaign
  const handleApprove = async () => {
    const ref = doc(db, "campaigns", campaignId);

    await updateDoc(ref, {
      status: "APPROVED",
      approval: {
        isApproved: true,
        approvedAt: serverTimestamp(),
        approvedBy: "admin" // replace later with auth user
      },
      updatedAt: serverTimestamp()
    });

    alert("Campaign Approved");
    location.reload();
  };

  // ✅ Assign Operator
  const handleAssignOperator = async () => {
    if (!operatorId) {
      alert("Enter Operator ID");
      return;
    }

    const ref = doc(db, "campaigns", campaignId);

    await updateDoc(ref, {
      status: "OPERATOR_ASSIGNED",
      assignedOperatorId: operatorId,
      assignedAt: serverTimestamp(),
      assignedBy: "admin",
      updatedAt: serverTimestamp()
    });

    alert("Operator Assigned");
    location.reload();
  };

  if (loading) return <div>Loading...</div>;
  if (!campaign) return <div>Campaign not found</div>;

  return (
    <div className="p-6 space-y-6 text-white">
      <h1 className="text-2xl font-bold">Campaign Admin Panel</h1>

      {/* STATUS */}
      <div className="bg-white/10 p-4 rounded">
        <p><strong>Status:</strong> {campaign.status}</p>
        <p><strong>Locked:</strong> {campaign.isLocked ? "Yes" : "No"}</p>
      </div>

      {/* ASSESSMENT */}
      <div className="bg-white/10 p-4 rounded">
        <p><strong>Assessment Complete:</strong> {campaign?.assessment?.isComplete ? "Yes" : "No"}</p>
      </div>

      {/* APPROVAL */}
      <div className="bg-white/10 p-4 rounded space-y-2">
        <p><strong>Approved:</strong> {campaign?.approval?.isApproved ? "Yes" : "No"}</p>

        {!campaign?.approval?.isApproved && campaign?.assessment?.isComplete && (
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 rounded"
          >
            Approve Campaign
          </button>
        )}
      </div>

      {/* OPERATOR ASSIGNMENT */}
      <div className="bg-white/10 p-4 rounded space-y-2">
        <p><strong>Assigned Operator:</strong> {campaign.assignedOperatorId || "None"}</p>

        {campaign?.approval?.isApproved && !campaign.assignedOperatorId && (
          <>
            <input
              type="text"
              placeholder="Enter Operator ID"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="px-3 py-2 text-black rounded"
            />
            <button
              onClick={handleAssignOperator}
              className="px-4 py-2 bg-blue-600 rounded"
            >
              Assign Operator
            </button>
          </>
        )}
      </div>
    </div>
  );
}