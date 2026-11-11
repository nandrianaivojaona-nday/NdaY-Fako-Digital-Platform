// lib/territory/ingestion/hazardService.ts
//
// Provides hazard exposure for a set of fokontany. Resolution order:
//
//   1. Firestore cache (30 days)
//   2. HDX live fetch (district-level, interpolated to fokontany)
//   3. Static BNGRC CUA table (for Antananarivo communes only)
//   4. UNKNOWN
//
// Every value carries its source so the downstream TVE can compute
// confidence correctly.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import {
  getDistrictRiskWithCache,
  type DistrictRisk,
} from "./hdxRiskFetch";

export type HazardLevel =
  | "NIL"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "VERY_HIGH"
  | "UNKNOWN";

export interface HazardExposure {
  fokontanyId: string;
  floodExposure: HazardLevel;
  floodExposureScore: number;
  cycloneExposure: HazardLevel;
  historicalEvents: number;
  source: "HDX_LIVE" | "HDX_CACHE" | "BNGRC_STATIC" | "ESTIMATED";
  sourceVersion?: string;
  referenceDate?: string;
}

// ================================================================
// Static CUA fallback (Antananarivo Renivohitra only)
// ================================================================
const CUA_FLOOD_PRONE: Record<string, { level: HazardLevel; score: number }> = {
  "Andavamamba Anjezika I":     { level: "VERY_HIGH", score: 92 },
  "Andavamamba Anjezika II":    { level: "VERY_HIGH", score: 90 },
  "Antetezana Afovoany":        { level: "HIGH", score: 78 },
  "Andohatapenaka":             { level: "HIGH", score: 82 },
  "Ampefiloha":                 { level: "MODERATE", score: 55 },
  "Ambavahadimitafo":           { level: "HIGH", score: 76 },
  "Miandrarivo":                { level: "HIGH", score: 74 },
  "Ankorondrano Andranomahery": { level: "MODERATE", score: 58 },
  "Ankadifotsy":                { level: "MODERATE", score: 52 },
  "Isotry":                     { level: "HIGH", score: 80 },
  "Ambohipo":                   { level: "LOW", score: 30 },
  "Ankazomanga":                { level: "MODERATE", score: 48 },
  "Anosibe Zaivola":            { level: "MODERATE", score: 60 },
  "Analakely":                  { level: "LOW", score: 28 },
  "Tsaralalàna":                { level: "MODERATE", score: 45 },
};

// ================================================================
// Main entry point
// ================================================================
export async function fetchHazardExposureForFokontany(input: {
  communeCode: string;
  districtPcode?: string;
  fokontanyIds: string[];
}): Promise<Record<string, HazardExposure>> {
  const { communeCode, districtPcode, fokontanyIds } = input;
  const db = getFirestore(getAdminApp());

  // 1. Cache check
  const cacheRef = db.collection("hazardCache").doc(communeCode);
  const cacheDoc = await cacheRef.get();
  if (cacheDoc.exists) {
    const data = cacheDoc.data()!;
    const ageDays = (Date.now() - data.fetchedAt) / (24 * 60 * 60 * 1000);
    if (ageDays < 30) {
      return data.exposure as Record<string, HazardExposure>;
    }
  }

  // 2. HDX live fetch
  if (districtPcode) {
    try {
      const districtRisk = await getDistrictRiskWithCache();
      const risk = districtRisk.get(districtPcode);
      if (risk) {
        const exposure = applyDistrictRiskToFokontany({
          fokontanyIds,
          districtRisk: risk,
        });
        await cacheRef.set({
          exposure,
          fetchedAt: Date.now(),
          source: "HDX_LIVE",
          sourceVersion: risk.adm2Pcode,
          referenceDate: new Date().toISOString(),
        });
        return exposure;
      }
    } catch (err) {
      console.warn("[hazardService] HDX fetch failed, falling back to static:", err);
    }
  }

  // 3. Static CUA fallback
  if (communeCode === "11001" || communeCode.startsWith("CUA")) {
    const staticResult = buildFromStaticCUA(fokontanyIds);
    if (Object.keys(staticResult).length > 0) {
      await cacheRef.set({
        exposure: staticResult,
        fetchedAt: Date.now(),
        source: "BNGRC_STATIC",
      });
      return staticResult;
    }
  }

  // 4. UNKNOWN
  const fallback: Record<string, HazardExposure> = {};
  for (const id of fokontanyIds) {
    fallback[id] = {
      fokontanyId: id,
      floodExposure: "UNKNOWN",
      floodExposureScore: 0,
      cycloneExposure: "UNKNOWN",
      historicalEvents: 0,
      source: "ESTIMATED",
    };
  }
  return fallback;
}

// ================================================================
// Interpolation — district → fokontany
// ================================================================
function applyDistrictRiskToFokontany(input: {
  fokontanyIds: string[];
  districtRisk: DistrictRisk;
}): Record<string, HazardExposure> {
  const { fokontanyIds, districtRisk } = input;
  const result: Record<string, HazardExposure> = {};
  const n = fokontanyIds.length;

  fokontanyIds.forEach((id, i) => {
    // Central fokontany inherit full district exposure; peripheral taper by 20%
    const centrality = 1 - (i / Math.max(1, n)) * 0.2;
    const floodScore = Math.round(districtRisk.floodExposure * centrality);
    const cycloneScore = Math.round(districtRisk.cycloneExposure * centrality);

    result[id] = {
      fokontanyId: id,
      floodExposure: scoreToLevel(floodScore),
      floodExposureScore: floodScore,
      cycloneExposure: scoreToLevel(cycloneScore),
      historicalEvents: estimateHistoricalEvents(floodScore),
      source: "HDX_LIVE",
      sourceVersion: districtRisk.adm2Pcode,
      referenceDate: new Date().toISOString().split("T")[0],
    };
  });

  return result;
}

// ================================================================
// Static CUA builder
// ================================================================
function buildFromStaticCUA(fokontanyIds: string[]): Record<string, HazardExposure> {
  const result: Record<string, HazardExposure> = {};
  for (const id of fokontanyIds) {
    const name = id.replace(/^CUA-\d+-/, "").replace(/-/g, " ").trim();
    const match = CUA_FLOOD_PRONE[name];
    if (match) {
      result[id] = {
        fokontanyId: id,
        floodExposure: match.level,
        floodExposureScore: match.score,
        cycloneExposure: "MODERATE",
        historicalEvents: estimateHistoricalEvents(match.score),
        source: "BNGRC_STATIC",
      };
    }
  }
  return result;
}

// ================================================================
// Helpers
// ================================================================
function scoreToLevel(score: number): HazardLevel {
  if (score >= 80) return "VERY_HIGH";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  if (score >= 20) return "LOW";
  return "NIL";
}

function estimateHistoricalEvents(score: number): number {
  if (score >= 85) return 5;
  if (score >= 70) return 3;
  if (score >= 50) return 2;
  if (score >= 30) return 1;
  return 0;
}