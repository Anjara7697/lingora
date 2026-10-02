"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Field";
import { submitActivity } from "@/lib/api/learning";
import type { ActivityItem, SubmitResult } from "@/types/learning";

interface Props {
  item: ActivityItem;
  onResult: (activityId: string, result: SubmitResult) => void;
}

type Answer = unknown;

function formatCorrect(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, string>)
      .map(([k, v]) => `${k} → ${v}`)
      .join(" · ");
  }
  if (value === true) return "Vrai";
  if (value === false) return "Faux";
  return String(value);
}

/** La réponse est-elle suffisamment complète pour être envoyée ? */
function isComplete(item: ActivityItem, answer: Answer): boolean {
  const { type } = item.activity;
  if (type === "ORDERING") {
    return Array.isArray(answer) && answer.length === (item.config.items?.length ?? -1);
  }
  if (type === "MATCHING") {
    return !!answer && Object.keys(answer as object).length === (item.config.lefts?.length ?? -1);
  }
  if (typeof answer === "string") return answer.trim() !== "";
  return answer !== null && answer !== undefined;
}

export function ActivityCard({ item, onResult }: Props) {
  const { activity, config, graded, mastered } = item;
  const [answer, setAnswer] = useState<Answer>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const isPractice = activity.type === "SPEAKING";
  const canSubmit = isPractice || isComplete(item, answer);

  async function send() {
    setSubmitting(true);
    setError(null);
    try {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const res = await submitActivity(activity.id, isPractice ? null : answer, seconds);
      setResult(res);
      onResult(activity.id, res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAnswer(null);
    setResult(null);
    setStartedAt(Date.now());
  }

  const locked = result !== null;
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900">{activity.title}</h3>
          {activity.instructions && <p className="text-xs text-zinc-500">{activity.instructions}</p>}
        </div>
        {(mastered || result?.is_correct || (result && !result.graded)) && (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Réussie ✓
          </span>
        )}
      </header>

      {(config.question || config.prompt) && (
        <p className="mb-3 text-base font-medium text-zinc-800">{config.question ?? config.prompt}</p>
      )}

      <Body item={item} answer={answer} setAnswer={setAnswer} locked={locked} />

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            !result.graded
              ? "bg-indigo-50 text-indigo-800"
              : result.is_correct
                ? "bg-green-50 text-green-800"
                : "bg-amber-50 text-amber-900"
          }`}
        >
          {!result.graded ? (
            <p>Enregistré ✓ — bien joué, continuez à pratiquer !</p>
          ) : result.is_correct ? (
            <p className="font-medium">✅ Bonne réponse !</p>
          ) : (
            <>
              <p className="font-medium">Pas tout à fait.</p>
              <p>Réponse attendue : {formatCorrect(result.correct_answer)}</p>
            </>
          )}
          {result.explanation && <p className="mt-1 text-xs opacity-80">{result.explanation}</p>}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!locked && (
          <Button onClick={send} disabled={!canSubmit || submitting}>
            {submitting ? "Envoi…" : isPractice ? "J'ai pratiqué à voix haute" : graded ? "Valider" : "Envoyer"}
          </Button>
        )}
        {locked && result.graded && !result.is_correct && (
          <Button onClick={retry} className="bg-zinc-700 hover:bg-zinc-800">
            Réessayer
          </Button>
        )}
      </div>
    </article>
  );
}

function Body({
  item,
  answer,
  setAnswer,
  locked,
}: {
  item: ActivityItem;
  answer: Answer;
  setAnswer: (a: Answer) => void;
  locked: boolean;
}) {
  const { type } = item.activity;
  const { config } = item;
  const optionCls = (active: boolean) =>
    `w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
      active ? "border-indigo-600 bg-indigo-50" : "border-zinc-300 hover:bg-zinc-50"
    } disabled:cursor-not-allowed disabled:opacity-70`;

  if (type === "MCQ" || type === "LISTENING" || type === "READING") {
    return (
      <div className="grid gap-2" role="radiogroup">
        {config.options?.map((opt, i) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={answer === i}
            disabled={locked}
            onClick={() => setAnswer(i)}
            className={optionCls(answer === i)}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (type === "TRUE_FALSE") {
    return (
      <div className="flex gap-2" role="radiogroup">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={answer === v}
            disabled={locked}
            onClick={() => setAnswer(v)}
            className={`${optionCls(answer === v)} text-center`}
          >
            {v ? "Vrai" : "Faux"}
          </button>
        ))}
      </div>
    );
  }

  if (type === "FILL_BLANK" || type === "TRANSLATION") {
    return (
      <input
        aria-label="Votre réponse"
        value={(answer as string) ?? ""}
        disabled={locked}
        onChange={(e) => setAnswer(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base"
      />
    );
  }

  if (type === "OPEN_QUESTION" || type === "WRITING") {
    return (
      <textarea
        aria-label="Votre réponse"
        value={(answer as string) ?? ""}
        disabled={locked}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base"
      />
    );
  }

  if (type === "ORDERING") {
    const chosen = (answer as string[] | null) ?? [];
    const remaining = [...(config.items ?? [])];
    for (const w of chosen) remaining.splice(remaining.indexOf(w), 1);
    return (
      <div className="grid gap-3">
        <div
          aria-label="Votre phrase"
          className="flex min-h-12 flex-wrap gap-2 rounded-lg border border-dashed border-zinc-300 p-2"
        >
          {chosen.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => setAnswer(chosen.filter((_, j) => j !== i))}
              className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-900"
            >
              {w}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {remaining.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => setAnswer([...chosen, w])}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (type === "MATCHING") {
    const current = (answer as Record<string, string> | null) ?? {};
    const lefts = config.lefts ?? [];
    return (
      <div className="grid gap-2">
        {lefts.map((left) => (
          <label key={left} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-zinc-800">{left}</span>
            <select
              value={current[left] ?? ""}
              disabled={locked}
              onChange={(e) => {
                const next = { ...current, [left]: e.target.value };
                if (!e.target.value) delete next[left];
                setAnswer(next);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5"
            >
              <option value="">Choisir…</option>
              {config.rights?.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  // SPEAKING : consigne + exemple, pratique à voix haute (le Speaking Lab enregistré arrive plus tard)
  return (
    <div className="grid gap-2 text-sm">
      {config.example && (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">
          <span className="font-medium">Exemple :</span> {config.example}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Dites votre réponse à voix haute. L&apos;enregistrement et le feedback IA arriveront avec le Speaking Lab.
      </p>
    </div>
  );
}
