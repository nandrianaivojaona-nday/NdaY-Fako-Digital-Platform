import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { confirmsSubscriptionHold, getProviderByName } from "@/services/paymentService";
import { collections } from "@/lib/firebase/collections";
import { createHash } from "crypto";
import { getSubscription, activateSubscription } from "@/services/subscriptionService";
import { getEscrow, markEscrowAuthorized, resolveLateFundingAfterCancellation } from "@/services/escrowService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await context.params;
  const provider = getProviderByName(providerName);
  if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-signature") ??
    req.headers.get("x-paidmada-signature") ??
    req.headers.get("x-dusupay-signature") ?? "";

  if (!provider.verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const event = provider.normalizeWebhook(payload);
  const db = getFirestore(getAdminApp());

    if (!event.eventId || !event.reference || !event.transactionId || !Number.isFinite(event.amountMGA)) {
    return NextResponse.json({ error: "Webhook is missing required payment fields" }, { status: 400 });
  }

  const eventRef = db.collection(collections.paymentEvents)
    .doc(createHash("sha256").update(`${providerName}:${event.eventId}`).digest("hex"));
  const prior = await eventRef.get();
  if (prior.exists && prior.get("processingStatus") === "PROCESSED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  try {
    if (!prior.exists) await eventRef.create({
      eventId: event.eventId,
      transactionId: event.transactionId,
      reference: event.reference,
      status: event.status,
      amountMGA: event.amountMGA,
      method: event.method,
      provider: providerName,
      processingStatus: "RECEIVED",
      receivedAt: Date.now(),
      payload: event.raw ?? null,
    });
  } catch {
    // A concurrent delivery may have claimed this event. Continue from the
    // durable RECEIVED record; lifecycle changes below are idempotent.
  }

  try {
    const subscription = await getSubscription(event.reference);
    if (!subscription) throw new Error("Subscription reference not found");
    const escrow = await getEscrow(subscription.escrowId);
    if (!escrow || escrow.subscriptionId !== subscription.id || escrow.citizenId !== subscription.citizenId) {
      throw new Error("Subscription escrow link is invalid");
    }
    if (escrow.method !== subscription.paymentMethod || event.method !== subscription.paymentMethod) {
      throw new Error("Webhook payment method does not match the subscription");
    }
    if (event.escrowId && event.escrowId !== escrow.id) {
      throw new Error("Webhook escrow reference does not match the subscription");
    }
    if (getProviderByName(providerName)?.name !== getProviderByNameForMethod(subscription.paymentMethod)) {
      throw new Error("Webhook provider does not match the subscription payment method");
    }

    let wasLateAndUnwound = false;
    if (confirmsSubscriptionHold(escrow.holdType, event.status)) {
      if (subscription.amountMGA !== event.amountMGA) {
        throw new Error("Webhook amount does not match the initial subscription hold");
      }
      if (escrow.status === "VOIDED") {
        await resolveLateFundingAfterCancellation({
          escrowId: escrow.id,
          transactionId: event.transactionId,
          providerName,
          status: event.status,
          amountMGA: event.amountMGA,
        });
        wasLateAndUnwound = true;
      } else if (
        ["PARTIALLY_REFUNDED", "REFUNDED"].includes(escrow.status) &&
        escrow.providerName === providerName && escrow.providerReference === event.transactionId
      ) {
        wasLateAndUnwound = true;
      } else if (escrow.status === "PENDING") {
        await markEscrowAuthorized(subscription.escrowId, event.transactionId, providerName, undefined, event.status);
      } else if (
        !["HELD", "PARTIALLY_RELEASED", "PARTIALLY_REFUNDED", "SETTLED"].includes(escrow.status) ||
        escrow.providerName !== providerName || escrow.providerReference !== event.transactionId
      ) {
        throw new Error(`Cannot authorize webhook against escrow in ${escrow.status}`);
      }
      if (!wasLateAndUnwound && subscription.status !== "CANCELLED") {
        await activateSubscription(subscription.id, { uid: "SYSTEM", role: "SYSTEM" });
      }
    }

    await eventRef.set({ processingStatus: "PROCESSED", processedAt: Date.now() }, { merge: true });
  } catch (error) {
    await eventRef.set({
      processingStatus: "FAILED",
      processingError: error instanceof Error ? error.message : "Webhook processing failed",
      processedAt: Date.now(),
    }, { merge: true });
    return NextResponse.json({ error: "Payment event could not be applied" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

function getProviderByNameForMethod(method: string): string | null {
  switch (method) {
    case "MVOLA":
    case "ORANGE_MONEY":
    case "AIRTEL_MONEY": return "paidmada";
    case "BANK_TRANSFER": return "ariary";
    case "VISA": return "dusupay";
    default: return null;
  }
}
