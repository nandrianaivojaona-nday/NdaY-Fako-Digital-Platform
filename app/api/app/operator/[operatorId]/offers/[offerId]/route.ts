import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getOffer, getOfferVersion, updateDraftVersion } from "@/services/offerService";
import type { OperatorRole } from "@/lib/domain/subscription/operatorRoles";

async function authenticate(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return {
    uid: decoded.uid,
    role: ((decoded as any).operatorRole ?? "COLLECTOR") as OperatorRole,
    operatorId: (decoded as any).operatorId as string | undefined,
  };
}

export async function GET(req: NextRequest, context: { params: Promise<{ operatorId: string; offerId: string }> }) {
  try {
    const actor = await authenticate(req);
    const { operatorId, offerId } = await context.params;
    if (actor.operatorId !== operatorId && actor.role !== "CEO") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const offer = await getOffer(offerId);
    if (!offer || offer.operatorId !== operatorId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const activeVersion = offer.activeVersionId ? await getOfferVersion(offer.activeVersionId) : null;
    const draftVersion = offer.draftVersionId ? await getOfferVersion(offer.draftVersionId) : null;
    return NextResponse.json({ offer, activeVersion, draftVersion });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ operatorId: string; offerId: string }> }
) {
  try {
    const actor = await authenticate(req);
    const { operatorId, offerId } = await context.params;
    if (actor.operatorId !== operatorId && actor.role !== "CEO") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const offer = await getOffer(offerId);
    if (!offer || offer.operatorId !== operatorId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const updated = await updateDraftVersion({
      offerId,
      versionId: body.versionId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      commercial: body.commercial,
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
