import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { Campaign } from "@/types/campaign";

export async function getCampaigns(): Promise<Campaign[]> {
  const db = getDb();
  const snapshot = await getDocs(collection(db, "campaigns"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[];
}
