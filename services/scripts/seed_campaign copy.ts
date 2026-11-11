import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const campaigns = [
  {
    name: "Fanadiovana Analakely",
    fokontany: "Analakely",
    municipality: "Antananarivo",
    status: "CRITICAL",
    reward: 15000,
    operatorsJoined: 3,
    operatorSlots: 10,
    createdAt: Date.now(),
  },
  {
    name: "Marché Anosibe Cleanup",
    fokontany: "Anosibe",
    municipality: "Antananarivo",
    status: "ONGOING",
    reward: 12000,
    operatorsJoined: 6,
    operatorSlots: 10,
    createdAt: Date.now(),
  },
  {
    name: "Ambanidia Streets",
    fokontany: "Ambanidia",
    municipality: "Antananarivo",
    status: "VALIDATED",
    reward: 10000,
    operatorsJoined: 0,
    operatorSlots: 8,
    createdAt: Date.now(),
  },
];

async function seed() {
  for (const c of campaigns) {
    await addDoc(collection(db, "campaigns"), c);
  }
}

seed();