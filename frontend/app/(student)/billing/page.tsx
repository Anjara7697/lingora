"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { cancelSubscription, checkout, listPlans, myBilling, myPayments, startTrial } from "@/lib/api/billing";
import type { Role } from "@/types/api";
import type { BillingStatus, Payment, Plan } from "@/types/billing";

const STUDENT_ONLY: Role[] = ["STUDENT"];
const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const money = (amount: string, currency: string) =>
  `${Number(amount).toLocaleString("fr-FR")} ${currency === "MGA" ? "Ar" : currency}`;
const PAYMENT_LABEL: Record<Payment["status"], string> = {
  PENDING: "En attente",
  SUCCESS: "Payé",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  CANCELLED: "Annulé",
};

export default function BillingPage() {
  const allowed = useRequireRole(STUDENT_ONLY);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([myBilling(), listPlans(), myPayments()])
      .then(([s, p, h]) => {
        setStatus(s);
        setPlans(p);
        setPayments(h);
      })
      .catch((e: Error) => setError(e.message));
  }, [allowed]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!allowed || !status) {
    return error ? <p role="alert" className="text-red-700">{error}</p> : <p className="text-zinc-500">Chargement…</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Premium</h1>
      <p className="mb-5 text-sm text-zinc-500">Pratiquez l&apos;oral davantage, à votre rythme.</p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5" aria-label="Mon accès">
        {status.is_premium ? (
          <>
            <p className="font-semibold text-emerald-700">
              {status.is_trial ? "Essai gratuit en cours" : `${status.plan_name ?? "Premium"} actif`}
            </p>
            {status.expires_at && (
              <p className="text-sm text-zinc-600">
                {status.cancelled ? "Accès jusqu'au" : "Valable jusqu'au"} {date(status.expires_at)}
                {status.cancelled && " (renouvellement arrêté)"}
              </p>
            )}
            {!status.cancelled && !status.is_trial && (
              <button
                disabled={busy}
                onClick={() => run(async () => setStatus(await cancelSubscription()))}
                className="mt-3 text-sm text-zinc-600 underline hover:text-red-700"
              >
                Arrêter le renouvellement
              </button>
            )}
          </>
        ) : (
          <p className="font-semibold text-zinc-900">Formule gratuite</p>
        )}
        <p className="mt-2 text-sm text-zinc-600">
          Speaking Lab : {status.speaking_attempts_left_today} analyse(s) restante(s) aujourd&apos;hui sur{" "}
          {status.speaking_daily_limit}.
        </p>
      </section>

      {status.trial_available && (
        <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="font-semibold text-zinc-900">7 jours de Premium offerts</h2>
          <p className="mt-1 text-sm text-zinc-700">Sans paiement, une seule fois.</p>
          <Button className="mt-3" disabled={busy} onClick={() => run(async () => setStatus(await startTrial()))}>
            Démarrer l&apos;essai gratuit
          </Button>
        </section>
      )}

      {plans.map((plan) => (
        <section key={plan.id} className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">{plan.name}</h2>
          <p className="text-2xl font-bold text-indigo-700">
            {money(plan.price, plan.currency)}
            {plan.duration_days && <span className="text-sm font-normal text-zinc-500"> / {plan.duration_days} jours</span>}
          </p>
          {plan.description && <p className="mt-1 text-sm text-zinc-600">{plan.description}</p>}
          <ul className="mt-3 list-disc pl-5 text-sm text-zinc-700">
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Button
            className="mt-4"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const c = await checkout(plan.slug);
                window.location.assign(c.redirect_url);
              })
            }
          >
            {status.is_premium ? "Prolonger" : "S'abonner"}
          </Button>
        </section>
      ))}

      {payments.length > 0 && (
        <section aria-label="Historique des paiements">
          <h2 className="mb-2 font-semibold text-zinc-900">Historique</h2>
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 px-4 py-2">
                <span>{date(p.created_at)}</span>
                <span>{money(p.amount, p.currency)}</span>
                <span className="text-zinc-600">{PAYMENT_LABEL[p.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
