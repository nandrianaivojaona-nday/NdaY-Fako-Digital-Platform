import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import type { Collector } from "@/types/collector";
import { deleteDoc, doc, setDoc } from "firebase/firestore"

export const useCollectors = () => {
  const db = getDb(); // ✅ important

  const getCollectors = async (operatorId: string): Promise<Collector[]> => {
    const q = query(
      collection(db, "collectors"),
      where("operatorId", "==", operatorId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Collector, "id">),
    }));
  };

  const createCollector = async (
    operatorId: string,
    data: Partial<Collector>
  ) => {
    await addDoc(collection(db, "collectors"), {
      ...data,
      operatorId,
    });
  };

  const deleteCollector = async (collectorId: string) => {
    const db = getDb();
    await deleteDoc(doc(db, "collectors", collectorId));
  };



  return { getCollectors, createCollector, deleteCollector };
};
export function useOperatorProfile() {
  const db = getDb();

  const saveProfile = async (operatorId: string, profile: any) => {
    await setDoc(
      doc(db, "operators", operatorId),
      profile,
      { merge: true }
    );
  };

  return { saveProfile };
}