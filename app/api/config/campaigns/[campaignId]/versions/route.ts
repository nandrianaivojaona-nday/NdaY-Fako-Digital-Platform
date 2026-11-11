import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { validateConfigVersion } from "@/lib/domain/config/validateConfigVersion";
import type { CampaignConfigVersion } from "@/lib/domain/config/configVersionTypes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let decoded;
  try { decoded = await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const role = (decoded as any).role;
  if (role !== "ADMIN" && (decoded as any).super_admin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  let validated;
  try { validated = validateConfigVersion(body); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }

  const db = getFirestore(getAdminApp());
  const campRef = db.collection("campaigns").doc(campaignId);
  const campSnap = await campRef.get();
  if (!campSnap.exists) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const existing = await db.collection("campaignConfigVersions")
    .where("campaignId", "==", campaignId)
    .orderBy("versionNumber", "desc")
    .limit(1)
    .get();

  const previousVersionId = existing.empty ? undefined : existing.docs[0].id;
  const versionNumber = existing.empty ? 1 : ((existing.docs[0].get("versionNumber") as number) + 1);

  const versionRef = db.collection("campaignConfigVersions").doc();
  const record: CampaignConfigVersion = {
    versionId: versionRef.id,
    campaignId,
    versionNumber,
    pricingFramework: validated.pricingFramework,
    financialRules: validated.financialRules,
    operatorRequirements: validated.operatorRequirements,
    status: "DRAFT",
    createdBy: decoded.uid,
    createdAt: Date.now(),
    ...(previousVersionId ? { previousVersionId } : {}),
  };
  await versionRef.set(record);

  // Also stamp campaigns.latestDraftConfigVersionId so assignment can reference
  // the DRAFT before it locks. Replaced by currentConfigVersionId on lock.
  await campRef.set({ latestDraftConfigVersionId: versionRef.id }, { merge: true });

  return NextResponse.json({ ok: true, versionId: versionRef.id, versionNumber });
}
