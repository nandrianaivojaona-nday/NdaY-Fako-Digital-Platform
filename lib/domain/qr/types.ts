// lib/domain/qr/types.ts
export type QRKind = "COLLECTOR" | "BIN" | "BAG" | "HOUSEHOLD" | "UNKNOWN";

export interface ParsedQR {
  kind: QRKind;
  raw: string;
  payload: string;
  parts: Record<string, string>;
}

export type BinStream = "ORGANIC" | "RECYCLABLE" | "PLASTIC" | "GLASS" | "METAL" | "CARBON";

export interface BinRecord {
  id: string;
  operatorId: string;
  subscriptionId: string;
  citizenId: string;
  fokontanyId: string;
  planTypeId: string;
  stream: BinStream;
  serial: number;
  status: "ISSUED" | "ASSIGNED" | "IN_USE" | "RETIRED" | "LOST" | "DAMAGED";
  issuedAt: number;
  issuedBy: string;
  retiredAt?: number;
  retiredReason?: string;
  replacedBy?: string;
}

export interface BagRecord {
  id: string;
  operatorId: string;
  stream: BinStream;
  fokontanyId: string;
  serial: number;
  batchId: string;
  status: "ISSUED" | "COLLECTED" | "SORTED" | "RECYCLED" | "DISPOSED";
  issuedToCollectorId?: string;
  collectedAt?: number;
  collectedFromSubscriptionId?: string;
  weightKg?: number;
  serviceProofId?: string;
  cycleId?: string;
  sortFacilityId?: string;
  recycledAt?: number;
  downstreamBuyerId?: string;
  createdAt: number;
}