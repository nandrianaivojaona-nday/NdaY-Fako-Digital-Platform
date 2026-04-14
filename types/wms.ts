// types/wms.ts



// ==============================
// Roles inside operator
// ==============================

export type WorkerRole =
  | "SUPERVISOR"
  | "COLLECTOR";



// ==============================
// Worker (collector / supervisor)
// ==============================

export interface Worker {

  id: string;

  operatorId: string;

  role: WorkerRole;

  name: string;

  phone?: string;

  active?: boolean;

}



// ==============================
// Vehicle
// ==============================

export type VehicleType =
  | "truck"
  | "van"
  | "motorbike";


export interface Vehicle {

  id: string;

  operatorId: string;

  type: VehicleType;

  licensePlate: string;

  capacityKg?: number;

  status?: "active" | "inactive";

  qrCodeUrl?: string;

}



// ==============================
// Vehicle Assignment
// ==============================

export interface VehicleAssignment {

  id: string;

  operatorId: string;

  vehicleId: string;

  workerId: string; // collector or supervisor

  active?: boolean;

}



// ==============================
// Service Area
// ==============================

export interface ServiceArea {

  id: string;

  operatorId: string;

  municipalityId?: string;

  name: string;

  district?: string;

  fokontany?: string;

  targetHouseholds?: number;

}



// ==============================
// Offer
// ==============================

export interface Offer {

  id: string;

  operatorId: string;

  name: string;

  price: number;

  frequency: number;

  capacityKg?: number;

  active?: boolean;

}



// ==============================
// Subscription
// ==============================

export interface Subscription {

  id: string;

  operatorId: string;

  offerId: string;

  municipalityId?: string;

  householdName?: string;

  address?: string;

  district?: string;

  fokontany?: string;

  status?: "ACTIVE" | "PAUSED" | "CANCELLED";

  nextBillingDate?: string;

}



// ==============================
// Pickup Task
// ==============================

export interface PickupTask {

  id: string;

  operatorId: string;

  subscriptionId: string;

  date: string;

  workerId?: string;

  vehicleId?: string;

  status?: "PENDING" | "DONE";

}



// ==============================
// Pickup Record
// ==============================

export interface PickupRecord {

  id: string;

  operatorId: string;

  subscriptionId: string;

  workerId?: string;

  vehicleId?: string;

  weightKg?: number;

  date: string;

}