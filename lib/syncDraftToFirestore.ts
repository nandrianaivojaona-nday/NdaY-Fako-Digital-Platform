// lib/syncDraftToFirestore.ts
import { onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";

export function watchDraftSync(
  campaignId: string,
  userId: string,
  callback: (status: { hasPendingWrites: boolean; fromCache: boolean }) => void
): () => void {
  const db = getDb();
  const ref = doc(db, "assessmentDrafts", `${campaignId}_${userId}`);
  const unsubscribe = onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      callback({
        hasPendingWrites: snap.metadata.hasPendingWrites,
        fromCache: snap.metadata.fromCache,
      });
    }
  );
  return unsubscribe;
}

// ----- Exported function for useAssessmentDraft -----

export async function syncDraftToFirestore(campaignId: string, userId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, "assessmentDrafts", `${campaignId}_${userId}`);
  await updateDoc(ref, {
    _syncedAt: serverTimestamp(),
  });
}