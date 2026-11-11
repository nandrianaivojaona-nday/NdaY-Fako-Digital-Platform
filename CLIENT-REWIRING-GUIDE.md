# Phase 1 — client rewiring guide (CORRECTED)

My earlier "5 client rewires" was wrong. Reading the actual files, only **3** need
work, and one of them is a Phase 0 regression, not Phase 1 config work.

## Complete inventory

| File | What it writes | Category | Action |
|---|---|---|---|
| `hooks/useCampaignValidation.ts` | pricingFramework + financialRules + operatorRequirements | **Config write** | ✅ Auto-rewritten by this script |
| `hooks/useOperatorAssignment.ts` | operatorCampaigns binding (copies pricing snapshot) | Config snapshot | ✅ Auto-patched: adds configVersionId |
| `hooks/useOperatorSetup.ts` | campaigns.operators.{operatorId} | **Phase 0 regression** | ✅ Auto-rewired to new endpoint |
| `app/(admin-app)/campaigns/[id]/assign/page.tsx` | assignedOperatorId, status | Admin assignment | ❌ Leave alone — works under isAdminLike() |
| `app/assessment/[campaignId]/AssessmentContent.tsx` | status = READY_FOR_REVIEW | Admin status flip | ❌ Leave alone — works under isAdminLike() |
| `app/operator/[operatorId]/setup/OperatorSetupContent.tsx` | (none — parent component) | — | ❌ Nothing to do |

## What the script does

### `useCampaignValidation.ts` — full rewrite

The old `validateAndActivate` did one `updateDoc` that wrote config AND status
together. Split into two:

1. `createConfigDraft(campaignId, payload, idToken)` → DRAFT version record
2. `updateDoc(campaigns/{id}, { status: "VALIDATED_FOR_ACTIVATION", ... })` → status

Rationale: the draft endpoint owns `campaignConfigVersions` (immutable); the
status flip stays as an admin-only write to `campaigns` (still permitted under
Phase 0 rules).

The return shape changes slightly — adds `isSubmitting`. If any caller of this
hook relies on the old return shape, update them. (grep `useCampaignValidation`
to find callers.)

### `useOperatorAssignment.ts` — one-line addition

The operatorCampaigns binding now carries `configVersionId`. It prefers the
locked version; falls back to the latest DRAFT:

```ts
configVersionId:
  (campaign as any).currentConfigVersionId ??
  (campaign as any).latestDraftConfigVersionId ??
  null,
