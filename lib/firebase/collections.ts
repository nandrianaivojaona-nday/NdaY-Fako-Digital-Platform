// lib/firebase/collections.ts
// Central registry of Firestore collection names.
// Never hard-code collection strings elsewhere.

export const collections = {
    // ------ Users & roles ------
    users: "users",
    workers: "workers",
    collectors: "collectors",
    operators: "operators",

    // ------ Territory ------
    territorialProfiles: "territorialProfiles",
    fokontany: "fokontany",
    clusters: "clusters",
    municipalities: "municipalities",
    sectors: "sectors",

    // ------ Plans & offers ------
    planTypes: "planTypes",
    subscriptionOffers: "subscriptionOffers",
    subscriptionOfferVersions: "subscriptionOfferVersions",
    approvalRequests: "approvalRequests",
    offerEvents: "offerEvents",

    //business model

    businessModelScenarios: "businessModelScenarios",
    oveValidations: "oveValidations",

    // ------ Subscriptions ------
    subscriptions: "subscriptions",
    subscriptionEvents: "subscriptionEvents",
    subscriptionCreationLocks: "subscriptionCreationLocks",

    // ------ Equipment ------
    bins: "bins",
    binEvents: "binEvents",
    bags: "bags",
    bagEvents: "bagEvents",

    // ------ Operations ------
    collectorRoutes: "collectorRoutes",
    collectorIncidents: "collectorIncidents",
    serviceProofs: "serviceProofs",
    pickups: "pickups",
    pickup_requests: "pickup_requests",

    // ------ Money ------
    payments: "payments",
    paymentEvents: "payment_events",
    escrow: "escrow",
    escrowEvents: "escrowEvents",


    // ------ WMS ------
    vehicles: "vehicles",
    vehicleAssignments: "vehicleAssignments",
    serviceAreas: "serviceAreas",

    // ------ Internal counters ------
    counters: "_counters",

    // Service cycles & settlement
    serviceCycles: "serviceCycles",
    cycleEvents: "cycleEvents",
    settlements: "settlements",
    settlementBatches: "settlementBatches",
    settlementPipelines: "settlementPipelines",
    settlementPayouts: "settlementPayouts",
    settlementPayoutEvents: "settlementPayoutEvents",
    payoutEntitlementAssignments: "payoutEntitlementAssignments",
    disputes: "disputes",

    // Citizen affordability (cached on user doc, no separate collection needed)
    // But we add the reference for clarity
    citizenAffordability: "citizenAffordability",  // optional — for future cross-referencing

    stakes: "stakes",
    stakeIns: "stakeIns",
    tveRuns: "tveRuns",
    recalibrations: "recalibrations",
    hazardCache: "hazardCache",


} as const;

export type CollectionName = typeof collections[keyof typeof collections];
