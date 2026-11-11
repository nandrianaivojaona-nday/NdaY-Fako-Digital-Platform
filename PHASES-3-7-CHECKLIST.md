# Phases 3-7 — remaining work

## Phase 3 — integrity bounds inside `logPickupWithChain`
- [ ] Geo: `turf.booleanPointInPolygon(gps, zone.geometry)` for assigned fokontany — flag if false.
- [ ] Frequency: compare to `operatorRequirements.frequency` + last pickup timestamp for same bin — flag if implausible.
- [ ] Weight bounds per bag type — flag if outside [0, 500].
- [ ] Write outcome to `service_events.status`: `VALIDATED` | `FLAGGED` | `REJECTED`.
- [ ] Review queue UI (admin/operator) filtering `status=FLAGGED`.
- [ ] **Tune bounds against pilot data. Start in flag-only mode.**

## Phase 4 — verified billable events
- [ ] Emit `verifiedBillableEvents/{id}` on `VERIFIED` (auto clean path or review-queue approve).
- [ ] Record references `sourceEventId`, `configVersionId`, `campaignId`, `operatorId`, `verifiedAt`, `verifiedBy`.
- [ ] Rewrite `getPickups()` / `getOperatorKPI()` to read this collection, not raw `pickups`.

## Phase 5 — settlement (repo has decided: entitlement-based)
- [ ] **Confirm with finance/business lead** that per-cycle entitlement (`entitlementValueMGA` × `offerVersion`) is the billing basis. The plan's per-kg formula is NOT what the code implements.
- [ ] If confirmed: add `computationVersion: 1` field in `settlementEngine.computeSettlementEntitlement`.
- [ ] If per-kg required *in addition*: separate ADR, new work.
- [ ] Build doc 05 §7 reconciliation report as cron route (parallel to `cron/settlement-payouts`).
- [ ] Reproducibility test: re-run `computeSettlementEntitlement` on same inputs → byte-identical output.

## Phase 6 — replay + governed learning
- [ ] Replay job compares `bankabilityAssessment`/`marketDemandOutput`/`operabilityAssessment` from `AssessmentDraft` vs actual settlement aggregates → `replayResults/{id}` with proposal only (never auto-apply).
- [ ] `learningProposals/{id}` with DRAFT/APPROVED/REJECTED status.
- [ ] **Blocked until Phase 5 has run for a full cycle.**

## Phase 7 — next config version
- [ ] Approving a `learningProposal` calls `POST /api/config/campaigns/{id}/versions` (Phase 1, once built) with `previousVersionId` — no new code, new trigger only.
