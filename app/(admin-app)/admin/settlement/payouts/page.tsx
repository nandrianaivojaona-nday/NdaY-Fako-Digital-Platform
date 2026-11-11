"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { SettlementPayout } from "@/lib/domain/settlement/payoutTypes";

export default function AdminSettlementPayoutsPage() {
  const { firebaseUser, user, loading: authLoading } = useAuth();
  const [payouts, setPayouts] = useState<SettlementPayout[]>([]);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/app/settlement/payouts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load payouts");
      setPayouts(result.payouts as SettlementPayout[]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load payouts");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => { void load(); }, [load]);

  async function updatePayout(payout: SettlementPayout, action: "INSTRUCT" | "CONFIRM" | "FAIL" | "RETRY") {
    setBusyId(payout.id);
    setError(null);
    setNotice(null);
    try {
      const token = await firebaseUser!.getIdToken();
      const body = action === "INSTRUCT"
        ? { action, providerReference: references[payout.id] ?? "" }
        : action === "FAIL"
          ? { action, reason: window.prompt("Why did the transfer fail?") ?? "" }
          : { action };
      if (action === "FAIL" && !body.reason) return;
      const response = await fetch(`/api/app/settlement/payouts/${encodeURIComponent(payout.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update payout");
      setNotice(`Payout ${payout.id} updated to ${result.payout.status}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update payout");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (user?.role !== "ADMIN") return <div className="p-8 text-red-700">Administrator access required.</div>;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Settlement</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Operator payouts</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Payouts are batched from emitted settlement entitlements. Make the bank or mobile money transfer in your finance system, then record its reference here and confirm or fail it.
        </p>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{payouts.length} payout records</p>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="space-y-4">
        {payouts.map((payout) => (
          <article key={payout.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">{payout.operatorId}</h2>
                <p className="mt-1 text-xs text-slate-500">{new Date(payout.periodStart).toLocaleDateString()} – {new Date(payout.periodEnd).toLocaleDateString()} · {payout.entitlementIds.length} entitlements</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900">{payout.totalMGA.toLocaleString()} MGA</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{payout.status}</p>
              </div>
            </div>

            {payout.providerReference && <p className="mt-3 text-sm text-slate-600">Transfer reference: <span className="font-mono">{payout.providerReference}</span></p>}
            {payout.failureReason && <p className="mt-2 text-sm text-red-700">{payout.failureReason}</p>}

            {payout.status === "PENDING" && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={references[payout.id] ?? ""}
                  onChange={(event) => setReferences((current) => ({ ...current, [payout.id]: event.target.value }))}
                  placeholder="Bank or mobile money transfer reference"
                  aria-label="Transfer reference"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button onClick={() => void updatePayout(payout, "INSTRUCT")} disabled={busyId === payout.id} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Record transfer
                </button>
                <button onClick={() => void updatePayout(payout, "FAIL")} disabled={busyId === payout.id} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
                  Mark failed
                </button>
              </div>
            )}
            {payout.status === "INSTRUCTED" && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => void updatePayout(payout, "CONFIRM")} disabled={busyId === payout.id} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Confirm paid
                </button>
                <button onClick={() => void updatePayout(payout, "FAIL")} disabled={busyId === payout.id} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
                  Mark failed
                </button>
              </div>
            )}
            {payout.status === "FAILED" && (
              <button onClick={() => void updatePayout(payout, "RETRY")} disabled={busyId === payout.id} className="mt-4 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">
                Retry payout
              </button>
            )}
          </article>
        ))}
        {!loading && payouts.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No payouts are ready for this period yet.</p>}
      </div>
    </main>
  );
}
