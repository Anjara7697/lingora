"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { demoConfirm } from "@/lib/api/billing";
import type { Role } from "@/types/api";

const STUDENT_ONLY: Role[] = ["STUDENT"];

function DemoCheckout() {
  const allowed = useRequireRole(STUDENT_ONLY);
  const router = useRouter();
  const paymentId = useSearchParams().get("payment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(success: boolean) {
    if (!paymentId) return;
    setBusy(true);
    setError(null);
    try {
      await demoConfirm(paymentId, success);
      router.replace("/billing");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (!paymentId) return <p role="alert" className="text-red-700">Paiement introuvable.</p>;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h1 className="text-xl font-bold text-zinc-900">Paiement de démonstration</h1>
      <p className="mt-2 text-sm text-zinc-700">
        Aucun argent réel n&apos;est utilisé. Cette page simule le retour d&apos;un fournisseur de paiement (Mobile Money,
        carte…).
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => answer(true)}>
          Simuler un paiement réussi
        </Button>
        <Button disabled={busy} onClick={() => answer(false)} variant="secondary">
          Simuler un échec
        </Button>
      </div>
    </section>
  );
}

export default function DemoCheckoutPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
      <DemoCheckout />
    </Suspense>
  );
}
