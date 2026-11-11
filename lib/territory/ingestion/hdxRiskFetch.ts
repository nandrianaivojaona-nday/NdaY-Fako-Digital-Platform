// lib/territory/ingestion/hdxRiskFetch.ts
//
// Fetches and parses the HDX Risk Assessment Indicators for Madagascar.
//
// The dataset is aggregated at ADM2 (district). Each fokontany inherits
// the exposure of the district it belongs to, then is locally interpolated
// using centrality within the district.
//
// Source dataset: "madagascar-risk-assessment-indicators"
// Key files: MDG_ADM2_flood_exposure.csv, MDG_ADM2_cyclone_exposure.csv
//
// The parser is tolerant to column-name variations because the HDX dataset
// is republished periodically with slightly different schemas.

import { fetchDataset, findResourceByNameAndFormat } from "./hdxClient";

const RISK_DATASET_ID = "madagascar-risk-assessment-indicators";

// ================================================================
// Output shape
// ================================================================
export interface DistrictRisk {
  adm2Pcode: string;
  floodExposure: number;         // normalized 0–100
  cycloneExposure: number;       // normalized 0–100
  rawFlood: Record<string, number>;
  rawCyclone: Record<string, number>;
}

// ================================================================
// Cache
// ================================================================
let cachedRisk: { data: Map<string, DistrictRisk>; fetchedAt: number; version: string } | null = null;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function getDistrictRiskWithCache(): Promise<Map<string, DistrictRisk>> {
  if (cachedRisk && Date.now() - cachedRisk.fetchedAt < CACHE_TTL_MS) {
    return cachedRisk.data;
  }
  const fresh = await fetchDistrictRisk();
  cachedRisk = {
    data: fresh,
    fetchedAt: Date.now(),
    version: `HDX_${new Date().toISOString().split("T")[0]}`,
  };
  return fresh;
}

export function clearRiskCache(): void {
  cachedRisk = null;
}

export function getRiskCacheVersion(): string | null {
  return cachedRisk?.version ?? null;
}

// ================================================================
// Fetch + parse
// ================================================================
export async function fetchDistrictRisk(): Promise<Map<string, DistrictRisk>> {
  const dataset = await fetchDataset(RISK_DATASET_ID);
  if (!dataset) {
    console.warn("[hdxRiskFetch] Risk dataset not found on HDX");
    return new Map();
  }

  const floodResource = findResourceByNameAndFormat(dataset, "flood_exposure", "csv");
  const cycloneResource = findResourceByNameAndFormat(dataset, "cyclone_exposure", "csv");

  const floodMap = floodResource
    ? await parseCSV(floodResource.download_url)
    : new Map<string, Record<string, number>>();
  const cycloneMap = cycloneResource
    ? await parseCSV(cycloneResource.download_url)
    : new Map<string, Record<string, number>>();

  const allPcodes = new Set<string>([...floodMap.keys(), ...cycloneMap.keys()]);
  const result = new Map<string, DistrictRisk>();

  for (const pcode of allPcodes) {
    const flood = floodMap.get(pcode) ?? {};
    const cyclone = cycloneMap.get(pcode) ?? {};

    result.set(pcode, {
      adm2Pcode: pcode,
      floodExposure: normalizeExposure(flood),
      cycloneExposure: normalizeExposure(cyclone),
      rawFlood: flood,
      rawCyclone: cyclone,
    });
  }

  return result;
}

// ================================================================
// CSV parsing — tolerant to varying column names
// ================================================================
async function parseCSV(url: string): Promise<Map<string, Record<string, number>>> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HDX CSV fetch failed: ${url} (${res.status})`);
  }

  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return new Map();

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const pcodeIdx = header.findIndex((h) => /pcode/i.test(h));
  if (pcodeIdx < 0) {
    console.warn(`[hdxRiskFetch] No pcode column found in ${url}`);
    return new Map();
  }

  const map = new Map<string, Record<string, number>>();

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const pcode = (cells[pcodeIdx] ?? "").trim().replace(/^"|"$/g, "");
    if (!pcode) continue;

    const row: Record<string, number> = {};
    header.forEach((h, idx) => {
      if (idx === pcodeIdx) return;
      const value = parseFloat(cells[idx]);
      if (!isNaN(value)) row[h] = value;
    });

    map.set(pcode, row);
  }

  return map;
}

function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

// ================================================================
// Normalization — HDX provides raw counts; convert to 0–100
// ================================================================
function normalizeExposure(row: Record<string, number>): number {
  // HDX columns include exposed population at various return periods
  // (e.g. "Exposed_0_50", "Exposed_0_100"). We score by the highest-value
  // candidate column, normalized against a soft ceiling.
  const candidateKeys = Object.keys(row).filter((k) =>
    /expos|affected|pop/i.test(k)
  );

  if (candidateKeys.length === 0) return 0;

  const maxValue = Math.max(...candidateKeys.map((k) => row[k] ?? 0));

  // Soft ceiling: 50,000 exposed people → score 100
  const normalized = Math.min(100, Math.round((maxValue / 50_000) * 100));
  return normalized;
}