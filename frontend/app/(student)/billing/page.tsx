"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CheckIcon, ClockIcon, CrossIcon } from "@/components/ui/icons";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { cancelSubscription, checkout, listPlans, myBilling, myPayments, startTrial } from "@/lib/api/billing";
import { useOnline } from "@/lib/useOnline";
import type { Role } from "@/types/api";
import type { BillingStatus, Payment, Plan } from "@/types/billing";

const STUDENT_ONLY: Role[] = ["STUDENT"];
const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const money = (amount: string, currency: string) => `${Number(amount).toLocaleString("fr-FR")} ${currency === "MGA" ? "Ar" : currency}`;
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

const card = "rounded-lg bg-surface shadow-card";
const pill = "inline-flex h-[26px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold";
const PAYMENT: Record<Payment["status"], { label: string; cls: string; icon?: React.ReactNode }> = {
  SUCCESS: { label: "Payé", cls: "bg-brand-strong text-white", icon: <CheckIcon size={13} strokeWidth={3} /> },
  FAILED: { label: "Échoué", cls: "bg-slate-100 text-ink-2", icon: <CrossIcon size={12} strokeWidth={3} /> },
  PENDING: { label: "En attente", cls: "bg-ink-tint text-ink", icon: <ClockIcon size={13} strokeWidth={2.4} /> },
  REFUNDED: { label: "Remboursé", cls: "bg-slate-100 text-ink-2" },
  CANCELLED: { label: "Annulé", cls: "bg-slate-100 text-ink-2" },
};

/** Quota du jour : un segment par analyse (utilisées en gris, restantes en turquoise) quand elles sont peu nombreuses. */
function Quota({ left, total, dark = false }: { left: number; total: number; dark?: boolean }) {
  const track = dark ? "bg-white/15" : "bg-line";
  return (
    <div className="flex flex-col gap-2">
      <p className="flex justify-between text-sm">
        <span className={dark ? "text-slate-300" : "text-ink-2"}>Analyses Speaking aujourd&apos;hui</span>
        <b className={dark ? "text-white" : "text-ink"}>
          {left} / {total}
          {!dark && " restante" + (left > 1 ? "s" : "")}
        </b>
      </p>
      {total <= 6 ? (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2 rounded-full ${i >= total - left ? "bg-brand" : track}`} />
          ))}
        </div>
      ) : (
        <div className={`h-2 overflow-hidden rounded-full ${track}`} aria-hidden="true">
          <div className="h-full rounded-full bg-brand" style={{ width: `${(left / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex flex-col gap-3.5 overflow-hidden rounded-[20px] bg-ink p-5 text-white">
      <span aria-hidden className="absolute -right-12 -top-14 h-[180px] w-[180px] rounded-full bg-brand opacity-[0.18]" />
      <div className="relative flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function BillingContent() {
  const allowed = useRequireRole(STUDENT_ONLY);
  const online = useOnline();
  const outcome = useSearchParams().get("paiement");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([myBilling(), listPlans(), myPayments()])
        .then(([s, p, h]) => {
          setStatus(s);
          setPlans(p);
          setPayments(h);
        })
        .catch(() => setFailed(true)),
    [],
  );

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <header className="flex flex-col gap-1">
      <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Premium</h1>
      <p className="text-[15px] text-muted">Pratiquez l&apos;oral davantage, à votre rythme.</p>
    </header>
  );

  if (failed) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {!online && <Notice tone="offline" title="Hors ligne.">Les paiements demandent Internet.</Notice>}
        <ErrorState
          title="Offres indisponibles"
          offline={!online}
          onRetry={() => {
            setFailed(false);
            void load();
          }}
        >
          Votre accès actuel n&apos;est pas affecté.
        </ErrorState>
      </div>
    );
  }

  if (!allowed || !status || !payments) {
    return (
      <div className="flex flex-col gap-3.5" aria-busy="true" aria-label="Chargement">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[88px] w-full rounded-lg" />
        <Skeleton className="h-[170px] w-full rounded-[20px]" />
        <Skeleton className="h-[190px] w-full rounded-lg" />
      </div>
    );
  }

  const plan = plans[0];
  const subscribe = () =>
    run(async () => {
      const c = await checkout(plan.slug);
      window.location.assign(c.redirect_url);
    });

  return (
    <div className="flex flex-col gap-4">
      {header}

      {outcome === "succes" && status.is_premium && (
        <Notice tone="success" title="Bienvenue dans Premium.">
          {status.speaking_daily_limit} analyses par jour{status.expires_at ? ` jusqu'au ${date(status.expires_at)}` : ""}.
        </Notice>
      )}
      {outcome === "echec" && (
        <Notice tone="error" title="Paiement non abouti.">
          Aucun montant n&apos;a été prélevé. Vous pouvez réessayer.
        </Notice>
      )}
      {problem && <Notice tone="error">{problem}</Notice>}

      {status.is_premium ? (
        <>
          <Hero>
            <span className="inline-flex h-7 w-fit items-center gap-1.5 rounded-full bg-brand px-2.5 text-[13px] font-semibold text-ink">
              {status.is_trial ? <ClockIcon size={14} strokeWidth={2.4} /> : <CheckIcon size={14} strokeWidth={3} />}
              {status.is_trial ? "Essai gratuit" : "Actif"}
            </span>
            {status.is_trial && status.expires_at ? (
              <>
                <p className="font-display text-[22px] font-bold">Encore {daysLeft(status.expires_at)} jour{daysLeft(status.expires_at) > 1 ? "s" : ""}</p>
                <p className="text-[15px] text-slate-300">Jusqu&apos;au {date(status.expires_at)}. Ensuite, retour à la formule gratuite.</p>
              </>
            ) : (
              <>
                <p className="font-display text-[22px] font-bold">{status.plan_name ?? "Premium"}</p>
                {status.expires_at && (
                  <p className="text-[15px] text-slate-300">
                    {status.cancelled ? "Accès jusqu'au" : "Valable jusqu'au"} <b className="text-white">{date(status.expires_at)}</b>
                  </p>
                )}
              </>
            )}
            <Quota left={status.speaking_attempts_left_today} total={status.speaking_daily_limit} dark />
          </Hero>

          {status.cancelled && (
            <Notice tone="info" icon={<ClockIcon size={20} strokeWidth={2} />}>
              Le renouvellement est arrêté ; vous gardez Premium jusqu&apos;à la fin de la période.
            </Notice>
          )}

          {plan &&
            (status.is_trial ? (
              <Button onClick={subscribe} loading={busy}>
                S&apos;abonner pour continuer
              </Button>
            ) : (
              <div className={`grid gap-2.5 ${status.cancelled ? "" : "grid-cols-2"}`}>
                <Button onClick={subscribe} loading={busy}>
                  Prolonger
                </Button>
                {!status.cancelled && (
                  <Button variant="secondary" onClick={() => setConfirmCancel(true)} className="px-2 text-[15px] leading-tight text-ink-2">
                    Arrêter le renouvellement
                  </Button>
                )}
              </div>
            ))}
        </>
      ) : (
        <>
          <section className={`${card} flex flex-col gap-3 p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-ink">Formule gratuite</p>
              <span className={`${pill} bg-slate-100 text-ink-2`}>Actuelle</span>
            </div>
            <Quota left={status.speaking_attempts_left_today} total={status.speaking_daily_limit} />
          </section>

          {status.trial_available && (
            <Hero>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Offert · une seule fois</p>
              <p className="font-display text-2xl font-bold leading-tight">
                7 jours de Premium
                <br />
                sans payer
              </p>
              <p className="text-sm text-slate-300">Aucun moyen de paiement demandé.</p>
              <Button variant="brand" loading={busy} onClick={() => run(async () => setStatus(await startTrial()))}>
                Démarrer l&apos;essai gratuit
              </Button>
            </Hero>
          )}

          {plan && (
            <section className={`${card} flex flex-col gap-3.5 p-5`}>
              <h2 className="font-display text-lg font-bold text-ink">{plan.name}</h2>
              <p className="flex items-baseline gap-1.5">
                <span className="font-display text-[32px] font-bold tracking-[-0.02em] text-ink">{money(plan.price, plan.currency)}</span>
                {plan.duration_days && <span className="text-sm text-muted">/ {plan.duration_days} jours</span>}
              </p>
              <ul className="flex flex-col gap-2.5 text-[15px] text-ink-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckIcon size={20} strokeWidth={2.4} className="mt-px flex-none text-brand-strong" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={subscribe} loading={busy}>
                S&apos;abonner
              </Button>
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-2.5" aria-label="Historique des paiements">
        <h2 className="font-display text-lg font-bold text-ink">Historique</h2>
        {payments.length === 0 ? (
          <p className="text-[15px] leading-normal text-muted">Aucun paiement pour l&apos;instant. Vos reçus apparaîtront ici.</p>
        ) : (
          <ul className={`${card} divide-y divide-line`}>
            {payments.map((p) => {
              const s = PAYMENT[p.status];
              return (
                <li key={p.id} className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-ink">{money(p.amount, p.currency)}</span>
                    <span className="text-[13px] text-muted">{date(p.paid_at ?? p.created_at)}</span>
                  </span>
                  <span className={`${pill} ${s.cls}`}>
                    {s.icon}
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmSheet
        open={confirmCancel}
        title="Arrêter le renouvellement ?"
        confirmLabel="Arrêter le renouvellement"
        cancelLabel="Garder mon abonnement"
        busy={busy}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() =>
          run(async () => {
            setStatus(await cancelSubscription());
            setConfirmCancel(false);
          })
        }
      >
        Vous gardez Premium{status.expires_at ? ` jusqu'au ${date(status.expires_at)}` : " jusqu'à la fin de la période"}. Aucun paiement ne sera demandé ensuite.
      </ConfirmSheet>
    </div>
  );
}

export default function BillingPage() {
  // useSearchParams exige une frontière Suspense pour la génération statique.
  return (
    <Suspense fallback={<Skeleton className="h-8 w-40" />}>
      <BillingContent />
    </Suspense>
  );
}
