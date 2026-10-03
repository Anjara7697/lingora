"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { ChevronLeftIcon, InfoIcon, LockIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/States";
import { Notice } from "@/components/ui/Notice";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { demoConfirm, listPlans } from "@/lib/api/billing";
import { ApiError } from "@/lib/api/client";
import type { Role } from "@/types/api";
import type { Plan } from "@/types/billing";

const STUDENT_ONLY: Role[] = ["STUDENT"];

function DemoCheckout() {
  const allowed = useRequireRole(STUDENT_ONLY);
  const router = useRouter();
  const paymentId = useSearchParams().get("payment");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<"ok" | "ko" | null>(null);
  const [error, setError] = useState<{ title?: string; text: string } | null>(null);

  useEffect(() => {
    listPlans()
      .then((p) => setPlan(p[0] ?? null))
      .catch(() => {});
  }, []);

  async function answer(success: boolean) {
    if (!paymentId) return;
    setBusy(success ? "ok" : "ko");
    setError(null);
    try {
      await demoConfirm(paymentId, success);
      router.replace(`/billing?paiement=${success ? "succes" : "echec"}`);
    } catch (e) {
      const network = e instanceof ApiError && e.status === 0;
      setError(network ? { title: "Confirmation impossible.", text: "Serveur injoignable, rien n'a été prélevé." } : { text: (e as Error).message });
      setBusy(null);
    }
  }

  if (!allowed) return <p className="p-5 text-muted">Chargement…</p>;
  if (!paymentId) {
    return (
      <div className="px-5 pt-6">
        <EmptyState
          icon={<LockIcon size={28} />}
          title="Paiement introuvable"
          action={
            <Link href="/billing" className={buttonClass("primary")}>
              Retour à Premium
            </Link>
          }
        >
          Ce lien de paiement est incomplet. Relancez l&apos;abonnement depuis la page Premium.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[52px] items-center px-2">
        <Link href="/billing" className="flex h-11 items-center gap-1 px-2 text-[15px] font-semibold text-ink">
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> Premium
        </Link>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-5 pt-2">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Paiement</h1>
        {plan && (
          <section className="flex flex-col gap-2.5 rounded-lg bg-surface p-[18px] shadow-card">
            <p className="flex justify-between text-[15px]">
              <span>{plan.name}</span>
              <b className="text-ink">{Number(plan.price).toLocaleString("fr-FR")} Ar</b>
            </p>
            {plan.duration_days && (
              <p className="flex justify-between text-sm text-muted">
                <span>Durée</span>
                <span>{plan.duration_days} jours</span>
              </p>
            )}
          </section>
        )}
        <section className="flex flex-col gap-1.5 rounded-lg bg-ink-tint p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <InfoIcon size={20} strokeWidth={2} /> Mode démonstration
          </p>
          <p className="text-sm leading-[1.55] text-ink-2">
            Aucun argent réel. Cette page simule le retour d&apos;un fournisseur de paiement (Mobile Money, carte…) et sera remplacée par le vrai paiement.
          </p>
        </section>
        {error && (
          <Notice tone="error" title={error.title}>
            {error.text}
          </Notice>
        )}
      </div>
      <div className="sticky bottom-0 flex flex-col gap-2.5 border-t border-line bg-surface px-5 pb-8 pt-4">
        <Button loading={busy === "ok"} disabled={busy === "ko"} onClick={() => answer(true)}>
          Simuler un paiement réussi
        </Button>
        <Button variant="secondary" loading={busy === "ko"} disabled={busy === "ok"} onClick={() => answer(false)}>
          Simuler un échec
        </Button>
      </div>
    </div>
  );
}

export default function DemoCheckoutPage() {
  return (
    <Suspense fallback={<p className="p-5 text-muted">Chargement…</p>}>
      <DemoCheckout />
    </Suspense>
  );
}
