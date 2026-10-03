"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { CardIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ListSkeleton, Pager, Tag, money } from "@/features/admin/ui";
import { getBillingSummary, listPayments } from "@/lib/api/admin";
import { formatDate } from "@/lib/time";
import type { Role } from "@/types/api";
import type { BillingSummary, PaymentPage, PaymentStatus } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];
const PAGE = 20;
const STATUS_LABEL: Record<PaymentStatus, string> = {
  SUCCESS: "Payé",
  PENDING: "En attente",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  CANCELLED: "Annulé",
};
const ORDER: PaymentStatus[] = ["SUCCESS", "PENDING", "FAILED", "REFUNDED", "CANCELLED"];
const PROVIDER: Record<string, string> = { demo: "Démo", mvola: "MVola", orange_money: "Orange Money", airtel_money: "Airtel Money", stripe: "Carte" };

function StatusTag({ s }: { s: PaymentStatus }) {
  const tone = { SUCCESS: "brand", PENDING: "outline", FAILED: "solid", REFUNDED: "tint", CANCELLED: "muted" }[s] as "brand" | "outline" | "solid" | "tint" | "muted";
  return <Tag tone={tone}>{STATUS_LABEL[s]}</Tag>;
}

export default function AdminPaymentsPage() {
  const allowed = useRequireRole(ADMIN);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [page, setPage] = useState<PaymentPage | null>(null);
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    getBillingSummary()
      .then((r) => {
        setSummary(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [allowed, attempt]);

  useEffect(() => {
    if (!allowed) return;
    listPayments({ status, offset, limit: PAGE })
      .then((r) => {
        setPage(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [allowed, status, offset, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (!allowed) return null;
  if (failed && (!summary || !page)) return <ErrorState title="Paiements indisponibles" onRetry={retry} />;

  const conversion = summary && summary.trials_started ? `${Math.round((summary.trials_converted / summary.trials_started) * 100)} %` : "—";
  const total = summary ? ORDER.reduce((n, s) => n + summary.payments_by_status[s], 0) : 0;
  const rev = summary?.revenue[0];

  return (
    <>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Paiements</h1>

      {!summary ? (
        <div className="mt-5 grid grid-cols-2 gap-3" aria-busy="true">
          <Skeleton className="col-span-2 h-28" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Indicateurs">
          <div className="col-span-2 rounded-lg bg-ink p-4 text-white">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-white/70">Revenus · {rev?.payments ?? 0} paiement{(rev?.payments ?? 0) > 1 ? "s" : ""}</p>
            <p className="mt-1 font-display text-[32px] font-bold">{rev ? money(rev.total, rev.currency) : "0 Ar"}</p>
            {rev && <p className="text-sm text-white/80">dont {money(rev.last_30d, rev.currency)} sur 30 jours</p>}
          </div>
          <Kpi label="Abonnés payants" value={summary.active_paid} />
          <Kpi label="Essais en cours" value={summary.active_trials} />
          <Kpi label="Essais démarrés" value={summary.trials_started} />
          <Kpi label="Essai → achat" value={conversion} />
        </section>
      )}

      {summary && (
        <>
          <h2 className="mb-3 mt-6 font-display text-lg font-bold text-ink">Historique · {total}</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
            <Chip active={status === ""} onClick={() => { setStatus(""); setOffset(0); }}>
              Tous · {total}
            </Chip>
            {ORDER.map((s) => (
              <Chip key={s} active={status === s} onClick={() => { setStatus(status === s ? "" : s); setOffset(0); }}>
                {STATUS_LABEL[s]} · {summary.payments_by_status[s]}
              </Chip>
            ))}
          </div>
        </>
      )}

      <div className="mt-4">
        {!page ? (
          <ListSkeleton />
        ) : page.items.length === 0 ? (
          <EmptyState icon={<CardIcon size={28} />} title="Aucun paiement pour l'instant">
            Les abonnements apparaîtront ici dès le premier achat.
          </EmptyState>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg bg-surface shadow-card md:block">
              <table className="w-full text-left text-[15px]">
                <thead className="text-[12px] uppercase tracking-wide text-muted">
                  <tr className="h-10">
                    <th className="pl-4 font-semibold">Élève</th>
                    <th className="font-semibold">Montant</th>
                    <th className="font-semibold">Statut</th>
                    <th className="font-semibold">Moyen</th>
                    <th className="pr-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((p) => (
                    <tr key={p.id} className="h-16 border-t border-line">
                      <td className="pl-4">
                        <span className="block font-semibold text-ink">{p.student_name}</span>
                        <span className="text-[13px] text-muted">{p.student_email}</span>
                      </td>
                      <td className="font-semibold tabular-nums text-ink">{money(p.amount, p.currency)}</td>
                      <td>
                        <StatusTag s={p.status} />
                      </td>
                      <td className="text-ink-2">{PROVIDER[p.provider.toLowerCase()] ?? p.provider}</td>
                      <td className="pr-4 text-ink-2">{formatDate(p.paid_at ?? p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-2.5 md:hidden">
              {page.items.map((p) => (
                <li key={p.id} className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 shadow-card">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{p.student_name}</span>
                    <StatusTag s={p.status} />
                  </span>
                  <span className="text-[13px] text-muted">{p.student_email}</span>
                  <span className="flex justify-between text-sm text-ink-2">
                    <b className="font-semibold tabular-nums text-ink">{money(p.amount, p.currency)}</b>
                    <span>
                      {PROVIDER[p.provider.toLowerCase()] ?? p.provider} · {formatDate(p.paid_at ?? p.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <Pager offset={offset} page={PAGE} total={page.total} onChange={setOffset} />
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface p-3.5 shadow-card">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="font-display text-[26px] font-bold text-ink">{value}</p>
    </div>
  );
}
