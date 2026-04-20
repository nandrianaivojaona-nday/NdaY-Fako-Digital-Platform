// lib/syncDraftToFirestore.ts
import {
    doc,
    setDoc,
    serverTimestamp,
  } from "firebase/firestore";
  import { db } from "@/lib/firebase";
  import { AssessmentDraft } from "@/types/campaign";
  
  export async function syncDraftToFirestore(
    campaignId: string,
    operatorId: string,
    draft: AssessmentDraft
  ) {
    const ref = doc(db, "assessmentDrafts", `${campaignId}_${operatorId}`);
  
    await setDoc(
      ref,
      {
        ...draft,
        campaignId,
        operatorId,
        updatedAt: serverTimestamp(),
        syncState: "PENDING_OR_SYNCED",
      },
      { merge: true }
    );
  }
  