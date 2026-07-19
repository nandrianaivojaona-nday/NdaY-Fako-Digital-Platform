import admin from "firebase-admin";
import { authoritiesSeed } from "@/seed/authoritiesSeed.js";

// 🔐 Initialize Firebase Admin (safe for local + CI)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

// 🌱 Seed function
async function seedAuthorities() {
  console.log("🌱 Seeding authorities...");

  const batch = db.batch();

  for (const item of authoritiesSeed) {
    const ref = db.collection("authorities").doc(item.id);

    // remove id from stored data (clean Firestore docs)
    const { id, ...data } = item;

    batch.set(
      ref,
      {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // ✅ prevents overwrite issues
    );

    console.log(`→ Prepared: ${item.id}`);
  }

  await batch.commit();

  console.log("✅ Authorities successfully seeded/updated");
}

// 🚀 Execute
seedAuthorities()
  .then(() => {
    console.log("🎉 Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error seeding authorities:", error);
    process.exit(1);
  });