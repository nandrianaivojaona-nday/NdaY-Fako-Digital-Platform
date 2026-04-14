// types/metrics.ts



// ==============================
// Base impact metrics
// ==============================

export interface ImpactMetrics {

    households: number;
  
    kg: number;
  
    som: number;
  
  }
  
  
  
  // ==============================
  // Extended metrics (future)
  // ==============================
  
  export interface ExtendedImpactMetrics
    extends ImpactMetrics {
  
    pickups?: number;
  
    subscriptions?: number;
  
    operators?: number;
  
    collectors?: number;
  
  }
  
  
  
  // ==============================
  // Global metrics
  // ==============================
  
  export interface GlobalMetrics
    extends ExtendedImpactMetrics {
  
    id: "global";
  
  }
  
  
  
  // ==============================
  // Operator metrics
  // ==============================
  
  export interface OperatorMetrics
    extends ExtendedImpactMetrics {
  
    operatorId: string;
  
    municipalityId?: string;
  
  }
  
  
  
  // ==============================
  // Municipality metrics
  // ==============================
  
  export interface MunicipalityMetrics
    extends ExtendedImpactMetrics {
  
    municipalityId: string;
  
  }