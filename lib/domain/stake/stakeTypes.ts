// lib/domain/stake/stakeTypes.ts
//
// A StakeWorkspace is the staging area created when an operator stakes a
// territory. It holds four DRAFT census documents for that specific commune.
// Finalization commits them to the census collections, builds the cluster,
// and runs the TVE.
//
// Every RGPH record carries an evidence manifest so the TVE can compute
// confidence in the resulting scenario.

import type { FieldEvidence, HazardLevel } from "../territory/evidenceTypes";

export type StakeStatus = "DRAFT" | "REVIEW" | "FINALIZED" | "ABANDONED";
export type DraftType = "epm" | "mics" | "rgph" | "pcd";
export type DraftStatus = "UNREVIEWED" | "REVIEWED" | "LOCKED";

export interface DraftMetadata {
  status: DraftStatus;
  reviewedAt?: number;
  reviewedBy?: string;
  lastEditedAt?: number;
  lastEditedBy?: string;
}

export interface StakeWorkspace {
  id: string;
  operatorId: string;
  campaignId?: string;

  // Territory identity
  communeCode: string;
  communeName: string;
  regionId: string;
  regionName: string;
  districtId: string;
  districtName: string;
  communeType: "URBAN" | "PERI_URBAN" | "RURAL";

  status: StakeStatus;
  drafts: Record<DraftType, DraftMetadata>;

  overrides?: {
    totalHouseholds?: number;
    totalPopulation?: number;
    areaSqKm?: number;
    distanceToLandfillKm?: number;
    fokontanyCount?: number;
  };

  provenanceSummary: {
    epm: "OFFICIAL" | "INTERPOLATED" | "ESTIMATED";
    mics: "OFFICIAL" | "INTERPOLATED" | "ESTIMATED";
    rgph: "OFFICIAL" | "OPERATOR_ENTERED" | "ESTIMATED";
    pcd: "OFFICIAL" | "ESTIMATED";
  };

  warnings: string[];

  finalizedAt?: number;
  finalizedBy?: string;
  clusterId?: string;
  tveRunId?: string;

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

// ================================================================
// DRAFT DOCUMENTS
// ================================================================

export interface EPMPDraft {
  type: "epm";
  stakeId: string;
  expenditurePerHouseholdMGA: number;
  nonFoodUtilityFraction: number;
  quintileExpenditure?: { q1: number; q2: number; q3: number; q4: number; q5: number };
  surveyedAt: number;
  origin: "OFFICIAL" | "ESTIMATED";
  sourceNote: string;
  updatedAt: number;
  updatedBy: string;
}

export interface MICSFokontanyDraft {
  fokontanyId: string;
  assetQuintile: 1 | 2 | 3 | 4 | 5;
  housingQuality: {
    finishedRoofPercent: number;
    finishedFloorPercent: number;
    finishedWallPercent: number;
  };
  waterAccess: {
    pipedToDwellingPercent: number;
    publicTapPercent: number;
    unprotectedSourcePercent: number;
  };
}

export interface MICSDraft {
  type: "mics";
  stakeId: string;
  records: MICSFokontanyDraft[];
  origin: "OFFICIAL" | "INTERPOLATED" | "ESTIMATED";
  sourceNote: string;
  updatedAt: number;
  updatedBy: string;
}

export interface RGPHFokontanyDraft {
  fokontanyId: string;
  population: number;
  households: number;
  areaSqKm: number;
  densityFactor: number;
  householdSpacingMetres: number;
  avgHouseholdSize: number;
  distanceToLandfillKm: number;
  distanceToTransferStationKm?: number;
  roadAccessibilityScore: number;

  // Hazard — populated from BNGRC/OCHA
  floodExposure?: HazardLevel;
  floodExposureScore?: number;
  cycloneExposure?: HazardLevel;
  historicalFloodEvents?: number;
  hazardSource?: "BNGRC_OCHA" | "BNGRC_STATIC" | "ESTIMATED";
  hazardFetchedAt?: number;

  // Evidence manifest — one entry per critical field
  evidence?: {
    population?: FieldEvidence;
    households?: FieldEvidence;
    roadAccessibilityScore?: FieldEvidence;
    distanceToLandfillKm?: FieldEvidence;
    floodExposure?: FieldEvidence;
  };
}

export interface RGPHDraft {
  type: "rgph";
  stakeId: string;
  records: RGPHFokontanyDraft[];
  origin: "OFFICIAL" | "OPERATOR_ENTERED" | "ESTIMATED";
  sourceNote: string;
  updatedAt: number;
  updatedBy: string;
}

export interface PCDDraft {
  type: "pcd";
  stakeId: string;
  wildDumpSites: Array<{
    id: string;
    lat: number;
    lng: number;
    estimatedVolumeTonPerMonth: number;
  }>;
  publicBinPoints: Array<{
    id: string;
    lat: number;
    lng: number;
    capacityTonPerWeek: number;
  }>;
  transitConcessions: Array<{
    id: string;
    lat: number;
    lng: number;
    operatorId?: string;
  }>;
  communeAnnualWasteBudgetMGA?: number;
  landfillReference?: string;
  origin: "OFFICIAL" | "ESTIMATED";
  sourceNote: string;
  updatedAt: number;
  updatedBy: string;
}

export type AnyDraft = EPMPDraft | MICSDraft | RGPHDraft | PCDDraft;