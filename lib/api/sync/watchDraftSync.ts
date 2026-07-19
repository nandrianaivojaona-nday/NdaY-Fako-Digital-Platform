// lib/watchDraftSync.ts
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import {useEffect, useState} from "react"

const [db, setDb] = useState<any>(null);

useEffect(() => {
  const firestore = getDb();
  setDb(firestore);
}, []);


export function watchDraftSync(
  campaignId: string,
  operatorId: string,
  onStatus: (status: {
    exists: boolean;
    fromCache: boolean;
    hasPendingWrites: boolean;
    data: any | null;
  }) => void
) {
  const ref = doc(db, "assessmentDrafts", `${campaignId}_${operatorId}`);

  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      onStatus({
        exists: snap.exists(),
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        data: snap.exists() ? snap.data() : null
      });
    }
  );
}
