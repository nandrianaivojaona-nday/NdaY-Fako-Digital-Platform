import "dotenv/config"; // Must be the first import
import { db } from "./lib/firebase.ts"; //intentionally using .ts to ensure types are available in this script
import {
  collection,
  doc,
  setDoc,
} from "firebase/firestore";

import fokontanyData from "../seed/pilot/nday_fako_pilots.json";

// ==============================
// HELPERS
// ==============================

function randomStatus() {
  const r = Math.random();
  if (r < 0.25) return "CRITICAL";
  if (r < 0.65) return "ONGOING";
  return "VALIDATED";
}

function rewardByType(type: string) {
  return type === "URBAN"
    ? [10000, 12000, 15000]
    : [5000, 8000];
}

// ==============================
// SEED FUNCTION
// ==============================

async function seed() {
  try {
    console.log("🎬 Seeding DEMO campaigns...");

    for (const feature of fokontanyData.features) {

      const { id, name, municipalityId } = feature.properties;

      await setDoc(
        doc(db, "campaigns", `campaign_${id}`),
        {
          name: "NdaY'Fako Pilot Campaign",
          fokontany: name,
          municipality: municipalityId,

          status: "ONGOING",
          reward: 10000,

          operatorsJoined: Math.floor(Math.random() * 5),
          operatorSlots: 10,

          createdAt: Date.now(),
        },
        { merge: true }
      );

      console.log(`✅ ${name}`);
    }

    console.log("🚀 Demo ready");
    process.exit(0); // Add this to close the script connection

  } catch (error: any) {
    console.error("❌ FULL ERROR:");
    console.error(error);
    console.error("❌ MESSAGE:", error?.message);
    console.error("❌ STACK:", error?.stack);
  }
}

seed();