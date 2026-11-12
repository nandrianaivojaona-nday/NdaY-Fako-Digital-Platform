// Gate 1 — promote a passed stake to a territory-scoped operator validation.
// Requires: scenario GO, campaign's config LOCKED, stake ties operator to scenario.
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { resolveClaimsForUser } from "@/lib/auth/mintClaims";
import { writeOperatorTerritoryValidation } from "@/services/operatorTerritoryValidationService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ stakeId: string }> }
) {
  const { stakeId } = await params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let decoded;
  try { decoded = await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => null) as { campaignId?: string } | null;
  const campaignId = (body?.campaignId ?? "").trim();
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const db = getFirestore(getAdminApp());
  const stakeSnap = await db.collection(collections.stakes).doc(stakeId).get();
  if (!stakeSnap.exists) return NextResponse.json({ error: "Stake not found" }, { status: 404 });
  const stake = stakeSnap.data()!;
  const operatorId = String(stake.operatorId ?? "");
  if (!operatorId) return NextResponse.json({ error: "Stake has no operator" }, { status: 409 });

  // Authorization: admin OR the operator who owns the stake
  const claims = await resolveClaimsForUser(decoded.uid);
  const isAdmin = claims.role === "ADMIN" || claims.super_admin === true;
  const isOwnOperator = claims.role === "OPERATOR" && claims.operatorId === operatorId;
  if (!isAdmin && !isOwnOperator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Scenario must be GO
  const scenarioId = String(stake.scenarioId ?? "");
  if (!scenarioId) return NextResponse.json({ error: "Stake has no scenario" }, { status: 409 });
  const scenarioSnap = await db.collection(collections.businessModelScenarios).doc(scenarioId).get();
  if (!scenarioSnap.exists) return NextResponse.json({ error: "Scenario not found" }, { status: 409 });
  const scenario = scenarioSnap.data()!;
  if (scenario.validationStatus !== "GO") {
    return NextResponse.json({ error: `Scenario not GO (is ${scenario.validationStatus})` }, { status: 409 });
  }
  const territoryId = String(scenario.clusterId ?? "");
  if (!territoryId) return NextResponse.json({ error: "Scenario has no clusterId" }, { status: 409 });

  // Campaign must exist with LOCKED config
  const campSnap = await db.collection("campaigns").doc(campaignId).get();
  if (!campSnap.exists) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const camp = campSnap.data()!;
  const configVersionId = String(camp.currentConfigVersionId ?? "");
  if (!configVersionId) return NextResponse.json({ error: "Campaign has no locked config" }, { status: 409 });
  const vSnap = await db.collection("campaignConfigVersions").doc(configVersionId).get();
  if (!vSnap.exists || vSnap.data()!.status !== "LOCKED") {
    return NextResponse.json({ error: "Config version is not LOCKED" }, { status: 409 });
  }
  const fokontanyId = String(camp.fokontany ?? "");
  if (!fokontanyId) return NextResponse.json({ error: "Campaign has no fokontany" }, { status: 409 });

  const tveRunId = String(stake.tveRunId ?? "");
  if (!tveRunId) return NextResponse.json({ error: "Stake has no tveRunId" }, { status: 409 });

  const validation = await writeOperatorTerritoryValidation({
    operatorId, territoryId, fokontanyId, campaignId, stakeId,
    tveRunId, scenarioId, configVersionId, validatedBy: decoded.uid,
  });

  return NextResponse.json({ ok: true, validationId: validation.id });
}
