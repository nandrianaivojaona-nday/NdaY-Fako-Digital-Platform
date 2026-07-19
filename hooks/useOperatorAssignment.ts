// /hooks/useOperatorAssignment.ts
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDb } from "../lib/firebase/firebaseApp";
import { Campaign } from "../types/campaign";

import type { Operator } from "../types/operator";

export function useOperatorAssignment(campaignId: string) {
  const router = useRouter();
  const db = getDb();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = {
    DRAFT: "DRAFT",
    VALIDATED_FOR_ACTIVATION: "VALIDATED_FOR_ACTIVATION",
    OPERATOR_ASSIGNED: "OPERATOR_ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
  };
  const CampaignStatus = campaign ? campaign.status : null;


  // Fetch campaign and operators
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Get campaign
        const campaignRef = doc(db, "campaigns", campaignId);
        const campaignSnap = await getDoc(campaignRef);

        if (!campaignSnap.exists()) {
          setError("Campaign not found");
          setIsLoading(false);
          return;
        }

        const campaignData = campaignSnap.data() as Campaign;

        // Check if campaign is validated
        if (!CampaignStatus || campaignData.status !== status.VALIDATED_FOR_ACTIVATION) {
          setError("Campaign must be validated before assignment");
          setIsLoading(false);
          return;
        }

        setCampaign({ ...campaignData, id: campaignId });

        // 2. Get eligible operators
        // Only operators with status "active" or "pending"
        const operatorsRef = collection(db, "operators");
        const q = query(
          operatorsRef,
          where("status", "in", ["active", "pending"])
        );

        const operatorsSnap = await getDocs(q);

        // 3. Filter operators by geographic area (if campaign has zone/fokontany)
        const operatorsData = operatorsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Operator[];

        // Optional: Filter by campaign zone
        let filteredOperators = operatorsData;
        if (campaignData.zone || campaignData.fokontany) {
          filteredOperators = operatorsData.filter(
            (op) =>
              op.zone === campaignData.zone ||
              op.fokontany === campaignData.fokontany
          );
        }

        setOperators(filteredOperators);

        // Auto-select if only one operator
        if (filteredOperators.length === 1) {
          setSelectedOperatorId(filteredOperators[0].id);
        }

        console.log(`✅ Found ${filteredOperators.length} eligible operators`);
      } catch (err) {
        console.error("Error loading assignment data:", err);
        setError("Failed to load assignment data");
      } finally {
        setIsLoading(false);
      }
    }

    if (campaignId) loadData();
  }, [campaignId, db]);

  const setSelected = useCallback((id: string) => {
    setSelectedOperatorId(id);
  }, []);

  // Assign operator to campaign
  const assignOperator = useCallback(async () => {
    if (!selectedOperatorId) {
      setError("Please select an operator");
      return;
    }

    if (!campaign) {
      setError("Campaign not available");
      return;
    }

    setIsAssigning(true);
    setError(null);

    try {
      const operator = operators.find((op) => op.id === selectedOperatorId);
      if (!operator) {
        throw new Error("Operator not found");
      }

      // 1. Update campaign with operator assignment
      const campaignRef = doc(db, "campaigns", campaignId);
      await updateDoc(campaignRef, {
        assignedOperatorId: selectedOperatorId,
        assignedOperatorName: operator.name,
        status: "OPERATOR_ASSIGNED",
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create operator-campaign binding
      const bindingRef = doc(
        collection(db, "operatorCampaigns"),
        `${selectedOperatorId}_${campaignId}`
      );
      await setDoc(bindingRef, {
        operatorId: selectedOperatorId,
        campaignId: campaignId,
        status: "ASSIGNED",
        assignedAt: serverTimestamp(),
        pricingMode: campaign.pricingFramework?.mode || "BOUNDED",
        pricingMin: campaign.pricingFramework?.min || 2000,
        pricingMax: campaign.pricingFramework?.max || 10000,
        pricingRecommended: campaign.pricingFramework?.recommended || 5000,
        commission: campaign.financialRules?.commission || 10,
        paymentMethods: campaign.financialRules?.methods || ["mobile_money"],
        createdAt: serverTimestamp(),
      });

      // 3. Trigger operator environment initialization
      // Call Cloud Run API to auto-provision operator environment
      try {
        await fetch(`/api/operators/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operatorId: selectedOperatorId,
            campaignId: campaignId,
            pricing: {
              mode: campaign.pricingFramework?.mode || "BOUNDED",
              min: campaign.pricingFramework?.min || 2000,
              recommended: campaign.pricingFramework?.recommended || 5000,
              max: campaign.pricingFramework?.max || 10000,
            },
          }),
        });
      } catch (apiError) {
        console.warn("Operator init API failed, but assignment persisted:", apiError);
        // Continue - Firestore assignment is done
      }

      // 4. Redirect to success or dashboard
      router.push(`/campaigns/${campaignId}/assignment-success`);
    } catch (err) {
      console.error("Assignment failed:", err);
      setError(err instanceof Error ? err.message : "Assignment failed");
      setIsAssigning(false);
    }
  }, [selectedOperatorId, campaign, operators, campaignId, db, router]);

  return {
    campaign,
    operators,
    selectedOperatorId,
    setSelectedOperator: setSelected,
    assignOperator,
    isLoading,
    isAssigning,
    error,
  };
}