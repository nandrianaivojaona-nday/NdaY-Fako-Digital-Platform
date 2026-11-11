// services/settlementPipelineService.ts
import { getFirestore, DocumentReference } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { SettlementPipeline, PipelineState } from "@/lib/domain/settlement/pipelineTypes";
import { emitSettlementEntitlement } from "./settlementService";
import { releaseForSettledCycle } from "./escrowService";
import { transitionCycle } from "./serviceCycleService";

function db() { return getFirestore(getAdminApp()); }

export async function runSettlementPipeline(cycleId: string): Promise<SettlementPipeline> {
  const dbRef = db();
  const ref = dbRef.collection(collections.settlementPipelines).doc(cycleId);
  let pipeline = await loadOrCreatePipeline(cycleId, ref);

  while (pipeline.state !== "COMPLETED" && pipeline.state !== "FAILED") {
    pipeline = await advance(pipeline, ref);
  }
  return pipeline;
}

async function advance(
  pipeline: SettlementPipeline, ref: DocumentReference
): Promise<SettlementPipeline> {
  const dbRef = db();
  try {
    switch (pipeline.state) {
      case "INITIATED": {
        const entitlement = await emitSettlementEntitlement(pipeline.cycleId);
        const next: Partial<SettlementPipeline> = {
          state: "ENTITLEMENT_EMITTED",
          entitlementId: entitlement.id,
          // Escrow releases the gross cycle value; the entitlement record
          // separately records the operator/platform/payment-cost split.
          entitlementAmountMGA: entitlement.entitlementValueMGA,
          attempts: pipeline.attempts + 1,
          lastAttemptAt: Date.now(),
          updatedAt: Date.now(),
        };
        await ref.update(next);
        return { ...pipeline, ...next } as SettlementPipeline;
      }

      case "ENTITLEMENT_EMITTED":
      case "ESCROW_RELEASE_REQUESTED": {
        const cycleDoc = await dbRef.collection(collections.serviceCycles).doc(pipeline.cycleId).get();
        const cycle = cycleDoc.data()!;
        const subDoc = await dbRef.collection(collections.subscriptions).doc(cycle.subscriptionId).get();
        const sub = subDoc.data()!;

        if (sub.holdType === "CASH_ON_DELIVERY") {
          const cashPayment = await dbRef.collection(collections.paymentEvents).doc(`cash_${pipeline.cycleId}`).get();
          if (!cashPayment.exists || cashPayment.get("amountMGA") !== cycle.entitlementValueMGA) {
            throw new Error("Cash payment for this service cycle is missing or does not match the entitlement");
          }
          const next: Partial<SettlementPipeline> = {
            state: "ESCROW_RELEASED",
            escrowReleasedMGA: 0,
            attempts: pipeline.attempts + 1,
            lastAttemptAt: Date.now(),
            updatedAt: Date.now(),
          };
          await ref.update(next);
          return { ...pipeline, ...next } as SettlementPipeline;
        }

        const result = await releaseForSettledCycle({
          escrowId: sub.escrowId,
          cycleId: pipeline.cycleId,
          serviceProofId: cycle.proof?.proofId ?? "",
          settlementId: pipeline.entitlementId!,
          amountMGA: pipeline.entitlementAmountMGA!,
        });

        const next: Partial<SettlementPipeline> = {
          state: "ESCROW_RELEASED",
          escrowReleasedMGA: result.releasedMGA,
          attempts: pipeline.attempts + 1,
          lastAttemptAt: Date.now(),
          updatedAt: Date.now(),
        };
        await ref.update(next);
        return { ...pipeline, ...next } as SettlementPipeline;
      }

      case "ESCROW_RELEASED": {
        const cycleRef = dbRef.collection(collections.serviceCycles).doc(pipeline.cycleId);
        const cycleDoc = await cycleRef.get();
        if (!cycleDoc.exists) throw new Error("Cycle not found");
        if (cycleDoc.get("status") === "ACCEPTED") {
          await transitionCycle({
            cycleId: pipeline.cycleId,
            transition: "SETTLE",
            actor: "SYSTEM",
            actorUserId: "SYSTEM",
          });
        } else if (cycleDoc.get("status") !== "SETTLED") {
          throw new Error(`Cannot complete settlement pipeline from cycle state ${cycleDoc.get("status")}`);
        }
        const next: Partial<SettlementPipeline> = {
          state: "COMPLETED",
          settledAt: Date.now(),
          attempts: pipeline.attempts + 1,
          lastAttemptAt: Date.now(),
          updatedAt: Date.now(),
        };
        await ref.update(next);
        return { ...pipeline, ...next } as SettlementPipeline;
      }

      default:
        throw new Error(`Unknown pipeline state: ${pipeline.state}`);
    }
  } catch (err: any) {
    const history = pipeline.errorHistory ?? [];
    history.push({ at: Date.now(), message: err.message });

    const next: Partial<SettlementPipeline> = {
      attempts: pipeline.attempts + 1,
      lastAttemptAt: Date.now(),
      lastError: err.message,
      errorHistory: history,
      updatedAt: Date.now(),
      ...(history.length >= 5 ? { state: "FAILED" as PipelineState } : {}),
    };
    await ref.update(next);
    return { ...pipeline, ...next } as SettlementPipeline;
  }
}

async function loadOrCreatePipeline(
  cycleId: string, ref: DocumentReference
): Promise<SettlementPipeline> {
  const doc = await ref.get();
  if (doc.exists) return doc.data() as SettlementPipeline;

  const dbRef = db();
  const cycleDoc = await dbRef.collection(collections.serviceCycles).doc(cycleId).get();
  if (!cycleDoc.exists) throw new Error(`Cycle ${cycleId} not found`);
  const cycle = cycleDoc.data()!;

  const subDoc = await dbRef.collection(collections.subscriptions).doc(cycle.subscriptionId).get();
  const sub = subDoc.data()!;

  const pipeline: SettlementPipeline = {
    id: cycleId,
    cycleId,
    subscriptionId: cycle.subscriptionId,
    escrowId: sub.escrowId,
    state: "INITIATED",
    attempts: 0,
    lastAttemptAt: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await ref.set(pipeline);
  return pipeline;
}
