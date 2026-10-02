"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { GOAL_LABEL } from "@/lib/labels";
import { saveOnboarding } from "@/lib/api/placement";
import type { PrimaryGoal } from "@/types/placement";

const MINUTES = [5, 10, 20, 30];

export default function OnboardingPage() {
  const allowed = useRequireAuth();
  const router = useRouter();
  const [goal, setGoal] = useState<PrimaryGoal | null>(null);
  const [minutes, setMinutes] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;

  async function submit() {
    if (!goal) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(goal, minutes);
      router.replace("/placement");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const choice = (active: boolean) =>
    `rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
      active ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-zinc-300 bg-white hover:bg-zinc-50"
    }`;

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Bienvenue sur Lingora 👋</h1>
      <p className="mb-6 text-zinc-600">Deux questions pour adapter votre parcours.</p>

      <h2 className="mb-2 font-semibold text-zinc-900">Quel est votre objectif principal ?</h2>
      <div className="mb-6 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Objectif principal">
        {(Object.keys(GOAL_LABEL) as PrimaryGoal[]).map((g) => (
          <button key={g} role="radio" aria-checked={goal === g} onClick={() => setGoal(g)} className={choice(goal === g)}>
            {GOAL_LABEL[g]}
          </button>
        ))}
      </div>

      <h2 className="mb-2 font-semibold text-zinc-900">Combien de temps par jour pouvez-vous pratiquer ?</h2>
      <div className="mb-6 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Minutes par jour">
        {MINUTES.map((m) => (
          <button key={m} role="radio" aria-checked={minutes === m} onClick={() => setMinutes(m)} className={`${choice(minutes === m)} text-center`}>
            {m} min
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button onClick={submit} disabled={!goal || saving} className="w-full">
        {saving ? "Enregistrement…" : "Continuer vers le test de niveau"}
      </Button>
    </>
  );
}
