// lib/api/sync/useWatchDraftSync.ts
import { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/firebaseApp';

export function useWatchDraftSync(campaignId: string, userId: string) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'cached' | 'pending' | 'synced'>('idle');

  useEffect(() => {
    if (!campaignId || !userId) {
      setSyncStatus('idle');
      return;
    }

    const db = getDb();
    const draftRef = doc(db, 'drafts', `${campaignId}_${userId}`); // adjust path as needed

    const unsubscribe = onSnapshot(
      draftRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) {
          setSyncStatus('pending');
        } else if (snap.metadata.fromCache) {
          setSyncStatus('cached');
        } else {
          setSyncStatus('synced');
        }
      },
      (error) => {
        console.error('Draft sync error:', error);
        setSyncStatus('idle');
      }
    );

    return () => unsubscribe();
  }, [campaignId, userId]);

  return syncStatus;
}