import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { getOfferVersion } from "@/services/offerService";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!session && !bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = getAuth(getAdminApp());
  const decoded = session
    ? await auth.verifySessionCookie(session, true)
    : await auth.verifyIdToken(bearer!);
  const db = getFirestore(getAdminApp());
  const profile = (await db.collection("users").doc(decoded.uid).get()).data() ?? {};
  const communeId = profile.communeId;
  if (!communeId) return NextResponse.json({ offers: [] });

  const snap = await db
    .collection(collections.subscriptionOffers)
    .where("communeId", "==", communeId)
    .where("status", "==", "ACTIVE")
    .get();

  const offers = await Promise.all(
    snap.docs.map(async (d) => {
      const offer = d.data();
      const version = offer.activeVersionId
        ? await getOfferVersion(offer.activeVersionId)
        : null;
      if (!version) return null;
      return {
        offerId: offer.id,
        planTypeName: offer.planTypeId.replace("HH_", "").replace("_", " "),
        monthlyPriceMGA: version.commercial.monthlyPriceMGA,
        contractPriceMGA: version.commercial.contractPriceMGA,
        frequency: version.commercial.serviceLevel.collectionFrequency,
        features: version.commercial.bins.map(
          (b: any) => `${b.label} (${b.stream.toLowerCase()})`
        ),
      };
    })
  );

  return NextResponse.json({
    offers: offers.filter(Boolean),
    communeName: profile.communeName ?? "",
  });
}
