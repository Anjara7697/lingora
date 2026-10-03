"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { noticeFor } from "@/features/auth/errors";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { completePlacement, latestPlacementResult, savePlacementAnswer, startPlacement } from "@/lib/api/placement";
import { useOnline } from "@/lib/useOnline";
import type { PlacementResult, PlacementStart } from "@/types/placement";

const kicker = "text-xs font-semibold uppercase tracking-[0.08em] text-muted";

export default function PlacementPage() {
  const allowed = useRequireAuth();
  const router = useRouter();
  const online = useOnline();
  const [previous, setPrevious] = useState<PlacementResult | null | undefined>(undefined);
  const [test, setTest] = useState<PlacementStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title?: string; text: string } | null>(null);

  useEffect(() => {
    if (!allowed) return;
    latestPlacementResult()
      .then(setPrevious)
      .catch(() => setPrevious(null));
  }, [allowed]);

  if (!allowed || previous === undefined) {
    return (
      <div className="flex flex-col gap-4 p-5" aria-busy="true" aria-label="Chargement">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      const started = await startPlacement();
      setTest(started);
      setAnswers(started.answers);
      const firstOpen = started.questions.findIndex((q) => !(q.id in started.answers));
      setIndex(firstOpen === -1 ? started.questions.length - 1 : firstOpen); // reprise là où l'on s'est arrêté
    } catch (e) {
      const n = noticeFor(e);
      setError({ title: n.title, text: n.text });
    } finally {
      setBusy(false);
    }
  }

  // ── Introduction ───────────────────────────────────────────────────────────────────────
  if (!test) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center px-2">
          <Link href="/dashboard" className="flex h-11 items-center gap-1 px-2 text-[15px] font-semibold text-ink">
            <ChevronLeftIcon size={22} strokeWidth={2.2} /> Accueil
          </Link>
        </header>
        <div className="flex flex-1 flex-col gap-5 px-5 pb-8 pt-2">
          <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">Test de niveau</h1>
          <ul className="grid grid-cols-3 gap-2.5" aria-label="En bref">
            {[
              ["25", "questions"],
              ["~10", "minutes"],
              ["0", "pénalité"],
            ].map(([n, label]) => (
              <li key={label} className="flex flex-col items-center gap-0.5 rounded-lg bg-surface py-4 shadow-card">
                <span className="font-display text-[28px] font-bold leading-none text-ink">{n}</span>
                <span className="text-[13px] text-muted">{label}</span>
              </li>
            ))}
          </ul>
          <p className="text-base leading-[1.55] text-ink-2">
            Grammaire, vocabulaire et lecture. Répondez sans aide extérieure. Vous pouvez arrêter et reprendre plus tard.
          </p>
          <p className="text-[13px] leading-normal text-muted">Estimation pédagogique, pas une certification officielle.</p>
          {!online && <Notice tone="offline" title="Hors ligne.">Le test demande Internet.</Notice>}
          {error && (
            <Notice tone="error" title={error.title}>
              {error.text}
            </Notice>
          )}
          <div className="mt-auto flex flex-col gap-2.5">
            <Button onClick={begin} loading={busy} className="w-full">
              {busy ? "Chargement…" : previous ? "Refaire le test" : "Commencer le test"}
            </Button>
            {previous && (
              <Link href="/placement/result" className="flex h-11 items-center justify-center text-[15px] font-semibold text-brand-strong">
                Voir mon dernier résultat ({previous.overall_level})
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Question en cours ──────────────────────────────────────────────────────────────────
  const total = test.questions.length;
  const question = test.questions[index];
  const answered = Object.keys(answers).length;
  const allAnswered = answered === total;
  const isLast = index === total - 1;

  async function choose(optionIndex: number) {
    const before = answers[question.id];
    setAnswers((a) => ({ ...a, [question.id]: optionIndex }));
    setError(null);
    try {
      await savePlacementAnswer(test!.attempt_id, question.id, optionIndex);
    } catch {
      // Non enregistrée : on retire le choix pour ne pas faire croire qu'il est sauvegardé.
      setAnswers((a) => {
        const next = { ...a };
        if (before === undefined) delete next[question.id];
        else next[question.id] = before;
        return next;
      });
      setError({ title: "Réponse non enregistrée.", text: "Choisissez-la à nouveau une fois reconnecté." });
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await completePlacement(test!.attempt_id);
      router.replace("/placement/result");
    } catch (e) {
      const n = noticeFor(e);
      setError({ title: n.title, text: n.text });
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-3 border-b border-line bg-surface px-5 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <p className={kicker}>Test de niveau</p>
          <p className="text-sm font-semibold">
            <span className="font-display text-lg text-ink">{index + 1}</span> <span className="text-muted">/ {total}</span>
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Questions répondues"
          aria-valuenow={answered}
          aria-valuemin={0}
          aria-valuemax={total}
          className="h-2 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <p className="text-[13px] text-muted">
          {answered} réponse{answered > 1 ? "s" : ""} enregistrée{answered > 1 ? "s" : ""}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-[22px] px-5 py-7">
        <h1 className="whitespace-pre-line font-display text-[22px] font-bold leading-[1.35] tracking-[-0.01em] text-ink">{question.config.question}</h1>
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Réponses">
          {question.config.options.map((opt, i) => {
            const active = answers[question.id] === i;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(i)}
                className={`flex min-h-[52px] items-center gap-3 rounded-md px-3.5 text-left text-base transition ${
                  active ? "bg-ink-tint font-semibold text-ink shadow-[inset_0_0_0_2px_#172554]" : "bg-surface text-ink-2 shadow-[inset_0_0_0_1.5px_#cbd5e1] hover:bg-canvas"
                }`}
              >
                <span className={`h-5 w-5 flex-none rounded-full ${active ? "shadow-[inset_0_0_0_6px_#172554]" : "shadow-[inset_0_0_0_2px_#cbd5e1]"}`} />
                {opt}
              </button>
            );
          })}
        </div>

        {question.id in answers && (
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong">
            <CheckIcon size={16} strokeWidth={2.4} /> Réponse enregistrée
          </p>
        )}
        {!online && (
          <Notice tone="offline" title="Hors ligne.">
            Le test demande Internet ; vos réponses déjà enregistrées sont gardées.
          </Notice>
        )}
        {error && (
          <Notice tone="error" title={error.title}>
            {error.text}
          </Notice>
        )}
        {isLast && !allAnswered && (
          <Notice tone="info">
            {total - answered} question{total - answered > 1 ? "s" : ""} sans réponse. Utilisez « Précédent » pour les compléter.
          </Notice>
        )}
      </div>

      <div className="sticky bottom-0 grid grid-cols-[1fr_1.6fr] gap-2.5 border-t border-line bg-surface px-5 pb-8 pt-4">
        <Button onClick={() => setIndex(index - 1)} disabled={index === 0} variant="secondary">
          Précédent
        </Button>
        {!isLast ? (
          <Button onClick={() => setIndex(index + 1)} disabled={!(question.id in answers)}>
            Suivant <ChevronRightIcon size={18} strokeWidth={2.4} />
          </Button>
        ) : (
          <Button onClick={finish} disabled={!allAnswered} loading={busy}>
            {busy ? "Calcul du résultat…" : "Terminer le test"}
          </Button>
        )}
      </div>
    </div>
  );
}
