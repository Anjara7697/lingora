"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { CheckIcon, ClockIcon, CrossIcon, RefreshIcon } from "@/components/ui/icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { submitActivity } from "@/lib/api/learning";
import { deleteStoredResult, enqueueAnswer, getStoredResult, pendingAnswers } from "@/lib/offline/db";
import { SYNCED_EVENT } from "@/lib/offline/sync";
import type { ActivityItem, SubmitResult } from "@/types/learning";

interface Props {
  item: ActivityItem;
  index: number;
  onResult: (activityId: string, result: SubmitResult) => void;
}

const TYPE_LABEL: Record<string, string> = {
  MCQ: "QCM",
  TRUE_FALSE: "Vrai ou faux",
  FILL_BLANK: "Texte à compléter",
  MATCHING: "Associer",
  ORDERING: "Remettre dans l'ordre",
  TRANSLATION: "Traduction",
  LISTENING: "Compréhension orale",
  READING: "Lecture",
  WRITING: "Écriture",
  SPEAKING: "À voix haute",
  OPEN_QUESTION: "Question ouverte",
};

type Answer = unknown;

function formatCorrect(value: unknown, config: ActivityItem["config"]): string {
  if (typeof value === "number" && config.options?.[value] !== undefined) return config.options[value];
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

export function ActivityCard({ item, index, onResult }: Props) {
  const { activity, config, graded, mastered } = item;
  const [answer, setAnswer] = useState<Answer>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const { user } = useAuth();
  const userId = user?.id;
  const [queued, setQueued] = useState(false); // réponse donnée sans réseau, en attente d'envoi
  const [corrected, setCorrected] = useState(false); // correction reçue après synchronisation

  // Réponse mise de côté hors ligne : en attente, ou déjà corrigée depuis la reconnexion.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const restore = () =>
      getStoredResult(userId, activity.id)
        .then(async (stored) => {
          if (cancelled) return;
          if (stored) {
            setResult(stored);
            setQueued(false);
            setCorrected(true);
            onResult(activity.id, stored);
          } else {
            const waiting = (await pendingAnswers(userId)).some((a) => a.activityId === activity.id);
            if (!cancelled) setQueued(waiting);
          }
        })
        .catch(() => {});
    void restore();
    window.addEventListener(SYNCED_EVENT, restore);
    return () => {
      cancelled = true;
      window.removeEventListener(SYNCED_EVENT, restore);
    };
  }, [userId, activity.id, onResult]);

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
      if (e instanceof ApiError && e.status === 0 && userId) {
        // Pas de réseau : la réponse est gardée sur l'appareil et corrigée à la reconnexion.
        const saved = await enqueueAnswer({
          userId,
          activityId: activity.id,
          answer: isPractice ? null : answer,
          durationSeconds: Math.round((Date.now() - startedAt) / 1000),
          answeredAt: Date.now(),
        });
        if (saved) return setQueued(true);
      }
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    if (corrected) void deleteStoredResult(activity.id);
    setCorrected(false);
    setAnswer(null);
    setResult(null);
    setStartedAt(Date.now());
  }

  const locked = result !== null || queued;
  const succeeded = mastered || result?.is_correct === true || (result !== null && !result.graded);
  const wrong = result !== null && result.graded && !result.is_correct;
  return (
    <article className="flex flex-col gap-3 rounded-lg bg-surface p-[18px] shadow-card">
      <header className="flex items-center justify-between gap-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {index} · {TYPE_LABEL[activity.type] ?? activity.type}
        </p>
        {succeeded && (
          <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-brand-strong px-2.5 text-xs font-semibold text-white">
            <CheckIcon size={13} strokeWidth={3} /> Réussie
          </span>
        )}
      </header>
      {activity.instructions && <p className="-mt-1 text-[13px] text-muted">{activity.instructions}</p>}

      {(config.question || config.prompt) && (
        <p className="text-base font-semibold leading-[1.4] text-ink">{config.question ?? config.prompt}</p>
      )}

      <Body item={item} answer={answer} setAnswer={setAnswer} locked={locked} result={result} />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {queued && (
        <div role="status" className="flex gap-2.5 rounded-md bg-ink-tint px-3.5 py-3 text-sm leading-[1.45] text-ink">
          <ClockIcon size={20} strokeWidth={2} className="mt-px flex-none" />
          <p>Réponse enregistrée sur cet appareil. Elle sera corrigée dès votre retour sur Internet.</p>
        </div>
      )}

      {result && !result.graded && (
        <div role="status" className="rounded-md bg-ink-tint px-3.5 py-3 text-sm text-ink">
          <b className="font-semibold">Enregistré.</b> Bien joué, continuez à pratiquer !
        </div>
      )}
      {result && result.graded && result.is_correct && (
        <div role="status" className="rounded-md bg-brand-tint px-3.5 py-3 text-sm leading-[1.45] text-brand-strong">
          <b className="font-semibold">Bonne réponse !</b> {result.explanation}
          {corrected && <span className="mt-1 block text-xs opacity-80">Corrigée à la reconnexion.</span>}
        </div>
      )}
      {wrong && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-slate-100 px-3.5 py-3 text-sm leading-[1.5] text-ink-2">
          <b className="font-semibold text-ink">Pas tout à fait.</b>
          <p>
            Réponse attendue : <b className="font-semibold text-brand-strong">{formatCorrect(result.correct_answer, config)}</b>
            {result.explanation ? `. ${result.explanation}` : ""}
          </p>
          {corrected && <span className="text-xs text-muted">Corrigée à la reconnexion.</span>}
        </div>
      )}

      {!locked && (
        <Button onClick={send} disabled={!canSubmit || submitting} className="w-full">
          {submitting ? "Envoi…" : isPractice ? "J'ai pratiqué à voix haute" : graded ? "Valider" : "Envoyer"}
        </Button>
      )}
      {wrong && (
        <Button onClick={retry} variant="secondary" className="w-full">
          <RefreshIcon size={18} strokeWidth={2} /> Réessayer
        </Button>
      )}
    </article>
  );
}

type OptionState = "idle" | "selected" | "correct" | "wrong" | "reveal";

const OPTION_CLS: Record<OptionState, string> = {
  idle: "bg-canvas text-ink-2 shadow-[inset_0_0_0_1.5px_#e2e8f0] enabled:hover:bg-ink-tint",
  selected: "bg-ink-tint font-semibold text-ink shadow-[inset_0_0_0_2px_#172554]",
  correct: "bg-brand-tint font-semibold text-brand-strong shadow-[inset_0_0_0_2px_#0f766e]",
  wrong: "bg-slate-100 font-semibold text-ink-2 shadow-[inset_0_0_0_2px_#64748b]",
  reveal: "bg-surface font-semibold text-brand-strong shadow-[inset_0_0_0_2px_#0f766e] outline-dashed outline-2 -outline-offset-[6px] outline-brand-strong",
};

function optionState(value: unknown, answer: Answer, result: SubmitResult | null): OptionState {
  if (result && result.graded) {
    if (answer === value) return result.is_correct ? "correct" : "wrong";
    if (!result.is_correct && result.correct_answer === value) return "reveal";
    return "idle";
  }
  return answer === value ? "selected" : "idle";
}

function Marker({ state }: { state: OptionState }) {
  if (state === "correct") {
    return (
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-strong text-white">
        <CheckIcon size={13} strokeWidth={3.5} />
      </span>
    );
  }
  if (state === "wrong") {
    return (
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-muted text-white">
        <CrossIcon size={12} strokeWidth={3.5} />
      </span>
    );
  }
  if (state === "selected") {
    return (
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ink">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span
      className={`h-5 w-5 flex-none rounded-full ${state === "reveal" ? "shadow-[inset_0_0_0_2px_#0f766e]" : "shadow-[inset_0_0_0_2px_#cbd5e1]"}`}
    />
  );
}

function Body({
  item,
  answer,
  setAnswer,
  locked,
  result,
}: {
  item: ActivityItem;
  answer: Answer;
  setAnswer: (a: Answer) => void;
  locked: boolean;
  result: SubmitResult | null;
}) {
  const { type } = item.activity;
  const { config } = item;
  const dim = locked && !result ? "opacity-70" : "";

  if (type === "MCQ" || type === "LISTENING" || type === "READING") {
    return (
      <div className={`grid gap-2 ${dim}`} role="radiogroup">
        {config.options?.map((opt, i) => {
          const state = optionState(i, answer, result);
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={answer === i}
              disabled={locked}
              onClick={() => setAnswer(i)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3.5 py-2 text-left text-[15px] transition ${OPTION_CLS[state]}`}
            >
              <Marker state={state} />
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "TRUE_FALSE") {
    return (
      <div className={`grid grid-cols-2 gap-2.5 ${dim}`} role="radiogroup">
        {[true, false].map((v) => {
          const state = optionState(v, answer, result);
          return (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={answer === v}
              disabled={locked}
              onClick={() => setAnswer(v)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-[15px] font-semibold transition ${OPTION_CLS[state === "idle" ? "idle" : state]}`}
            >
              {state === "wrong" && <CrossIcon size={14} strokeWidth={3.5} />}
              {state === "correct" && <CheckIcon size={14} strokeWidth={3.5} />}
              {v ? "Vrai" : "Faux"}
            </button>
          );
        })}
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
        className={`${inputClass} font-semibold ${dim}`}
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
        rows={4}
        className={`min-h-28 w-full rounded-md bg-surface px-3.5 py-3 text-base text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] outline-none focus:shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5] disabled:bg-canvas ${dim}`}
      />
    );
  }

  if (type === "ORDERING") {
    const chosen = (answer as string[] | null) ?? [];
    const remaining = [...(config.items ?? [])];
    for (const w of chosen) remaining.splice(remaining.indexOf(w), 1);
    return (
      <div className={`grid gap-3 ${dim}`}>
        <div
          aria-label="Votre phrase"
          className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border-[1.5px] border-dashed border-slate-400 bg-canvas p-2"
        >
          {chosen.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => setAnswer(chosen.filter((_, j) => j !== i))}
              className="h-10 rounded-[10px] bg-ink px-3.5 text-[15px] font-semibold text-white"
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
              className="h-11 rounded-[10px] bg-surface px-3.5 text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1,0_2px_0_#e2e8f0]"
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
      <div className={`grid gap-2.5 ${dim}`}>
        {lefts.map((left) => (
          <label key={left} className="flex items-center justify-between gap-3 text-[15px]">
            <span className="font-semibold text-ink">{left}</span>
            <select
              value={current[left] ?? ""}
              disabled={locked}
              onChange={(e) => {
                const next = { ...current, [left]: e.target.value };
                if (!e.target.value) delete next[left];
                setAnswer(next);
              }}
              className="h-11 min-w-36 rounded-md bg-surface px-2.5 text-[15px] text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] outline-none focus:shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5]"
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

  return null;
}
