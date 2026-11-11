// services/offerService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type {
  TerritorialSubscriptionOffer, TerritorialSubscriptionOfferVersion,
  CommercialConfiguration, ApprovalDecision,
} from "@/lib/domain/subscription/offerTypes";
import type { OperatorRole } from "@/lib/domain/subscription/operatorRoles";
import {
  canTransitionOffer, canTransitionVersion,
  isTransitionAuthorized, nextOfferStatus,
} from "@/lib/domain/subscription/offerStateMachine";
import { logOfferEvent } from "./eventLogService";
import { getScenario } from "./businessModelService";

function db() { return getFirestore(getAdminApp()); }

// ================================================================
// CREATE FROM SCENARIO A++
// ================================================================
export async function createOfferFromScenario(input: {
    scenarioId: string;
    planTypeId: string;
    operatorId: string;
    actorUserId: string;
    actorRole: OperatorRole;
    initialCommercial?: Partial<CommercialConfiguration>;
  }): Promise<{ offer: TerritorialSubscriptionOffer; version: TerritorialSubscriptionOfferVersion }> {
    if (!isTransitionAuthorized("CREATE_DRAFT", input.actorRole)) {
      throw new Error("Not authorized to create offers");
    }
  
    const scenario = await getScenario(input.scenarioId);
    if (!scenario) throw new Error("Business model scenario not found");
    if (scenario.validationStatus !== "GO") {
      throw new Error(
        `Cannot create offers from scenario in validation status ${scenario.validationStatus}. ` +
        `Only GO scenarios can produce offers.`
      );
    }
  
    const proposal = scenario.planProposals.find((p) => p.planTypeId === input.planTypeId);
    if (!proposal) {
      throw new Error(
        `Plan ${input.planTypeId} is not among the proposals prescribed by scenario ${input.scenarioId}. ` +
        `Offers cannot be created for plans the business model did not propose.`
      );
    }
  
    // Build the commercial config FROM the proposal, then apply operator overrides
    const commercial: CommercialConfiguration = {
      planTypeId: proposal.planTypeId,
      billing: proposal.billing,
      monthlyPriceMGA: proposal.billing === "monthly" ? proposal.priceWindow.recommendedMGA : undefined,
      perPickupPriceMGA: proposal.billing === "per_pickup" ? proposal.priceWindow.recommendedMGA : undefined,
      contractPriceMGA: (proposal.billing === "custom" || proposal.billing === "quarterly")
        ? proposal.priceWindow.recommendedMGA : undefined,
      serviceLevel: {
        collectionFrequency: proposal.recommendedFrequency,
        priority: proposal.segment === "household" ? "PRIORITY" : "STANDARD",
        acknowledgementRequired: true,
      },
      bins: proposal.bins,
      ove: proposal.ove,
      stakeInOutputs: [],  // populated by operator
      verification: {
        requiresServiceProof: true,
        requiresSortingCompliance: proposal.oveStreams.includes("ORGANIC"),
        complaintWindowHours: 72,
      },
      eligibilityBands: proposal.targetBands,
      ...input.initialCommercial,  // operator overrides
    };
  
    const now = Date.now();
    const offerRef = db().collection(collections.subscriptionOffers).doc();
    const versionRef = db().collection(collections.subscriptionOfferVersions).doc();
  
    const offer: TerritorialSubscriptionOffer = {
      id: offerRef.id,
      operatorId: input.operatorId,
      regionId: scenario.regionId,
      communeId: scenario.communeId,
      segment: proposal.segment,
      planTypeId: proposal.planTypeId,
      status: "DRAFT",
      activeVersionId: null,
      draftVersionId: versionRef.id,
      latestVersionNumber: 1,
      source: {
        calibrationMethod: "MICS_BASELINE",
        socioeconomicProfileId: scenario.clusterId,
        micsReference: scenario.viability.clusterId,
      },
      businessModelScenarioId: scenario.id,  // NEW — critical provenance
      createdAt: now,
      createdBy: input.actorUserId,
      updatedAt: now,
      updatedBy: input.actorUserId,
    };
  
    const version: TerritorialSubscriptionOfferVersion = {
      id: versionRef.id,
      offerId: offerRef.id,
      versionNumber: 1,
      status: "DRAFT",
      commercial,
      baseline: {
        micsReference: scenario.clusterId,
        territoryId: scenario.clusterId,
        businessModelScenarioId: scenario.id,
        viability: {
          tbi: scenario.viability.tbi.tbi,
          laaMGA: scenario.viability.laa.commercialLaaMGA,
          ocdMGA: scenario.viability.ocd.hazardAdjustedOcdMGA,
          priceWindow: scenario.viability.priceWindow,
          computedAt: scenario.viability.computedAt,
        },
        recommendedMonthlyPriceMGA: proposal.priceWindow.recommendedMGA,
        recommendedOVE: proposal.ove,
        recommendedStakeInOutputs: [],
      },
      createdAt: now,
      createdBy: input.actorUserId,
      updatedAt: now,
      updatedBy: input.actorUserId,
    };
  
    const batch = db().batch();
    batch.set(offerRef, offer);
    batch.set(versionRef, version);
    await batch.commit();
  
    await logOfferEvent({
      type: "OFFER_CREATED",
      offerId: offer.id,
      operatorId: input.operatorId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      versionId: version.id,
      versionNumber: version.versionNumber,
      note: `Created from business model scenario ${scenario.id}`,
    });
  
    return { offer, version };
  }

// ================================================================
// READ
// ================================================================
export async function getOffer(id: string): Promise<TerritorialSubscriptionOffer | null> {
  const doc = await db().collection(collections.subscriptionOffers).doc(id).get();
  return doc.exists ? (doc.data() as TerritorialSubscriptionOffer) : null;
}

export async function getOfferVersion(id: string): Promise<TerritorialSubscriptionOfferVersion | null> {
  const doc = await db().collection(collections.subscriptionOfferVersions).doc(id).get();
  return doc.exists ? (doc.data() as TerritorialSubscriptionOfferVersion) : null;
}

export async function listOffersForOperator(operatorId: string): Promise<TerritorialSubscriptionOffer[]> {
  const snap = await db().collection(collections.subscriptionOffers)
    .where("operatorId", "==", operatorId)
    .orderBy("updatedAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as TerritorialSubscriptionOffer);
}

export async function listActiveOffersForCommune(communeId: string): Promise<TerritorialSubscriptionOffer[]> {
  const snap = await db().collection(collections.subscriptionOffers)
    .where("communeId", "==", communeId)
    .where("status", "==", "ACTIVE")
    .get();
  return snap.docs.map((d) => d.data() as TerritorialSubscriptionOffer);
}

// ================================================================
// UPDATE DRAFT
// ================================================================
export async function updateDraftVersion(input: {
  offerId: string;
  versionId: string;
  actorUserId: string;
  actorRole: OperatorRole;
  commercial: CommercialConfiguration;
}): Promise<TerritorialSubscriptionOfferVersion> {
  if (!isTransitionAuthorized("EDIT_DRAFT", input.actorRole)) throw new Error("Not authorized");

  const offer = await getOffer(input.offerId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "DRAFT") throw new Error("Offer not DRAFT");
  if (offer.draftVersionId !== input.versionId) throw new Error("Not current draft");

  const version = await getOfferVersion(input.versionId);
  if (!version || version.status !== "DRAFT") throw new Error("Version not editable");

  const now = Date.now();
  await db().collection(collections.subscriptionOfferVersions).doc(input.versionId).update({
    commercial: input.commercial,
    updatedAt: now,
    updatedBy: input.actorUserId,
  });
  await db().collection(collections.subscriptionOffers).doc(input.offerId).update({
    updatedAt: now,
    updatedBy: input.actorUserId,
  });

  await logOfferEvent({
    type: "OFFER_DRAFT_UPDATED",
    offerId: input.offerId,
    operatorId: offer.operatorId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    versionId: input.versionId,
    versionNumber: version.versionNumber,
    changes: { commercial: input.commercial },
  });

  return { ...version, commercial: input.commercial, updatedAt: now, updatedBy: input.actorUserId };
}

// ================================================================
// SUBMIT
// ================================================================
export async function submitOffer(input: {
  offerId: string;
  actorUserId: string;
  actorRole: OperatorRole;
}): Promise<{ offer: TerritorialSubscriptionOffer; version: TerritorialSubscriptionOfferVersion }> {
  if (!isTransitionAuthorized("SUBMIT", input.actorRole)) throw new Error("Not authorized to submit");

  const offer = await getOffer(input.offerId);
  if (!offer) throw new Error("Offer not found");
  if (!canTransitionOffer(offer.status, "SUBMIT")) throw new Error("Cannot submit");

  const versionId = offer.draftVersionId;
  if (!versionId) throw new Error("No draft");
  const version = await getOfferVersion(versionId);
  if (!version || !canTransitionVersion(version.status, "SUBMIT")) throw new Error("Version not submittable");

  const now = Date.now();
  const nextStatus = nextOfferStatus(offer.status, "SUBMIT")!;

  const batch = db().batch();
  batch.update(db().collection(collections.subscriptionOffers).doc(input.offerId), {
    status: nextStatus, updatedAt: now, updatedBy: input.actorUserId,
  });
  batch.update(db().collection(collections.subscriptionOfferVersions).doc(versionId), {
    status: "SUBMITTED",
    submittedBy: input.actorUserId, submittedAt: now,
    updatedAt: now, updatedBy: input.actorUserId,
  });

  const approvalRef = db().collection(collections.approvalRequests).doc();
  batch.set(approvalRef, {
    id: approvalRef.id,
    offerId: input.offerId, versionId,
    versionNumber: version.versionNumber,
    submittedBy: input.actorUserId, submittedAt: now,
    decision: null, decidedBy: null, decidedAt: null, decisionNote: null,
    status: "PENDING",
  });

  await batch.commit();

  await logOfferEvent({
    type: "OFFER_SUBMITTED_FOR_APPROVAL",
    offerId: input.offerId,
    operatorId: offer.operatorId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    versionId, versionNumber: version.versionNumber,
  });

  return {
    offer: { ...offer, status: nextStatus, updatedAt: now, updatedBy: input.actorUserId },
    version: { ...version, status: "SUBMITTED", submittedBy: input.actorUserId, submittedAt: now },
  };
}

// ================================================================
// APPROVE
// ================================================================
export async function approveOffer(input: {
  offerId: string;
  approvalRequestId: string;
  actorUserId: string;
  actorRole: OperatorRole;
  note?: string;
}): Promise<{ offer: TerritorialSubscriptionOffer; version: TerritorialSubscriptionOfferVersion }> {
  if (!isTransitionAuthorized("APPROVE", input.actorRole)) throw new Error("Only CEO can approve");

  const offer = await getOffer(input.offerId);
  if (!offer) throw new Error("Offer not found");
  if (!canTransitionOffer(offer.status, "APPROVE")) throw new Error("Cannot approve");

  const versionId = offer.draftVersionId;
  if (!versionId) throw new Error("No submitted version");
  const version = await getOfferVersion(versionId);
  if (!version || !canTransitionVersion(version.status, "APPROVE")) throw new Error("Version not approvable");

  const now = Date.now();
  const prevActive = offer.activeVersionId;

  const batch = db().batch();
  batch.update(db().collection(collections.subscriptionOfferVersions).doc(versionId), {
    status: "APPROVED",
    approvedBy: input.actorUserId, approvedAt: now,
    updatedAt: now, updatedBy: input.actorUserId,
  });
  batch.update(db().collection(collections.subscriptionOffers).doc(input.offerId), {
    status: "ACTIVE",
    activeVersionId: versionId, draftVersionId: null,
    updatedAt: now, updatedBy: input.actorUserId,
  });
  if (prevActive && prevActive !== versionId) {
    batch.update(db().collection(collections.subscriptionOfferVersions).doc(prevActive), {
      status: "SUPERSEDED", updatedAt: now, updatedBy: input.actorUserId,
    });
  }
  batch.update(db().collection(collections.approvalRequests).doc(input.approvalRequestId), {
    decision: "APPROVED" as ApprovalDecision,
    decidedBy: input.actorUserId, decidedAt: now,
    decisionNote: input.note ?? null, status: "DECIDED",
  });
  await batch.commit();

  await logOfferEvent({
    type: "OFFER_APPROVED",
    offerId: input.offerId,
    operatorId: offer.operatorId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    versionId, versionNumber: version.versionNumber,
    previousVersionId: prevActive ?? undefined,
    note: input.note,
  });

  if (prevActive) {
    await logOfferEvent({
      type: "OFFER_VERSION_SUPERSEDED",
      offerId: input.offerId,
      operatorId: offer.operatorId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      versionId: prevActive,
    });
  }

  await logOfferEvent({
    type: "OFFER_VERSION_ACTIVATED",
    offerId: input.offerId,
    operatorId: offer.operatorId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    versionId, versionNumber: version.versionNumber,
  });

  return {
    offer: { ...offer, status: "ACTIVE", activeVersionId: versionId,
             draftVersionId: null, updatedAt: now, updatedBy: input.actorUserId },
    version: { ...version, status: "APPROVED", approvedBy: input.actorUserId, approvedAt: now },
  };
}

// ================================================================
// REJECT
// ================================================================
export async function rejectOffer(input: {
  offerId: string;
  approvalRequestId: string;
  actorUserId: string;
  actorRole: OperatorRole;
  reason: string;
}): Promise<void> {
  if (!isTransitionAuthorized("REJECT", input.actorRole)) throw new Error("Only CEO can reject");

  const offer = await getOffer(input.offerId);
  if (!offer) throw new Error("Offer not found");
  const versionId = offer.draftVersionId;
  if (!versionId) throw new Error("No submitted version");
  const version = await getOfferVersion(versionId);
  if (!version) throw new Error("Version not found");

  const now = Date.now();
  const batch = db().batch();
  batch.update(db().collection(collections.subscriptionOfferVersions).doc(versionId), {
    status: "REJECTED",
    rejectedBy: input.actorUserId, rejectedAt: now,
    rejectionReason: input.reason,
    updatedAt: now, updatedBy: input.actorUserId,
  });
  batch.update(db().collection(collections.subscriptionOffers).doc(input.offerId), {
    status: "DRAFT", updatedAt: now, updatedBy: input.actorUserId,
  });
  batch.update(db().collection(collections.approvalRequests).doc(input.approvalRequestId), {
    decision: "REJECTED" as ApprovalDecision,
    decidedBy: input.actorUserId, decidedAt: now,
    decisionNote: input.reason, status: "DECIDED",
  });
  await batch.commit();

  await logOfferEvent({
    type: "OFFER_REJECTED",
    offerId: input.offerId,
    operatorId: offer.operatorId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    versionId, versionNumber: version.versionNumber,
    note: input.reason,
  });
}
