// Phase 2 scaffold. Requires: npm install zod
// Shape mirrors the plan's ServiceEvent but only covers the fields the
// existing logPickupWithChain already accepts; extend for configVersionId
// once Phase 1 is live.
import { z } from "zod";

export const ServiceEventInput = z.object({
  idempotencyKey: z.string().min(8).max(200),
  subscriptionId: z.string().min(1),
  stopId: z.string().min(1),
  weights: z.object({
    organicKg: z.number().nonnegative().max(500),
    recyclableKg: z.number().nonnegative().max(500),
    otherKg: z.number().nonnegative().max(500),
  }),
  sortingCompliant: z.boolean(),
  gps: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyM: z.number().nonnegative().max(200),
  }).optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(),
});
export type ServiceEventInput = z.infer<typeof ServiceEventInput>;
