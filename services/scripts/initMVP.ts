import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function initMVP() {

  // CLUSTERS

  await setDoc(doc(db, "clusters", "mah"), {
    name: "Mahamasina",
    arrondissement: 4,
    city: "Antananarivo",
  });

  await setDoc(doc(db, "clusters", "soa"), {
    name: "Soanierana",
    arrondissement: 4,
    city: "Antananarivo",
  });

  await setDoc(doc(db, "clusters", "tsi"), {
    name: "Tsimbazaza",
    arrondissement: 4,
    city: "Antananarivo",
  });

  await setDoc(doc(db, "clusters", "ank"), {
    name: "Ankadimbahoaka",
    arrondissement: 4,
    city: "Antananarivo",
  });

  // PLANS

  await setDoc(doc(db, "plans", "villa"), {
    name: "Villa Premium",
    targetType: "villa",
    frequency: "4x_week",
  });

  await setDoc(doc(db, "plans", "apartment"), {
    name: "Apartment Daily",
    targetType: "apartment",
    frequency: "6x_week",
  });

  await setDoc(doc(db, "plans", "commercial"), {
    name: "Commercial Pro",
    targetType: "commercial",
    frequency: "custom",
  });

  // OPERATOR

  await setDoc(doc(db, "operators", "nday01"), {
    name: "NdaY Pilot",
    city: "Antananarivo",
    rating: 5,
    recyclingRate: 70,
    pickupsDone: 0,
    subscribers: 0,
    zones: [],
    marketingText: "Official pilot operator",
  });

}