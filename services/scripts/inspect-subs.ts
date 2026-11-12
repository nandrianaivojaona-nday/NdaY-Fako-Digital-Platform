import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

const subs = await db.collection("subscriptions").get();
console.log(`Found ${subs.size} subscription(s):\n`);
for (const d of subs.docs) {
  const s = d.data();
  console.log(`  ${d.id}`);
  console.log(`    status:           ${s.status}`);
  console.log(`    citizenId:        ${s.citizenId ?? "(missing)"}`);
  console.log(`    offerId:          ${s.offerId ?? "(MISSING)"}`);
  console.log(`    offerVersionId:   ${s.offerVersionId ?? "(missing)"}`);
  console.log(`    amountMGA:        ${s.amountMGA ?? "(missing)"}`);
  console.log(`    createdAt:        ${s.createdAt ? new Date(s.createdAt).toISOString() : "(missing)"}`);
  console.log();
}