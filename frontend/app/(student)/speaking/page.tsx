"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Notice } from "@/components/ui/Notice";
import { ChevronRightIcon } from "@/components/ui/icons";
import { myBilling } from "@/lib/api/billing";
import { listScenarios } from "@/lib/api/speaking";
import type { BillingStatus } from "@/types/billing";
import type { Scenario } from "@/types/speaking";

const LEVEL: Record<string, string> = {
  BEGINNER: "Débutant",
  ELEMENTARY: "Élémentaire",
  INTERMEDIATE: "Intermédiaire",
  UPPER_INTERMEDIATE: "Intermédiaire sup.",
  ADVANCED: "Avancé",
};

const pill = "inline-flex h-[26px] items-center rounded-full bg-ink-tint px-2.5 text-xs font-semibold text-ink";

export default function SpeakingPage() {
  const [items, setItems] = useState<Scenario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<BillingStatus | null>(null);

  useEffect(() => {
    listScenarios()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
    myBilling()
      .then(setQuota)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Speaking Lab</h1>
        <p className="text-[15px] leading-normal text-muted">
          Choisissez une situation, répondez à voix haute en anglais, puis recevez un feedback. Vous pouvez recommencer autant de fois que
          vous voulez.
        </p>
      </header>

      {quota && (
        <p className="inline-flex h-9 items-center self-start rounded-full bg-surface px-3.5 text-[13px] text-ink-2 shadow-[inset_0_0_0_1px_#e2e8f0]">
          {quota.speaking_attempts_left_today} analyse(s) restante(s) aujourd&apos;hui
        </p>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {!items && !error && <p className="text-muted">Chargement…</p>}

      <ul className="grid gap-3 lg:grid-cols-2">
        {items?.map((s) => (
          <li key={s.id}>
            <Link href={`/speaking/${s.slug}`} className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-card">
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex gap-2">
                  <span className={pill}>{LEVEL[s.difficulty] ?? s.difficulty}</span>
                  {s.estimated_minutes ? <span className={pill}>{s.estimated_minutes} min</span> : null}
                </span>
                <span className="text-base font-semibold text-ink">{s.title}</span>
                {s.description && <span className="text-sm leading-snug text-muted">{s.description}</span>}
              </span>
              <ChevronRightIcon size={18} strokeWidth={2.4} className="flex-none text-brand-strong" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
