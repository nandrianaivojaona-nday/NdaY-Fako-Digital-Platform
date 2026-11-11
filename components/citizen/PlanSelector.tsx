"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { PaymentMethod } from "@/lib/domain/subscription/types";

interface CitizenOffer {
  offerId: string;
  planTypeName: string;
  monthlyPriceMGA?: number;
  contractPriceMGA?: number;
  frequency: string;
  features: string[];
}

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "MVOLA", label: "MVola" },
  { id: "ORANGE_MONEY", label: "Orange Money" },
  { id: "AIRTEL_MONEY", label: "Airtel Money" },
  { id: "VISA", label: "Visa / Mastercard" },
  { id: "BANK_TRANSFER", label: "Bank transfer" },
  { id: "CASH", label: "Cash (operator-validated)" },
];

export default function PlanSelector({
  onSelect,
}: {
  onSelect: (input: { offerId: string; method: PaymentMethod; phone?: string }) => void;
}) {
  const { firebaseUser } = useAuth();
  const [offers, setOffers] = useState<CitizenOffer[]>([]);
  const [offerId, setOfferId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("MVOLA");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOffers() {
      if (!firebaseUser) {
        setLoading(false);
        return;
      }
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch("/api/app/citizen/offers", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load subscriptions");
        if (!cancelled) {
          const available = (data.offers ?? []) as CitizenOffer[];
          setOffers(available);
          setOfferId(available[0]?.offerId ?? "");
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load subscriptions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOffers();
    return () => { cancelled = true; };
  }, [firebaseUser]);

  const needsPhone = ["MVOLA", "ORANGE_MONEY", "AIRTEL_MONEY"].includes(method);
  if (loading) return <p className="text-white/60">Loading available offers…</p>;
  if (loadError) return <p role="alert" className="text-red-300">{loadError}</p>;
  if (offers.length === 0) return <p className="text-white/60">There are no active subscription offers in your commune yet.</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {offers.map((offer) => {
          const price = offer.monthlyPriceMGA ?? offer.contractPriceMGA;
          return (
            <button
              key={offer.offerId}
              type="button"
              onClick={() => setOfferId(offer.offerId)}
              className={`text-left rounded-2xl border p-5 transition ${offerId === offer.offerId ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
            >
              <h4 className="text-lg font-semibold text-white">{offer.planTypeName}</h4>
              <p className="text-sm text-white/60">{offer.frequency.replaceAll("_", " ")}</p>
              {price != null && <p className="mt-3 text-2xl font-bold text-cyan-300">{price.toLocaleString()} <span className="text-sm font-normal">MGA</span></p>}
              <ul className="mt-3 space-y-1 text-sm text-white/70">{offer.features.map((feature) => <li key={feature}>• {feature}</li>)}</ul>
            </button>
          );
        })}
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Payment method</label>
        <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white">
          {METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>

      {needsPhone && <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Mobile number</label>
        <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="034 xx xxx xx" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
      </div>}

      <button disabled={!offerId} onClick={() => onSelect({ offerId, method, phone: phone || undefined })} className="w-full rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50">
        Continue to payment
      </button>
    </div>
  );
}
