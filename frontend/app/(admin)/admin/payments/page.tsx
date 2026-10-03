"use client";

import { useEffect, useState } from "react";

import { useRequireRole } from "@/features/auth/useRequireRole";
import { getBillingSummary, listPayments } from "@/lib/api/admin";
import { formatDate } from "@/lib/time";
import type { Role } from "@/types/api";
import type { BillingSummary, PaymentPage, PaymentStatus } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];
const PAGE = 20;
const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "En attente",
  SUCCESS: "Payé",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  CANCELLED: "Annulé",
};
const money = (amount: string, currency: string) =>
  `${Number(amount).toLocaleString("fr-FR")} ${currency === "MGA" ? "Ar" : currency}`;

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const allowed = useRequireRole(ADMIN);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [page, setPage] = useState<PaymentPage | null>(null);
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getBillingSummary()
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    listPayments({ status, offset, limit: PAGE })
      .then(setPage)
      .catch((e: Error) => setError(e.message));
  }, [allowed, status, offset]);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!summary || !page) return <p className="text-zinc-500">Chargement…</p>;

  const conversion = summary.trials_started
    ? `${Math.round((summary.trials_converted / summary.trials_started) * 100)} %`
    : "—";

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Paiements</h1>

      <section className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Indicateurs">
        {summary.revenue.length === 0 && <Kpi label="Revenus" value="0" />}
        {summary.revenue.map((r) => (
          <div key={r.currency} className="col-span-2 rounded-2xl bg-indigo-600 p-4 text-white">
            <p className="text-xs uppercase tracking-wide text-indigo-200">Revenus ({r.payments} paiement(s))</p>
            <p className="text-3xl font-bold">{money(r.total, r.currency)}</p>
            <p className="text-sm text-indigo-100">dont {money(r.last_30d, r.currency)} sur 30 jours</p>
          </div>
        ))}
        <Kpi label="Abonnés payants" value={summary.active_paid} />
        <Kpi label="Essais en cours" value={summary.active_trials} />
        <Kpi label="Essais démarrés" value={summary.trials_started} />
        <Kpi label="Essai → achat" value={conversion} />
      </section>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-zinc-900">Historique ({page.total})</h2>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PaymentStatus | "");
            setOffset(0);
          }}
          aria-label="Filtrer par statut"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]} ({summary.payments_by_status[s]})
            </option>
          ))}
        </select>
      </div>

      <ul className="grid gap-2">
        {page.items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
            <span>
              <span className="font-medium text-zinc-900">{p.student_name}</span>
              <span className="block text-xs text-zinc-500">{p.student_email}</span>
            </span>
            <span className="font-semibold">{money(p.amount, p.currency)}</span>
            <span className="text-zinc-600">
              {STATUS_LABEL[p.status]} · {p.provider} · {formatDate(p.paid_at ?? p.created_at)}
            </span>
          </li>
        ))}
        {page.items.length === 0 && <li className="text-sm text-zinc-500">Aucun paiement.</li>}
      </ul>

      {page.total > PAGE && (
        <div className="mt-4 flex justify-between text-sm">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))} className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-50">
            Précédent
          </button>
          <button disabled={offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)} className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-50">
            Suivant
          </button>
        </div>
      )}
    </>
  );
}
