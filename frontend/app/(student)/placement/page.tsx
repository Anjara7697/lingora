"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { completePlacement, latestPlacementResult, savePlacementAnswer, startPlacement } from "@/lib/api/placement";
import type { PlacementResult, PlacementStart } from "@/types/placement";

export default function PlacementPage() {
  const allowed = useRequireAuth();
  const router = useRouter();
  const [previous, setPrevious] = useState<PlacementResult | null | undefined>(undefined);
  const [test, setTest] = useState<PlacementStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    latestPlacementResult()
      .then(setPrevious)
      .catch(() => setPrevious(null));
  }, [allowed]);

  if (!allowed || previous === undefined) return <p className="text-zinc-500">Chargement…</p>;

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
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!test) {
    return (
      <>
        <h1 className="text-2xl font-bold text-zinc-900">Test de niveau</h1>
        <p className="mt-2 text-zinc-600">
          25 questions (grammaire, vocabulaire, lecture) pour estimer votre niveau d&apos;anglais, environ 10 minutes.
          Répondez sans aide extérieure : il n&apos;y a pas de pénalité.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Ce test donne une estimation pédagogique ; ce n&apos;est pas une certification officielle.
        </p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={begin} disabled={busy}>
            {busy ? "Chargement…" : previous ? "Refaire le test" : "Commencer le test"}
          </Button>
          {previous && (
            <Link href="/placement/result" className="text-sm font-medium text-indigo-600 hover:underline">
              Voir mon dernier résultat ({previous.overall_level})
            </Link>
          )}
        </div>
      </>
    );
  }

  const total = test.questions.length;
  const question = test.questions[index];
  const answered = Object.keys(answers).length;
  const allAnswered = answered === total;

  async function choose(optionIndex: number) {
    setAnswers((a) => ({ ...a, [question.id]: optionIndex }));
    setError(null);
    try {
      await savePlacementAnswer(test!.attempt_id, question.id, optionIndex);
    } catch (e) {
      setError(`Réponse non enregistrée : ${(e as Error).message}`);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await completePlacement(test!.attempt_id);
      router.replace("/placement/result");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-1 text-sm text-zinc-500">
        Question {index + 1} sur {total}
      </p>
      <ProgressBar value={(answered / total) * 100} />

      <h2 className="mb-4 mt-5 whitespace-pre-line text-lg font-semibold text-zinc-900">{question.config.question}</h2>
      <div className="grid gap-2" role="radiogroup" aria-label="Réponses">
        {question.config.options.map((opt, i) => (
          <button
            key={opt}
            role="radio"
            aria-checked={answers[question.id] === i}
            onClick={() => choose(i)}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              answers[question.id] === i ? "border-indigo-600 bg-indigo-50" : "border-zinc-300 bg-white hover:bg-zinc-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex justify-between gap-3">
        <Button onClick={() => setIndex(index - 1)} disabled={index === 0} variant="secondary">
          Précédent
        </Button>
        {index < total - 1 ? (
          <Button onClick={() => setIndex(index + 1)} disabled={!(question.id in answers)}>
            Suivant
          </Button>
        ) : (
          <Button onClick={finish} disabled={!allAnswered || busy}>
            {busy ? "Calcul…" : "Terminer le test"}
          </Button>
        )}
      </div>
      {index === total - 1 && !allAnswered && (
        <p className="mt-3 text-sm text-amber-700">
          Il reste {total - answered} question(s) sans réponse : utilisez « Précédent » pour les compléter.
        </p>
      )}
    </>
  );
}
