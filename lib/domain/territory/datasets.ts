// lib/domain/territory/datasets.ts
export interface EPMRecord {
    regionId: string;
    regionName: string;
    surveyedAt: number;
    expenditurePerHouseholdMGA: number;
    nonFoodUtilityFraction: number;
    quintileExpenditure?: { q1: number; q2: number; q3: number; q4: number; q5: number };
  }
  
  export interface MICSRecord {
    fokontanyId: string;
    surveyedAt: number;
    assetQuintile: 1 | 2 | 3 | 4 | 5;
    housingQuality: {
      finishedFloorPercent: number;
      finishedRoofPercent: number;
      finishedWallPercent: number;
    };
    waterAccess: {
      pipedToDwellingPercent: number;
      publicTapPercent: number;
      unprotectedSourcePercent: number;
    };
    welfareIndex?: number;
  }
  
  export interface RGPHRecord {
    fokontanyId: string;
    surveyedAt: number;
    population: number;
    households: number;
    areaSqKm: number;
    densityFactor: number;
    householdSpacingMetres: number;
    avgHouseholdSize: number;
    distanceToLandfillKm: number;
    distanceToTransferStationKm?: number;
    roadAccessibilityScore: number;
  }
  
  export interface PCDRecord {
    communeId: string;
    regionId: string;
    updatedAt: number;
    wildDumpSites: Array<{ id: string; lat: number; lng: number; estimatedVolumeTonPerMonth: number }>;
    publicBinPoints: Array<{ id: string; lat: number; lng: number; capacityTonPerWeek: number }>;
    transitConcessions: Array<{ id: string; lat: number; lng: number; operatorId?: string }>;
    communeAnnualWasteBudgetMGA?: number;
    landfillReference?: string;
  }