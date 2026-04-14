import {
    doc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp,
  } from "firebase/firestore";
  
  import { db } from "@/lib/firebase";
  
  import { generateAuditId } from "./generateAuditId";
  import { AuditForm } from "./auditTypes";
  
  
  export async function saveAudit(
    form: AuditForm,
    status: string
  ) {
  
    const id = generateAuditId({
      municipalityId: form.municipalityId,
      arrondissementId: form.arrondissementId,
      fokontanyId: form.fokontanyId,
      operatorId: form.operatorId || "unassigned",
      counter: Date.now(),
    });
  
    const audit = {
      ...form,
      id,
      auditStatus: status,
      // Crucial for Admin Reporting
      profitabilityAnalysis: {
        score: form.deploymentScore,
        isViable: form.isProfitable
    },
    createdAt: serverTimestamp(),
    };
    // 1. Save the Audit
    await setDoc(
      doc(db, "audits", id),
      audit
    );
    // 2. TRIGGER NOTIFICATIONS if profitable
    if (form.isProfitable) {
      const notificationBase = {
          auditId: id,
          clusterName: form.clusterName,
          isRead: false,
          timestamp: serverTimestamp(),
      };

      // Notify Administrator
      await addDoc(collection(db, "notifications"), {
          ...notificationBase,
          targetRole: "admin",
          message: `⚠️ Action Required: New high-impact audit (${id}) ready for validation.`
      });

      // Notify Assigned Operator
      if (form.operatorId) {
          await addDoc(collection(db, "notifications"), {
              ...notificationBase,
              targetRole: "operator",
              operatorId: form.operatorId,
              message: `🚚 New Deployment: Profitable site detected in ${form.clusterName}. Prepare for bin delivery.`
          });
      }
  }
  
    return id;
  }