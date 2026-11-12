// Deletes subscriptions that fail the "valid shape" check.
// Dry-run by default. --apply to delete.
// --ids "id1,id2" restricts to a specific list; default is auto-detect.
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const idsArg = process.argv.find((a) => a.startsWith("--ids="))?.slice(6);
const explicitIds = idsArg ? idsArg.split(",").map((s) => s.trim()).filter(Boolean) : null;

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Scope: ${explicitIds ? `${explicitIds.length} explicit ID(s)` : "auto-detect malformed"}\n`);

  let candidates: Array<{ id: string; reasons: string[] }> = [];

  if (explicitIds) {
    for (const id of explicitIds) {
      const snap = await db.collection("subscriptions").doc(id).get();
      if (!snap.exists) { console.log(`  ⚠️  ${id} does not exist`); continue; }
      const s = snap.data()!;
      const reasons: string[] = [];
      if (!s.citizenId) reasons.push("no_citizenId");
      if (!s.offerId) reasons.push("no_offerId");
      if (reasons.length === 0) {
        console.log(`  ❌ ${id} has required fields — NOT deleting (use manual review)`);
        continue;
      }
      candidates.push({ id, reasons });
    }
  } else {
    const all = await db.collection("subscriptions").get();
    for (const d of all.docs) {
      const s = d.data();
      const reasons: string[] = [];
      if (!s.citizenId) reasons.push("no_citizenId");
      if (!s.offerId) reasons.push("no_offerId");
      if (reasons.length > 0) candidates.push({ id: d.id, reasons });
    }
  }

  console.log(`Candidates for deletion: ${candidates.length}\n`);
  for (const c of candidates) console.log(`  ${c.id}  [${c.reasons.join(",")}]`);

  if (!APPLY) {
    console.log(`\nDry-run. Re-run with --apply to delete.`);
    return;
  }

  if (candidates.length === 0) { console.log("Nothing to delete."); return; }

  // Write an audit log before deleting
  const logRef = db.collection("_deletionAudit").doc();
  await logRef.set({
    type: "MALFORMED_SUBSCRIPTIONS_DELETED",
    deletedIds: candidates.map((c) => c.id),
    reasons: candidates,
    deletedAt: Date.now(),
    deletedBy: "cli-script",
  });

  const batch = db.batch();
  for (const c of candidates) {
    batch.delete(db.collection("subscriptions").doc(c.id));
  }
  await batch.commit();

  console.log(`\n✅ Deleted ${candidates.length} record(s). Audit log: _deletionAudit/${logRef.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });