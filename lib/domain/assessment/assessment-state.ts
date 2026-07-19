// lib/assessment-state.ts
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { AssessmentDraft, AssessmentStep } from "@/types/campaign";

// Re-export the type so other files can import from here
export type { AssessmentDraft };

export async function getAssessmentDraft(campaignId: string, userId: string): Promise<AssessmentDraft | null> {
  const db = getDb();
  const ref = doc(db, "assessmentDrafts", `${campaignId}_${userId}`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return { ...data, id: snap.id } as AssessmentDraft;
  }
  return null;
}

export async function saveAssessmentDraft(draft: Partial<AssessmentDraft>): Promise<void> {
  const db = getDb();
  const { campaignId, userId, ...data } = draft;
  if (!campaignId || !userId) throw new Error("Missing campaignId or userId");
  const ref = doc(db, "assessmentDrafts", `${campaignId}_${userId}`);
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function createDraft(campaignId: string, userId: string, initialData: any = {}): Promise<AssessmentDraft> {
  const id = `${campaignId}_${userId}`;
  const draft: AssessmentDraft = {
    id,
    campaignId,
    userId,
    operatorId: userId,
    currentStep: "BRIEF" as AssessmentStep,
    pendingSync: false,
    offline: false,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    ...initialData,
  };
  await saveAssessmentDraft(draft);
  return draft;
}

export async function markPendingSync(campaignId: string, userId: string, pending: boolean): Promise<void> {
  await saveAssessmentDraft({ campaignId, userId, pendingSync: pending });
}

export async function nextStep(campaignId: string, userId: string): Promise<void> {
  const draft = await getAssessmentDraft(campaignId, userId);
  if (!draft) throw new Error("Draft not found");
  const stepOrder: AssessmentStep[] = ["BRIEF", "MARKET_DEMAND", "OPERABILITY", "BANKABILITY", "RISK", "DOCUMENT", "DECISION"];
  const currentIndex = stepOrder.indexOf(draft.currentStep);
  if (currentIndex < stepOrder.length - 1) {
    await saveAssessmentDraft({ campaignId, userId, currentStep: stepOrder[currentIndex + 1] });
  }
}

export async function prevStep(campaignId: string, userId: string): Promise<void> {
  const draft = await getAssessmentDraft(campaignId, userId);
  if (!draft) throw new Error("Draft not found");
  const stepOrder: AssessmentStep[] = ["BRIEF", "MARKET_DEMAND", "OPERABILITY", "BANKABILITY", "RISK", "DOCUMENT", "DECISION"];
  const currentIndex = stepOrder.indexOf(draft.currentStep);
  if (currentIndex > 0) {
    await saveAssessmentDraft({ campaignId, userId, currentStep: stepOrder[currentIndex - 1] });
  }
}