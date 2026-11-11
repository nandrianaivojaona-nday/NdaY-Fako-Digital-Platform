// app/api/app/citizen/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import {
  createSubscriptionFromOffer,
  getActiveSubscriptionForCitizen,
  getPendingSubscriptionForCitizen,
  beginSubscriptionCancellation,
  cancelSubscription,
  activateSubscription,
  getSubscription,
} from "@/services/subscriptionService";
import { authorizePayment, confirmsSubscriptionHold, resolveHoldType } from "@/services/paymentService";
import { cancelRemainingEscrow, getEscrow, markEscrowAuthorized } from "@/services/escrowService";
import type { PaymentMethod } from "@/lib/domain/subscription/types";

async function authenticate(req: NextRequest): Promise<string> {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return decoded.uid;
}

export async function GET(req: NextRequest) {
  try {
    const uid = await authenticate(req);
    const subscriptionId = req.nextUrl.searchParams.get("ref");
    if (subscriptionId) {
      const subscription = await getSubscription(subscriptionId);
      if (!subscription || subscription.citizenId !== uid) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      const escrow = await getEscrow(subscription.escrowId);
      const paymentSnap = await getFirestore(getAdminApp()).collection(collections.payments)
        .where("escrowId", "==", subscription.escrowId).limit(1).get();
      const paymentIntent = paymentSnap.empty ? null : paymentSnap.docs[0].data();
      return NextResponse.json({
        subscription,
        payment: escrow ? {
          status: escrow.status,
          holdType: escrow.holdType,
          totalAmountMGA: escrow.totalAmountMGA,
          heldAmountMGA: escrow.heldAmountMGA,
          authorizedAt: escrow.authorizedAt ?? null,
          cancellationPending: escrow.cancellationPending === true,
          checkoutUrl: escrow.status === "PENDING" && !escrow.cancellationPending ? paymentIntent?.redirectUrl ?? null : null,
          instructions: escrow.status === "PENDING" && !escrow.cancellationPending ? paymentIntent?.instructions ?? null : null,
        } : null,
      });
    }
    const sub = await getActiveSubscriptionForCitizen(uid);
    return NextResponse.json(sub ?? { status: "NONE" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  let newSubscriptionId: string | undefined;
  try {
    const uid = await authenticate(req);
    const body = await req.json();
    const allowedMethods: PaymentMethod[] = ["MVOLA", "ORANGE_MONEY", "AIRTEL_MONEY", "VISA", "BANK_TRANSFER", "CASH"];
    if (!body.offerId || !body.paymentMethod) {
      return NextResponse.json({ error: "offerId and paymentMethod required" }, { status: 400 });
    }
    if (!allowedMethods.includes(body.paymentMethod as PaymentMethod)) {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }
    const [activeSubscription, pendingSubscription] = await Promise.all([
      getActiveSubscriptionForCitizen(uid),
      getPendingSubscriptionForCitizen(uid),
    ]);
    const existing = activeSubscription ?? pendingSubscription;
    if (existing) {
      return NextResponse.json({
        error: activeSubscription
          ? "An active subscription already exists for this citizen"
          : "A subscription is already awaiting payment confirmation",
        existingSubscriptionId: existing.id,
      }, { status: 409 });
    }

    // 1. Create subscription + escrow
    const { subscription, escrowId } = await createSubscriptionFromOffer({
      citizenId: uid,
      offerId: body.offerId,
      paymentMethod: body.paymentMethod as PaymentMethod,
      operatorId: body.operatorId,
      fokontanyId: body.fokontanyId,
      communeId: body.communeId,
    });
    newSubscriptionId = subscription.id;

    // 2. Authorize the hold (no capture)
    const origin = new URL(req.url).origin;
    let intent;
    try {
      intent = await authorizePayment({
        reference: subscription.id,
        escrowId,
        amountMGA: subscription.amountMGA,
        method: subscription.paymentMethod,
        customerPhone: body.customerPhone,
        returnUrl: `${origin}/citizen/subscriptions?ref=${subscription.id}`,
        idempotencyKey: `${escrowId}:auth`,
      });
    } catch (paymentError) {
      // Close the newly created request so it cannot block a retry. Any provider
      // confirmation that races this cancellation is refunded/voided by the webhook.
      try {
        const reason = "Payment authorization could not be started";
        await beginSubscriptionCancellation(subscription.id, uid, reason);
        await cancelRemainingEscrow({
          escrowId,
          reason,
          actorUserId: uid,
        });
        await cancelSubscription(subscription.id, uid, reason);
      } catch {
        // Preserve the provider error; the subscription reference was not exposed yet.
      }
      throw paymentError;
    }

    // 3. Cash — nothing to authorize, escrow stays as CASH_ON_DELIVERY
    let activatedSubscription = subscription;
    if (subscription.paymentMethod === "CASH") {
      activatedSubscription = await activateSubscription(subscription.id, { uid, role: "SYSTEM" });
    } else if (
      intent.method === subscription.paymentMethod &&
      intent.amountMGA === subscription.amountMGA &&
      intent.escrowId === escrowId &&
      intent.holdType === resolveHoldType(subscription.paymentMethod) &&
      confirmsSubscriptionHold(intent.holdType, intent.status) &&
      intent.transactionId
    ) {
      await markEscrowAuthorized(escrowId, intent.transactionId, intent.provider, intent.expiresAt, intent.status);
      activatedSubscription = await activateSubscription(subscription.id, {
        uid,
        role: "CITIZEN",
      });
    }

    return NextResponse.json({
      subscription: activatedSubscription,
      escrowId,
      payment: intent,
      notice: subscription.paymentMethod === "CASH"
        ? "Pay the collector for each service cycle. Each payment is recorded against its cycle."
        : activatedSubscription.status === "ACTIVE"
          ? "Payment is confirmed and held for release per verified and accepted service delivery."
          : "Payment is awaiting provider confirmation. Service starts only after the hold is validated.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, ...(newSubscriptionId ? { subscriptionId: newSubscriptionId } : {}) }, { status: 400 });
  }
}
