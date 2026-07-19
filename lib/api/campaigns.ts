import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { Campaign } from "@/types/campaign";
import {useState, useEffect} from "react"


const [db, setDb] = useState<any>(null);

useEffect(() => {
  const firestore = getDb();
  setDb(firestore);
}, []);

export async function getCampaigns(): Promise<Campaign[]> {
  const snapshot = await getDocs(collection(db, "campaigns"));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Campaign[];
}