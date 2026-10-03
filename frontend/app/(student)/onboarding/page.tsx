"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/Notice";
import { useAuth } from "@/features/auth/AuthProvider";
import { noticeFor } from "@/features/auth/errors";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { saveOnboarding } from "@/lib/api/placement";
import { GOAL_LABEL } from "@/lib/labels";
import { useOnline } from "@/lib/useOnline";
import type { PrimaryGoal } from "@/types/placement";

const MINUTES = [5, 10, 20, 30];
const GOALS_LIST: PrimaryGoal[] = ["PREPARE_INTERVIEW", "IMPROVE_SPEAKING", "ENGLISH_FOR_WORK", "STUDY", "BUSINESS_ENGLISH"];
const GOALS_PAIR: PrimaryGoal[] = ["TRAVEL", "GENERAL_ENGLISH"];

export default function OnboardingPage() {
  const allowed = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const online = useOnline();
  const [goal, setGoal] = useState<PrimaryGoal | null>(null);
  const [minutes, setMinutes] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ title?: string; text: string } | null>(null);

  if (!allowed) return <p className="p-5 text-muted">Chargement…</p>;

  async function submit() {
    if (!goal) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(goal, minutes);
      router.replace("/placement");
    } catch (e) {
      const n = noticeFor(e);
      setError({ title: n.title === "Serveur injoignable." ? "Non enregistré." : n.title, text: n.title === "Serveur injoignable." ? "Réessayez une fois connecté." : n.text });
      setSaving(false);
    }
  }

  const option = (g: PrimaryGoal, compact = false) => {
    const active = goal === g;
    return (
      <button
        key={g}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => setGoal(g)}
        className={`flex min-h-12 items-center rounded-md text-left text-[15px] transition ${compact ? "gap-2.5 px-3" : "gap-3 px-3.5"} ${
          active ? "bg-ink-tint font-semibold text-ink shadow-[inset_0_0_0_2px_#172554]" : "bg-surface text-ink-2 shadow-[inset_0_0_0_1.5px_#cbd5e1] hover:bg-canvas"
        }`}
      >
        <span className={`h-5 w-5 flex-none rounded-full ${active ? "shadow-[inset_0_0_0_6px_#172554]" : "shadow-[inset_0_0_0_2px_#cbd5e1]"}`} />
        {GOAL_LABEL[g]}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-2 border-b border-line bg-surface px-5">
        <LogoMark height={24} />
        <span className="font-display text-[17px] font-bold text-ink">Lingora</span>
        <span className="ml-auto text-[13px] font-semibold text-muted">Étape 1 sur 2</span>
      </header>

      <div className="flex flex-1 flex-col gap-[22px] px-5 py-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">Bienvenue{user ? `, ${user.first_name}` : ""}</h1>
          <p className="text-base text-ink-2">Deux questions pour adapter votre parcours.</p>
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-sans text-base font-semibold tracking-normal text-ink">Quel est votre objectif principal ?</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Objectif principal">
            {GOALS_LIST.map((g) => option(g))}
            <div className="grid grid-cols-2 gap-2">{GOALS_PAIR.map((g) => option(g, true))}</div>
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="font-sans text-base font-semibold tracking-normal text-ink">Combien de temps par jour ?</h2>
          <div className="flex gap-1 rounded-md bg-slate-100 p-1" role="radiogroup" aria-label="Minutes par jour">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={`h-11 flex-1 rounded-[9px] text-[15px] font-semibold ${minutes === m ? "bg-surface text-ink shadow-[0_1px_2px_rgba(23,37,84,0.1)]" : "text-muted"}`}
              >
                {m} min
              </button>
            ))}
          </div>
        </section>

        {!online && <Notice tone="offline" title="Hors ligne.">Vos choix restent sélectionnés.</Notice>}
        {error && (
          <Notice tone="error" title={error.title}>
            {error.text}
          </Notice>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-surface px-5 pb-8 pt-4">
        <Button onClick={submit} disabled={!goal} loading={saving} className="w-full">
          {saving ? "Enregistrement…" : error ? "Réessayer" : "Continuer vers le test de niveau"}
          {!saving && !error && <ArrowRightIcon size={18} strokeWidth={2.2} />}
        </Button>
        {!goal && <p className="text-center text-[13px] text-muted">Choisissez un objectif pour continuer.</p>}
      </div>
    </div>
  );
}
