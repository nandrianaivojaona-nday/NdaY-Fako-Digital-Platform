// services/eventLogService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { OfferEvent, OfferEventType } from "@/lib/domain/subscription/offerTypes";

export async function logOfferEvent(input: {
  type: OfferEventType;
  offerId: string;
  operatorId: string;
  actorUserId: string;
  actorRole: string;
  versionId?: string;
  versionNumber?: number;
  previousVersionId?: string;
  changes?: Record<string, unknown>;
  note?: string;
}): Promise<OfferEvent> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection(collections.offerEvents).doc();
  const event: OfferEvent = {
    id: ref.id,
    ...input,
    timestamp: Date.now(),
  };
  await ref.set(event);
  return event;
}