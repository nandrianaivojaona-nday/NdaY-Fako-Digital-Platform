// lib/syncDraftToFirestore.ts
import {
    doc,
    setDoc,
    serverTimestamp,
  } from "firebase/firestore";
  import { getDb } from "@/lib/firebase";
  import {useEffect, useState} from "react"
  import { AssessmentDraft } from "@/types/campaign";
  

  const [db, setDb] = useState<any>(null);

useEffect(() => {
  const firestore = getDb();
  setDb(firestore);
}, []);

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
  