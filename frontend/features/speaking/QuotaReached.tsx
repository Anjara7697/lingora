import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";

/** Quota du jour atteint : ton invitant (jamais rouge) et une porte de sortie vers Premium. */
export function QuotaReached({ total, premium, trialAvailable }: { total: number | null; premium: boolean; trialAvailable: boolean }) {
  return (
    <section role="status" className="flex flex-col items-center gap-3 rounded-lg bg-surface p-6 text-center shadow-card">
      {total !== null && total <= 6 && (
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="h-2 w-7 rounded-full bg-line" />
          ))}
        </div>
      )}
      <h2 className="font-display text-xl font-bold text-ink">{total !== null ? `${total} analyses sur ${total} utilisées` : "Analyses du jour utilisées"}</h2>
      <p className="text-[15px] leading-[1.55] text-ink-2">
        {premium ? "Revenez demain pour de nouvelles analyses." : "Revenez demain, ou passez Premium pour continuer aujourd'hui."}
      </p>
      {!premium && (
        <Link href="/billing" className={buttonClass("brand", "self-stretch")}>
          {trialAvailable ? "Essayer Premium 7 jours" : "Découvrir Premium"}
        </Link>
      )}
      <Link href="/dashboard" className="flex h-11 items-center text-[15px] font-semibold text-brand-strong">
        Revenir au tableau de bord
      </Link>
    </section>
  );
}
