// lib/domain/subscription/planTypes.ts

export type PlanSegment =
  | "household" | "building" | "school" | "business"
  | "event" | "hotel" | "vip" | "institutional";

export type PlanBilling = "per_pickup" | "monthly" | "quarterly" | "custom";

export interface ReferencePlanType {
  id: string;
  categoryId: string;
  segment: PlanSegment;
  name: string;
  description: string;
  defaultBilling: PlanBilling;
  defaultFrequency: string;
  maxBins: number;
  platformFeePercent: number;
  audience: "HOUSEHOLD" | "BUSINESS" | "INSTITUTION";
  requiresCashPayment: boolean;
  supportsCompensation: boolean;
}

export interface PlanCategory {
  id: string;
  name: string;
  segments: PlanSegment[];
}

export const PLAN_CATEGORIES: PlanCategory[] = [
  { id: "household",   name: "Household",   segments: ["household"] },
  { id: "buildings",   name: "Buildings",   segments: ["building"] },
  { id: "schools",     name: "Schools",     segments: ["school"] },
  { id: "business",    name: "Business",    segments: ["business"] },
  { id: "hospitality", name: "Hospitality", segments: ["event", "hotel"] },
  { id: "vip",         name: "VIP",         segments: ["vip"] },
  { id: "public",      name: "Public",      segments: ["institutional"] },
];

export const REFERENCE_PLAN_TYPES: Record<string, ReferencePlanType> = {
  "HH-STARTER": {
    id: "HH-STARTER", categoryId: "household", segment: "household",
    name: "Starter", description: "On-demand pickup for occasional service.",
    defaultBilling: "per_pickup", defaultFrequency: "On-demand", maxBins: 2,
    platformFeePercent: 15, audience: "HOUSEHOLD",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "HH-STANDARD": {
    id: "HH-STANDARD", categoryId: "household", segment: "household",
    name: "Standard Weekly", description: "Weekly pickup for standard households.",
    defaultBilling: "monthly", defaultFrequency: "1 pickup / week", maxBins: 3,
    platformFeePercent: 15, audience: "HOUSEHOLD",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "HH-FAMILY": {
    id: "HH-FAMILY", categoryId: "household", segment: "household",
    name: "Family", description: "Twice-weekly pickup for larger families.",
    defaultBilling: "monthly", defaultFrequency: "2 pickups / week", maxBins: 5,
    platformFeePercent: 15, audience: "HOUSEHOLD",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "HH-ECO": {
    id: "HH-ECO", categoryId: "household", segment: "household",
    name: "Eco Sort", description: "Weekly pickup with sorting and compost reward.",
    defaultBilling: "monthly", defaultFrequency: "1 pickup / week", maxBins: 3,
    platformFeePercent: 10, audience: "HOUSEHOLD",
    requiresCashPayment: false, supportsCompensation: true,
  },
  "BLD-SMALL": {
    id: "BLD-SMALL", categoryId: "buildings", segment: "building",
    name: "Small Residence", description: "Shared pickup for small residential buildings.",
    defaultBilling: "monthly", defaultFrequency: "2 pickups / week", maxBins: 10,
    platformFeePercent: 12, audience: "BUSINESS",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "BLD-LARGE": {
    id: "BLD-LARGE", categoryId: "buildings", segment: "building",
    name: "Large Residence", description: "High-frequency pickup for large buildings.",
    defaultBilling: "monthly", defaultFrequency: "3–6 pickups / week", maxBins: 30,
    platformFeePercent: 12, audience: "BUSINESS",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "SCH-PUBLIC": {
    id: "SCH-PUBLIC", categoryId: "schools", segment: "school",
    name: "Public School", description: "Public institution collection.",
    defaultBilling: "monthly", defaultFrequency: "1–3 pickups / week", maxBins: 15,
    platformFeePercent: 8, audience: "INSTITUTION",
    requiresCashPayment: false, supportsCompensation: false,
  },
  "SCH-PRIVATE": {
    id: "SCH-PRIVATE", categoryId: "schools", segment: "school",
    name: "Private School", description: "Private institution collection.",
    defaultBilling: "monthly", defaultFrequency: "2–5 pickups / week", maxBins: 20,
    platformFeePercent: 10, audience: "INSTITUTION",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "BIZ-STANDARD": {
    id: "BIZ-STANDARD", categoryId: "business", segment: "business",
    name: "Office Plan", description: "Standard office and commercial pickup.",
    defaultBilling: "monthly", defaultFrequency: "1–5 pickups / week", maxBins: 10,
    platformFeePercent: 12, audience: "BUSINESS",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "EVENT-FLEX": {
    id: "EVENT-FLEX", categoryId: "hospitality", segment: "event",
    name: "Event Flex", description: "On-demand pickup for events.",
    defaultBilling: "per_pickup", defaultFrequency: "On-demand", maxBins: 20,
    platformFeePercent: 15, audience: "BUSINESS",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "HOTEL-REGULAR": {
    id: "HOTEL-REGULAR", categoryId: "hospitality", segment: "hotel",
    name: "Hotel Regular", description: "Daily collection for hotels.",
    defaultBilling: "monthly", defaultFrequency: "Daily", maxBins: 40,
    platformFeePercent: 12, audience: "BUSINESS",
    requiresCashPayment: true, supportsCompensation: false,
  },
  "VIP-BESPOKE": {
    id: "VIP-BESPOKE", categoryId: "vip", segment: "vip",
    name: "VIP Bespoke", description: "Custom collection for premium clients.",
    defaultBilling: "custom", defaultFrequency: "Custom", maxBins: 100,
    platformFeePercent: 20, audience: "BUSINESS",
    requiresCashPayment: true, supportsCompensation: false,
  },
};

export function getReferencePlan(id: string): ReferencePlanType {
  const p = REFERENCE_PLAN_TYPES[id];
  if (!p) throw new Error(`Unknown reference plan: ${id}`);
  return p;
}

export function listPlansBySegment(segment: PlanSegment): ReferencePlanType[] {
  return Object.values(REFERENCE_PLAN_TYPES).filter((p) => p.segment === segment);
}