// services/serviceCycleService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type {
  ServiceCycle, CycleStatus, CycleProof, CycleVerification,
  CycleAcceptance, CycleAcknowledgement,
} from "@/lib/domain/service/cycleTypes";
import type { AcceptanceMethod } from "@/lib/domain/service/acceptanceMethods";
import {
  nextStatus, isActorAuthorized, type CycleActor, type CycleTransition,
} from "@/lib/domain/service/cycleStateMachine";
import { deriveEntitlementSchedule } from "@/lib/domain/settlement/settlementEngine";
import { getOfferVersion } from "./offerService";


function db() { return getFirestore(getAdminApp()); }

export async function scheduleCyclesForSubscription(input: {
  subscriptionId: string;
  citizenId: string;
  operatorId: string;
  offerId: string;
  offerVersionId: string;
  expectedCollections: number;
  periodStart: number;
  periodEnd: number;
}): Promise<ServiceCycle[]> {
  const offerVersion = await getOfferVersion(input.offerVersionId);
  if (!offerVersion) throw new Error("Offer version not found");

  const schedule = deriveEntitlementSchedule({
    offerVersion,
    expectedCollections: input.expectedCollections,
  });

  const dbRef = db();
  const actualCycles = input.expectedCollections;
  if (!Number.isInteger(actualCycles) || actualCycles < 1 || schedule.length !== actualCycles) {
    throw new Error(`Cycle schedule mismatch: expected ${actualCycles}, entitlement schedule has ${schedule.length}`);
  }
  const now = Date.now();
  const refs = Array.from({ length: actualCycles }, (_, i) =>
    dbRef.collection(collections.serviceCycles).doc(`${input.subscriptionId}_${i + 1}`)
  );
  const cycles: ServiceCycle[] = [];
  const subscriptionRef = dbRef.collection(collections.subscriptions).doc(input.subscriptionId);

  // Deterministic IDs plus a transaction make activation retries safe: existing
  // cycle state is preserved and a partial schedule cannot be duplicated.
  await dbRef.runTransaction(async (tx) => {
    cycles.length = 0;
    const subscriptionDoc = await tx.get(subscriptionRef);
    if (!subscriptionDoc.exists) throw new Error("Subscription not found");
    if (subscriptionDoc.get("cancellationPending") === true) {
      throw new Error("Subscription cancellation is in progress");
    }
    // Phase 2b — quarantine gate
    if (subscriptionDoc.get("quarantined") === true) {
      throw new Error("Subscription is quarantined pending operator validation");
    }
    // Phase 2b — combine gate (live validation)
    const territoryId = subscriptionDoc.get("territoryId") as string | undefined;
    if (territoryId) {
      const validationDoc = await tx.get(
        dbRef.collection(collections.operatorTerritoryValidations).doc(`${input.operatorId}_${territoryId}`)
      );
      if (!validationDoc.exists || validationDoc.get("validated") !== true) {
        throw new Error("Operator validation revoked — cycle scheduling blocked pending admin resolution");
      }
    }

    const cycleDocs = await Promise.all(refs.map((ref) => tx.get(ref)));
    for (let i = 0; i < actualCycles; i++) {
      const entry = schedule[i];
      const scheduledAt = input.periodStart + i * (input.periodEnd - input.periodStart) / actualCycles;
      const ref = refs[i];

      if (cycleDocs[i].exists) {
        cycles.push(cycleDocs[i].data() as ServiceCycle);
        continue;
      }

      const cycle: ServiceCycle = {
        id: ref.id,
        subscriptionId: input.subscriptionId,
        citizenId: input.citizenId,
        operatorId: input.operatorId,
        offerId: input.offerId,
        offerVersionId: input.offerVersionId,
        cycleNumber: i + 1,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: "SCHEDULED",
        scheduledAt,
        entitlementValueMGA: entry.entitlementValueMGA,
        createdAt: now,
        updatedAt: now,
      };
      tx.create(ref, cycle);
      cycles.push(cycle);
    }
    tx.update(subscriptionRef, { scheduledCycles: actualCycles, updatedAt: now });
  });
  return cycles;
}

export async function transitionCycle(input: {
  cycleId: string;
  transition: CycleTransition;
  actor: CycleActor;
  actorUserId: string;
  patch?: Partial<ServiceCycle>;
}): Promise<ServiceCycle> {
  const dbRef = db();
  const ref = dbRef.collection(collections.serviceCycles).doc(input.cycleId);

  return await dbRef.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("Cycle not found");
    const cycle = doc.data() as ServiceCycle;

    if (input.transition !== "CANCEL") {
      const subscriptionDoc = await tx.get(dbRef.collection(collections.subscriptions).doc(cycle.subscriptionId));
      if (subscriptionDoc.exists && subscriptionDoc.get("cancellationPending") === true) {
        throw new Error("Subscription cancellation is in progress");
      }
    }

    if (!isActorAuthorized(input.transition, input.actor)) {
      throw new Error(`${input.actor} cannot perform ${input.transition}`);
    }

    const newStatus = nextStatus(cycle.status, input.transition);
    const now = Date.now();

    const updated: Partial<ServiceCycle> = {
      status: newStatus, updatedAt: now, ...input.patch,
    };
    if (input.transition === "ASSIGN" && !cycle.assignedAt) updated.assignedAt = now;
    if (input.transition === "PERFORM" && !cycle.performedAt) updated.performedAt = now;

    tx.update(ref, updated);

    const evtRef = dbRef.collection(collections.cycleEvents).doc();
    tx.set(evtRef, {
      id: evtRef.id,
      cycleId: input.cycleId,
      subscriptionId: cycle.subscriptionId,
      type: `CYCLE_${input.transition}`,
      fromStatus: cycle.status, toStatus: newStatus,
      actorUserId: input.actorUserId, actorRole: input.actor,
      timestamp: now,
    });

    return { ...cycle, ...updated } as ServiceCycle;
  });
}

export async function captureProof(input: {
  cycleId: string; actorUserId: string; proof: CycleProof;
}): Promise<ServiceCycle> {
  return transitionCycle({
    cycleId: input.cycleId,
    transition: "CAPTURE_PROOF",
    actor: "COLLECTOR",
    actorUserId: input.actorUserId,
    patch: { proof: input.proof },
  });
}

export async function verifyCycle(input: {
    cycleId: string;
    actorUserId: string;
    actor: "SYSTEM" | "SUPERVISOR";
    verification: CycleVerification;
  }): Promise<ServiceCycle> {
    let transition: CycleTransition;
    if (input.verification.outcome === "REJECTED") transition = "VERIFY_REJECT";
    else if (input.verification.outcome === "FLAGGED_FOR_SUPERVISOR") transition = "VERIFY_FLAG";
    else transition = "VERIFY_PASS";
  
    const cycle = await transitionCycle({
      cycleId: input.cycleId,
      transition,
      actor: input.actor,
      actorUserId: input.actorUserId,
      patch: { verification: input.verification },
    });
  
    // Only set an acknowledgement window if the contract authorizes it.
    if (cycle.status === "VERIFIED") {
      const policy = await getAcknowledgementPolicy(cycle.offerVersionId);
      const dbRef = db();
  
      if (policy.allowAutoAccept && policy.windowHours > 0) {
        const autoAcceptAt = Date.now() + policy.windowHours * 60 * 60 * 1000;
        const ack: CycleAcknowledgement = {
          status: "PENDING",
          autoAcceptAt,
        };
        await dbRef.collection(collections.serviceCycles).doc(input.cycleId).update({
          acknowledgement: ack,
          updatedAt: Date.now(),
        });
        return { ...cycle, acknowledgement: ack };
      }
  
      // No auto-accept — cycle waits for explicit acceptance, escalates to supervisor.
      const escalationAt = Date.now() + policy.supervisorEscalationHours * 60 * 60 * 1000;
      const ack: CycleAcknowledgement = {
        status: "PENDING",
        autoAcceptAt: escalationAt,  // reused as escalation deadline, not auto-accept
      };
      await dbRef.collection(collections.serviceCycles).doc(input.cycleId).update({
        acknowledgement: ack,
        updatedAt: Date.now(),
      });
  
      // Log the safe-default decision so audits can see it
      if (policy.policySource === "SAFE_DEFAULT") {
        const evtRef = dbRef.collection(collections.cycleEvents).doc();
        await evtRef.set({
          id: evtRef.id,
          cycleId: input.cycleId,
          subscriptionId: cycle.subscriptionId,
          type: "CYCLE_NO_AUTO_ACCEPT_POLICY",
          note: `Offer version ${cycle.offerVersionId} declared no acknowledgementPolicy. Escalating to supervisor in ${policy.supervisorEscalationHours}h.`,
          timestamp: Date.now(),
        });
      }
  
      return { ...cycle, acknowledgement: ack };
    }
  
    return cycle;
  }
  

export async function acknowledgeCycle(input: {
  cycleId: string;
  method: AcceptanceMethod;
  actorUserId?: string;
}): Promise<ServiceCycle> {
  const isContractAutoAccept = input.method === "AUTO_ACCEPT_CONTRACTUAL";
  if (isContractAutoAccept) {
    const policy = await getAcknowledgementPolicy(
      (await getCycleOfferVersionId(input.cycleId))
    );
    if (!policy.allowAutoAccept) throw new Error("Offer version does not permit contractual auto-acceptance");
  }

  const dbRef = db();
  const ref = dbRef.collection(collections.serviceCycles).doc(input.cycleId);

  return await dbRef.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("Cycle not found");
    const cycle = doc.data() as ServiceCycle;
    if (cycle.status !== "VERIFIED") {
      throw new Error(`Cannot accept from ${cycle.status}`);
    }
    if (!isContractAutoAccept && input.actorUserId !== cycle.citizenId) {
      throw new Error("Only the subscribed citizen can accept this service cycle");
    }

    const now = Date.now();
    const transition: CycleTransition = isContractAutoAccept ? "AUTO_ACCEPT" : "ACCEPT";
    const newStatus = nextStatus(cycle.status, transition);
    const acceptance: CycleAcceptance = {
      ...(cycle.acceptance ?? { autoAcceptAt: now }),
      status: input.method === "AUTO_ACCEPT_CONTRACTUAL" ? "AUTO_ACCEPTED" : "ACCEPTED",
      method: input.method,
      acceptedAt: now,
      acceptedBy: input.actorUserId,
    };

    tx.update(ref, { status: newStatus, acceptance, updatedAt: now });

    const evtRef = dbRef.collection(collections.cycleEvents).doc();
    tx.set(evtRef, {
      id: evtRef.id, cycleId: input.cycleId, subscriptionId: cycle.subscriptionId,
      type: "CYCLE_ACCEPTED",
      fromStatus: cycle.status, toStatus: newStatus,
      actorUserId: input.actorUserId ?? "SYSTEM", actorRole: isContractAutoAccept ? "SYSTEM" : "CITIZEN",
      method: input.method, timestamp: now,
    });

    return { ...cycle, status: newStatus, acceptance };
  });
}

export async function autoAcceptCycle(cycleId: string): Promise<ServiceCycle> {
  return acknowledgeCycle({
    cycleId, method: "AUTO_ACCEPT_CONTRACTUAL", actorUserId: "SYSTEM",
  });
}

async function getCycleOfferVersionId(cycleId: string): Promise<string> {
  const doc = await db().collection(collections.serviceCycles).doc(cycleId).get();
  if (!doc.exists) throw new Error("Cycle not found");
  return String(doc.get("offerVersionId") ?? "");
}

export async function markCycleSettled(input: {
  cycleId: string;
  settlementId: string;
  amountMGA: number;
  split: { operatorMGA: number; ndayFeeMGA: number; paymentCostMGA: number };
}): Promise<ServiceCycle> {
  return transitionCycle({
    cycleId: input.cycleId, transition: "SETTLE",
    actor: "SYSTEM", actorUserId: "SYSTEM",
    patch: {
      settlementEntitlement: {
        entitlementId: input.settlementId,
        amountMGA: input.amountMGA,
        emittedAt: Date.now(),
      },
    },
  });
}

async function getAcknowledgementPolicy(
    offerVersionId: string
  ): Promise<{
    windowHours: number;
    methods: string[];
    allowAutoAccept: boolean;
    supervisorEscalationHours: number;
    policySource: "OFFER_VERSION" | "SAFE_DEFAULT";
  }> {
    const doc = await db()
      .collection(collections.subscriptionOfferVersions)
      .doc(offerVersionId)
      .get();
  
    if (!doc.exists) {
      throw new Error(`Offer version ${offerVersionId} not found — cannot determine acknowledgement policy`);
    }
  
    const data = doc.data();
    const policy = data?.commercial?.acknowledgementPolicy;
  
    if (!policy) {
      // SAFE DEFAULT — never auto-accept. Escalate to supervisor instead.
      // This preserves the principle: auto-accept is a commercial clause, not a technical default.
      console.warn(
        `[ACK POLICY] Offer version ${offerVersionId} has no acknowledgementPolicy. ` +
        `Defaulting to no-auto-accept with supervisor escalation.`
      );
      return {
        windowHours: 0,                     // no automatic acceptance window
        methods: [],
        allowAutoAccept: false,             // explicit refusal
        supervisorEscalationHours: 24,
        policySource: "SAFE_DEFAULT",
      };
    }
  
    return {
      windowHours: Number(policy.windowHours ?? 0),
      methods: Array.isArray(policy.methods) ? policy.methods : [],
      allowAutoAccept: policy.allowAutoAccept === true,  // strict boolean
      supervisorEscalationHours: Number(policy.supervisorEscalationHours ?? 24),
      policySource: "OFFER_VERSION",
    };
  }
  

