# Phase 2 prerequisites — territory coherence gates

Pilot territory: **Ranomafana I** (campaigns where `fokontany === "Ranomafana I"`).

## The four gates

1. **Promotion** (`POST /api/stakes/{stakeId}/promote`) — creates `operatorTerritoryValidations/{op}_{clusterId}`. Requires scenario GO + campaign config LOCKED.
2. **Assignment** (`POST /api/operators/{opId}/campaigns/{campId}/assign`) — server-side. Requires campaign config LOCKED.
3. **Offer creation** — `createOfferFromScenario` now requires operator validation for the scenario's cluster, and stores `configVersionId` in the offer version baseline.
4. **Subscription** — `createSubscriptionFromOffer` rejects unless:
   - operator has a validated record for the offer's territory
   - citizen's `fokontanyId` matches the validation's `fokontanyId` (Option A: "Service not yet available in your area")

## Setup sequence for Ranomafana I pilot

```bash
# 1. Confirm campaign exists with fokontany "Ranomafana I"
#    (check Firestore console: campaigns where fokontany == "Ranomafana I")

# 2. Lock the campaign config (via UI or API)
#    POST /api/config/campaigns/{id}/versions → POST /versions/{v}/approve → POST /versions/{v}/lock

# 3. Assign operator to campaign (server endpoint)
#    POST /api/operators/{opId}/campaigns/{campId}/assign

# 4. Complete a stake-in for that operator (existing assessment flow)

# 5. Promote the stake
#    POST /api/stakes/{stakeId}/promote  { "campaignId": "{campId}" }

# 6. Operator creates an offer (existing flow, now requires validation)
#    createOfferFromScenario({ ..., campaignId: "{campId}" })

# 7. Publish the offer (existing state machine: DRAFT → ACTIVE)

# 8. Citizen in Ranomafana I can now subscribe to that offer

---

## Quarantine + combine policy (Phase 2b)

### Quarantine — for pre-gate subscriptions
Pre-gate = missing `territoryId` / `configVersionId` / operator validation.

1. Run audit: `node --env-file=.env.local --import tsx services/scripts/audit-pregate-subscriptions.ts`
2. If pre-gate subs exist, mark: `node --env-file=.env.local --import tsx services/scripts/quarantine-pregate-subscriptions.ts --apply`
3. Marked subscriptions: `quarantined: true`, `legacy: true` — **cycle scheduling blocked, in-flight cycles complete, escrow untouched**
4. Resolution: operator completes assessment → promoted → admin calls `POST /api/subscriptions/{id}/release-quarantine` with rationale
5. On release: `quarantined: false`, `releasedAt` / `releasedBy` set, `legacy: true` **retained**

### Combine — for mid-flight revocation
- **New cycle scheduling** (`scheduleCyclesForSubscription`) — live check on `operatorTerritoryValidations`; if missing or `validated: false`, refuses. Existing in-flight cycles are unaffected.
- **Settlement** (`emitSettlementEntitlement`) — snapshots `territoryIdSnapshot`, `configVersionIdSnapshot`, `validationValidatedAtSnapshot` in `assumptions`. Prior settlements remain defensible even if validation is later revoked.

### Order of deployment (critical)
1. Run `phase2b-quarantine-combine.sh --apply`
2. `npx tsc --noEmit && npx next build --no-lint`
3. **Run audit BEFORE deploying cycle-scheduling gate to prod** — if pre-gate subs exist, run quarantine script first, otherwise their cycle scheduling will start failing when the live check activates
4. Deploy
5. Only then allow new subscriptions to be created

### Verification after apply
- `npx tsc --noEmit` silent
- `npx next build --no-lint` green
- New subscription via API: `subscriptions/{id}` has `territoryId`, `configVersionId`, `quarantined: false`, `legacy: false`
- Quarantine script dry-run on a clean dataset returns `Marked: 0`
