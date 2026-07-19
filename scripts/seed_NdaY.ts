import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* =========================
   IMPORT DOMAIN MODULES
========================= */
import { REGIONS } from "../lib/territory/regions.js";

/* =========================
   PATH FIX
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   INIT FIREBASE
========================= */
const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../scripts/serviceAccountKey.json"),
    "utf8"
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* =========================
   NORMALIZER
========================= */

function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

/* =========================
   REGION RESOLUTION
========================= */

function resolveRegionName(code: string): string {
  const map: Record<string, string> = {
    ANA: "ANALAMANGA",
    VAT: "VATOVAVY",
    ALA: "ALAOTRA_MANGORO"
  };

  return map[code] || code;
}

/* =========================
   TYPES
========================= */

type TGS = {
  cty: "MDG";
  reg: {
    name: string;
    iso: string;
    nrc: string;
  };
  dis: string;
  com: string;
  fkt: string;
};

type Fokontany = {
  id: string;
  name: string;
  municipalityId: string;
  arrondissementId: string | null;
  type: "URBAN" | "RURAL";
  geometry: string;
  sectorIds?: string[];
  tgs: TGS;
};

/* =========================
   LOAD GEOJSON
========================= */

const raw = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../seed/pilot/nday_fako_pilots.json"),
    "utf8"
  )
);

/* =========================
   BUILD TGS (CORE LOGIC)
========================= */

function buildTGS(p: any): TGS {
  // Example: ANA-CUA-ARR4-...
  const regionCode = p.id.split("-")[0];

  const regionName = resolveRegionName(regionCode);
  const regionMeta = REGIONS[regionName];

  if (!regionMeta) {
    throw new Error(`❌ Unknown region: ${regionName}`);
  }

  return {
    cty: "MDG",
    reg: {
      name: regionName,
      iso: regionMeta.iso,
      nrc: regionMeta.nrc
    },
    dis: normalizeName(p.arrondissementId || "NO_DISTRICT"),
    com: normalizeName(p.municipalityId),
    fkt: normalizeName(p.name)
  };
}

/* =========================
   TRANSFORM GEOJSON
========================= */

function extractFokontany(features: any[]): Fokontany[] {
  return features.map((f) => {
    const p = f.properties;
    const tgs = buildTGS(p);

    return {
      id: p.id, // KEEP ORIGINAL
      name: normalizeName(p.name),
      municipalityId: p.municipalityId,
      arrondissementId: p.arrondissementId ?? null,
      type: p.type,
      geometry: JSON.stringify(f.geometry),
      sectorIds: p.sectorIds ?? [],
      tgs
    };
  });
}

/* =========================
   BATCH WRITER
========================= */

const BATCH_LIMIT = 400;

async function batchWrite<T extends { id: string }>(
  collection: string,
  items: T[]
) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();

    chunk.forEach((item) => {
      const ref = db.collection(collection).doc(item.id);
      batch.set(ref, item, { merge: true });
    });

    await batch.commit();
    console.log(`✅ ${collection} batch ${i / BATCH_LIMIT + 1}`);
  }
}

/* =========================
   SEED EXECUTION
========================= */

async function seed() {
  try {
    console.log("🚀 Seeding NdaY (NO GEO CHANGE + TGS ENRICHMENT)...");

    const fokontany = extractFokontany(raw.features);

    await batchWrite("fokontany", fokontany);

    console.log("🎉 SEED COMPLETED WITH TGS + ISO + NRC!");
    process.exit(0);

  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

seed();