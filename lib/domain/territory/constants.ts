// lib/domain/territory/constants.ts
export const ALPHA_U = {
    URBAN: 0.02,
    PERI_URBAN: 0.012,
    RURAL: 0.008,
  } as const;
  
  export const URBANITY_THRESHOLDS = {
    URBAN_MIN_DENSITY: 3000,
    PERI_URBAN_MIN_DENSITY: 800,
    URBAN_MIN_FINISHED_ROOF: 60,
    PERI_URBAN_MIN_FINISHED_ROOF: 30,
  } as const;
  
  export const OPERATIONAL_COSTS = {
    collectorMonthlyCostMGA: 450_000,
    supervisorMonthlyCostMGA: 800_000,
    defaultTeamSize: 3,
    fuelPriceMGAPerLitre: 5_200,
    fuelConsumptionLPer100Km: 12,
    tricycleMaintenanceMGAPerMonth: 150_000,
    handcartMaintenanceMGAPerMonth: 40_000,
    stopsPerKmUrban: 25,
    stopsPerKmPeriUrban: 12,
    stopsPerKmRural: 6,
  } as const;
  
  export const TBI_THRESHOLD = 1.25;
  
  export const OVE_THRESHOLDS = {
    ORGANIC_MIN_FRACTION: 0.40,
    RECYCLABLE_MIN_FRACTION: 0.15,
    COMPOST_MIN_MARKET_VALUE: 300,
    CARBON_MIN_VALUE_PER_TON: 5_000,
  } as const;
  
  export const PRICE_WINDOW = {
    RECOMMENDED_POSITION: 0.60,
    ABSOLUTE_MIN_MGA: 3_000,
    ABSOLUTE_MAX_MGA: 100_000,
  } as const;
  
  export const STAKE_IN_DEFAULTS = {
    COMPOST_YIELD_RATIO: 0.35,
    COMPOST_QUARTERLY_KG_PER_HH: 2,
    CARBON_CREDIT_KG_CO2_PER_TON: 500,
  } as const;