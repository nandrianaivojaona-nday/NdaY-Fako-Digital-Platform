// types/operator.ts



// ==============================
// Operator status
// ==============================

export type OperatorStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED";



// ==============================
// Operator type
// ==============================

export type OperatorType =
  | "private"
  | "municipal"
  | "ngo";



// types/operator.ts
export interface Operator {
  id: string;
  name: string;
  email: string;
  city: string;
  type: 'formal' | 'informal' | 'cooperative';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface Collector {
  id: string;
  operatorId: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'on_break';
  shift: 'morning' | 'afternoon' | 'night';
  assignedZone: string;
  qrCode: string;
}

export interface Bin {
  id: string;
  operatorId: string;
  location: string;
  fokontany: string;
  sector: string;
  wasteType: string;
  capacity: number;
  fillLevel: number;
  status: 'active' | 'maintenance' | 'full';
  lastEmptying: string;
}

export interface Pickup {
  id: string;
  operatorId: string;
  collectorId: string;
  binId: string;
  householdId?: string;
  wasteType: 'organic' | 'plastic' | 'glass' | 'paper' | 'electronic' | 'mixed';
  weight: number;
  status: 'pending' | 'completed' | 'verified' | 'rejected';
  timestamp: string;
  verifiedAt?: string;
  verifiedBy?: string;
  violation: boolean;
  violationType?: string;
  notes?: string;
  images?: string[];
}

export interface OperatorKPI {
  operatorId: string;
  date: string;
  todayPickups: number;
  weeklyTonnage: number;
  monthlyTonnage: number;
  activeCollectors: number;
  sortingViolations: number;
  completionRate: number;
  averageWeight: number;
  customerSatisfaction: number;
  revenue: number;
}