import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Campaign } from "@/types/campaign";


export async function getCampaigns(): Promise<Campaign[]> {
  const snapshot = await getDocs(collection(db, "campaigns"));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Campaign[];
}