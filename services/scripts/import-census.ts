// scripts/import-census.ts
//
// Imports EPM, MICS, RGPH, PCD datasets into Firestore and assembles
// Clusters from them.
//
// Sources (JSON):
//   scripts/seed/census/epm.json       (array of EPMRecord)
//   scripts/seed/census/mics.json      (array of MICSRecord)
//   scripts/seed/census/rgph.json      (array of RGPHRecord)
//   scripts/seed/census/pcd.json       (array of PCDRecord)
//   scripts/seed/census/clusters.json  (array of cluster blueprints)
//
// Usage:
//   npx ts-node scripts/import-census.ts --dry-run
//   npx ts-node scripts/import-census.ts --apply
//
// Idempotent — safe to re-run. Uses dataset+id as deterministic doc ids.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const DRY_RUN = !process.argv.includes("--apply");
const SEED_DIR = path.resolve(__dirname, "seed/census");

interface EPM { regionId: string; [k: string]: any; }
interface MICS { fokontanyId: string; [k: string]: any; }
interface RGPH { fokontanyId: string; [k: string]: any; }
interface PCD { communeId: string; [k: string]: any; }

interface ClusterBlueprint {
  id: string;
  regionId: string;
  communeId: string;
  fokontanyIds: string[];
  name: string;
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }
  const db = getFirestore();

  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}`);
  console.log(`Seed dir: ${SEED_DIR}`);

  const report = {
    epm: 0, mics: 0, rgph: 0, pcd: 0, clusters: 0,
    errors: [] as string[],
  };

  // ----------------------------------------------------------------
  // 1. EPM — keyed by regionId
  // ----------------------------------------------------------------
  const epmList: EPM[] = readJson("epm.json");
  for (const rec of epmList) {
    if (!rec.regionId) {
      report.errors.push(`EPM missing regionId: ${JSON.stringify(rec).slice(0, 80)}`);
      continue;
    }
    const ref = db.collection("census_epm").doc(rec.regionId);
    if (DRY_RUN) {
      console.log(`[DRY] census_epm/${rec.regionId}`);
    } else {
      await ref.set(rec, { merge: true });
    }
    report.epm++;
  }

  // ----------------------------------------------------------------
  // 2. MICS — keyed by fokontanyId
  // ----------------------------------------------------------------
  const micsList: MICS[] = readJson("mics.json");
  for (const rec of micsList) {
    if (!rec.fokontanyId) {
      report.errors.push(`MICS missing fokontanyId`);
      continue;
    }
    const ref = db.collection("census_mics").doc(rec.fokontanyId);
    if (DRY_RUN) console.log(`[DRY] census_mics/${rec.fokontanyId}`);
    else await ref.set(rec, { merge: true });
    report.mics++;
  }

  // ----------------------------------------------------------------
  // 3. RGPH — keyed by fokontanyId
  // ----------------------------------------------------------------
  const rgphList: RGPH[] = readJson("rgph.json");
  for (const rec of rgphList) {
    if (!rec.fokontanyId) {
      report.errors.push(`RGPH missing fokontanyId`);
      continue;
    }
    const ref = db.collection("census_rgph").doc(rec.fokontanyId);
    if (DRY_RUN) console.log(`[DRY] census_rgph/${rec.fokontanyId}`);
    else await ref.set(rec, { merge: true });
    report.rgph++;
  }

  // ----------------------------------------------------------------
  // 4. PCD — keyed by communeId
  // ----------------------------------------------------------------
  const pcdList: PCD[] = readJson("pcd.json");
  for (const rec of pcdList) {
    if (!rec.communeId) {
      report.errors.push(`PCD missing communeId`);
      continue;
    }
    const ref = db.collection("census_pcd").doc(rec.communeId);
    if (DRY_RUN) console.log(`[DRY] census_pcd/${rec.communeId}`);
    else await ref.set(rec, { merge: true });
    report.pcd++;
  }

  // ----------------------------------------------------------------
  // 5. Clusters — assembled from the four datasets
  // ----------------------------------------------------------------
  const blueprints: ClusterBlueprint[] = readJson("clusters.json");
  for (const bp of blueprints) {
    const epmDoc = await db.collection("census_epm").doc(bp.regionId).get();
    const pcdDoc = await db.collection("census_pcd").doc(bp.communeId).get();
    if (!epmDoc.exists) {
      report.errors.push(`Cluster ${bp.id}: EPM ${bp.regionId} not found`);
      continue;
    }
    if (!pcdDoc.exists) {
      report.errors.push(`Cluster ${bp.id}: PCD ${bp.communeId} not found`);
      continue;
    }

    const micsRecords = [];
    const rgphRecords = [];
    for (const fkt of bp.fokontanyIds) {
      const m = await db.collection("census_mics").doc(fkt).get();
      const r = await db.collection("census_rgph").doc(fkt).get();
      if (!m.exists) report.errors.push(`Cluster ${bp.id}: MICS ${fkt} missing`);
      else micsRecords.push(m.data());
      if (!r.exists) report.errors.push(`Cluster ${bp.id}: RGPH ${fkt} missing`);
      else rgphRecords.push(r.data());
    }

    const totalHouseholds = rgphRecords.reduce((s: number, r: any) => s + (r.households ?? 0), 0);
    const totalPopulation = rgphRecords.reduce((s: number, r: any) => s + (r.population ?? 0), 0);

    // Derive present segments from density + housing quality
    const presentSegments = derivePresentSegments(micsRecords, rgphRecords, pcdDoc.data());

    const cluster = {
      id: bp.id,
      regionId: bp.regionId,
      communeId: bp.communeId,
      fokontanyIds: bp.fokontanyIds,
      name: bp.name,
      epm: epmDoc.data(),
      mics: micsRecords,
      rgph: rgphRecords,
      pcd: pcdDoc.data(),
      totalHouseholds,
      totalPopulation,
      presentSegments,
      builtAt: Date.now(),
      source: "MICS_PIPELINE",
    };

    const ref = db.collection("clusters").doc(bp.id);
    if (DRY_RUN) {
      console.log(`[DRY] clusters/${bp.id}: ${totalHouseholds} HH, ${presentSegments.join(",")}`);
    } else {
      await ref.set(cluster, { merge: true });
    }
    report.clusters++;
  }

  // ----------------------------------------------------------------
  // Report
  // ----------------------------------------------------------------
  console.log("\n=== Report ===");
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync("census-import-report.json", JSON.stringify(report, null, 2));
}

function readJson<T>(filename: string): T[] {
  const p = path.join(SEED_DIR, filename);
  if (!fs.existsSync(p)) {
    console.warn(`[warn] ${filename} not found — skipping`);
    return [];
  }
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function derivePresentSegments(mics: any[], rgph: any[], pcd: any): string[] {
  const segments: string[] = ["household"]; // always present
  const avgDensity =
    rgph.reduce((s, r) => s + (r.densityFactor ?? 0), 0) / Math.max(1, rgph.length);

  if (avgDensity >= 1500) segments.push("building");
  if ((pcd?.publicBinPoints?.length ?? 0) > 0) segments.push("school");
  if (avgDensity >= 3000) {
    segments.push("business");
    segments.push("hotel");
    segments.push("event");
  }
  if ((pcd?.wildDumpSites?.length ?? 0) > 0) segments.push("institutional");
  if (avgDensity >= 5000) segments.push("vip");

  return segments;
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});