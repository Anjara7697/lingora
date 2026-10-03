"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { type ActivityPayload, errorMessages } from "@/lib/api/cms";
import type { ActivityConfig, CmsActivity } from "@/types/cms";
import type { ActivityType } from "@/types/learning";

import { Field, Notice, inputCls, smallBtn } from "./ui";
import { CrossIcon } from "@/components/ui/icons";

export const TYPE_LABEL: Record<ActivityType, string> = {
  MCQ: "QCM",
  TRUE_FALSE: "Vrai / Faux",
  FILL_BLANK: "Texte à compléter",
  MATCHING: "Association",
  ORDERING: "Remise en ordre",
  TRANSLATION: "Traduction",
  LISTENING: "Écoute (QCM)",
  READING: "Lecture (QCM)",
  WRITING: "Rédaction",
  SPEAKING: "Pratique orale",
  OPEN_QUESTION: "Question ouverte",
};
const TYPE_HINT: Record<ActivityType, string> = {
  MCQ: "2 à 6 options",
  TRUE_FALSE: "une affirmation",
  FILL_BLANK: "avec ___",
  ORDERING: "mots mélangés",
  MATCHING: "paires uniques",
  TRANSLATION: "réponse attendue",
  LISTENING: "2 à 6 options",
  READING: "2 à 6 options",
  WRITING: "consigne",
  SPEAKING: "consigne + exemple",
  OPEN_QUESTION: "consigne",
};
const GRADED: ActivityType[] = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "ORDERING", "MATCHING", "TRANSLATION", "LISTENING", "READING"];
const UNGRADED: ActivityType[] = ["WRITING", "SPEAKING", "OPEN_QUESTION"];

/** Choix du type d'un nouvel exercice : corrigé automatiquement, ou enregistré sans note. */
export function TypePicker({ onPick, onCancel }: { onPick: (t: ActivityType) => void; onCancel: () => void }) {
  const group = (title: string, types: ActivityType[]) => (
    <div className="grid gap-2">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {types.map((t) => (
          <button key={t} type="button" onClick={() => onPick(t)} className="rounded-md bg-surface p-3 text-left shadow-[inset_0_0_0_1.5px_#cbd5e1] hover:bg-canvas">
            <span className="block font-semibold text-ink">{TYPE_LABEL[t]}</span>
            <span className="block text-[13px] text-muted">{TYPE_HINT[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="grid gap-4 rounded-lg bg-surface p-4 shadow-card" aria-label="Choisir un type d'exercice">
      <h3 className="font-display text-lg font-bold text-ink">Nouvel exercice</h3>
      {group("Corrigé automatiquement", GRADED)}
      {group("Enregistré, non noté", UNGRADED)}
      <button type="button" onClick={onCancel} className={`${smallBtn} w-fit`}>
        Annuler
      </button>
    </div>
  );
}

const MCQ_LIKE: ActivityType[] = ["MCQ", "LISTENING", "READING"];
const TEXT_ANSWER: ActivityType[] = ["FILL_BLANK", "TRANSLATION"];
const FREE: ActivityType[] = ["SPEAKING", "OPEN_QUESTION", "WRITING"];

interface Pair {
  left: string;
  right: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

interface Props {
  initial?: CmsActivity | null;
  /** Type choisi dans le sélecteur (nouvel exercice). */
  startType?: ActivityType;
  onSave: (payload: ActivityPayload) => Promise<void>;
  onCancel: () => void;
}

export function ActivityEditor({ initial, startType, onSave, onCancel }: Props) {
  const cfg = (initial?.configuration ?? {}) as ActivityConfig;
  const [type] = useState<ActivityType>(initial?.type ?? startType ?? "MCQ");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [question, setQuestion] = useState(str(cfg.question) || str(cfg.prompt));
  const [explanation, setExplanation] = useState(str(cfg.explanation));
  const [options, setOptions] = useState<string[]>(strs(cfg.options).length ? strs(cfg.options) : ["", ""]);
  const [correct, setCorrect] = useState<number>(typeof cfg.correct_answer === "number" ? cfg.correct_answer : 0);
  const [truth, setTruth] = useState<boolean>(typeof cfg.correct_answer === "boolean" ? cfg.correct_answer : true);
  const [answers, setAnswers] = useState(strs(cfg.correct_answers).join("\n"));
  const [sentence, setSentence] = useState(strs(cfg.correct_order).join(" "));
  const [pairs, setPairs] = useState<Pair[]>(
    Array.isArray(cfg.pairs) && cfg.pairs.length ? (cfg.pairs as Pair[]) : [{ left: "", right: "" }, { left: "", right: "" }],
  );
  const [example, setExample] = useState(str(cfg.example));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const filled = options.map((o) => o.trim().toLowerCase());
  const dupOption = MCQ_LIKE.includes(type) && filled.some((o, i) => o !== "" && filled.indexOf(o) !== i);
  const blankMissing = type === "FILL_BLANK" && question.trim() !== "" && !question.includes("___");
  const invalid = !title.trim() || dupOption || blankMissing;
  const locked = !!initial && initial.attempts > 0; // des élèves ont déjà tenté : le type ne change plus

  function buildConfig(): ActivityConfig {
    const base: ActivityConfig = explanation.trim() && !FREE.includes(type) ? { explanation } : {};
    if (MCQ_LIKE.includes(type)) return { ...base, question, options, correct_answer: correct };
    if (type === "TRUE_FALSE") return { ...base, question, correct_answer: truth };
    if (TEXT_ANSWER.includes(type)) {
      return { ...base, question, correct_answers: answers.split("\n").map((a) => a.trim()).filter(Boolean) };
    }
    if (type === "ORDERING") {
      return { ...base, question, correct_order: sentence.split(/\s+/).filter(Boolean) };
    }
    if (type === "MATCHING") return { ...base, question, pairs };
    return { prompt: question, ...(example.trim() ? { example } : {}) };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await onSave({ type, title, instructions: instructions || null, points, configuration: buildConfig() });
    } catch (err) {
      setErrors(errorMessages(err));
      setBusy(false);
    }
  }

  const setOption = (i: number, v: string) => setOptions(options.map((o, j) => (j === i ? v : o)));
  const setPair = (i: number, k: keyof Pair, v: string) => setPairs(pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const rm = "flex h-10 w-10 flex-none items-center justify-center rounded-md text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] disabled:opacity-40";
  const legend = "mb-1 text-sm font-semibold text-ink";

  return (
    <form onSubmit={submit} className="grid gap-3.5 rounded-lg bg-surface p-4 shadow-card" aria-label="Éditeur d'exercice">
      <h3 className="font-display text-lg font-bold text-ink">
        {TYPE_LABEL[type]}
        {initial ? " · " + initial.title : ""}
      </h3>
      {locked && <p className="text-[13px] text-muted">Type verrouillé : {initial!.attempts} tentative{initial!.attempts > 1 ? "s" : ""} d&apos;élèves.</p>}
      <Notice kind="error" messages={errors} />
      <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
        <Field label="Titre">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </Field>
        <Field label="Points">
          <input className={inputCls} type="number" min={1} max={20} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Consigne (facultatif)">
        <input className={inputCls} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={1000} />
      </Field>

      <Field
        label={FREE.includes(type) ? "Sujet / consigne en anglais" : type === "TRUE_FALSE" ? "Affirmation" : "Question"}
        hint={type === "FILL_BLANK" && !blankMissing ? "Écrivez ___ à l'endroit du mot à compléter. Ex. : My name ___ Hery." : undefined}
      >
        <textarea className={inputCls} rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} aria-invalid={blankMissing || undefined} />
      </Field>
      {blankMissing && <FieldError id="blank-error">Écrivez ___ à l&apos;endroit du mot à compléter</FieldError>}

      {MCQ_LIKE.includes(type) && (
        <fieldset className="grid gap-2">
          <legend className={legend}>
            Options ({options.length} / 6) · cochez la bonne réponse
          </legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} aria-label={`Bonne réponse : option ${i + 1}`} className="h-5 w-5 flex-none accent-[#172554]" />
              <input
                className={inputCls}
                value={o}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
                aria-invalid={dupOption && o.trim() !== "" && filled.indexOf(o.trim().toLowerCase()) !== i ? true : undefined}
              />
              {correct === i && <span className="hidden flex-none text-[13px] font-semibold text-brand-strong sm:inline">Bonne réponse</span>}
              <button
                type="button"
                className={rm}
                disabled={options.length <= 2}
                onClick={() => {
                  setOptions(options.filter((_, j) => j !== i));
                  setCorrect(correct === i ? 0 : correct > i ? correct - 1 : correct);
                }}
                aria-label={`Supprimer l'option ${i + 1}`}
              >
                <CrossIcon size={18} />
              </button>
            </div>
          ))}
          {dupOption && <FieldError id="dup-error">Deux options identiques : elles doivent être distinctes</FieldError>}
          <button type="button" className={`${smallBtn} w-fit`} disabled={options.length >= 6} onClick={() => setOptions([...options, ""])}>
            Ajouter une option
          </button>
        </fieldset>
      )}

      {type === "TRUE_FALSE" && (
        <fieldset>
          <legend className={legend}>Bonne réponse</legend>
          <div className="flex gap-1 rounded-md bg-ink-tint p-1 sm:w-64">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" aria-pressed={truth === v} onClick={() => setTruth(v)} className={`h-10 flex-1 rounded-[10px] text-sm font-semibold ${truth === v ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}>
                {v ? "Vrai" : "Faux"}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {TEXT_ANSWER.includes(type) && (
        <Field label="Réponse(s) acceptée(s), une par ligne" hint="La casse, les espaces en trop et le point final sont ignorés.">
          <textarea className={inputCls} rows={3} value={answers} onChange={(e) => setAnswers(e.target.value)} />
        </Field>
      )}

      {type === "ORDERING" && (
        <Field label="Phrase correcte" hint="Les mots seront mélangés automatiquement pour l'élève. Ex. : I am from Madagascar">
          <input className={inputCls} value={sentence} onChange={(e) => setSentence(e.target.value)} />
        </Field>
      )}

      {type === "MATCHING" && (
        <fieldset className="grid gap-2">
          <legend className={legend}>Paires à associer</legend>
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputCls} value={p.left} onChange={(e) => setPair(i, "left", e.target.value)} placeholder="Anglais" aria-label={`Paire ${i + 1} gauche`} />
              <span aria-hidden className="text-muted">→</span>
              <input className={inputCls} value={p.right} onChange={(e) => setPair(i, "right", e.target.value)} placeholder="Français" aria-label={`Paire ${i + 1} droite`} />
              <button type="button" className={rm} disabled={pairs.length <= 2} onClick={() => setPairs(pairs.filter((_, j) => j !== i))} aria-label={`Supprimer la paire ${i + 1}`}>
                <CrossIcon size={18} />
              </button>
            </div>
          ))}
          <button type="button" className={`${smallBtn} w-fit`} disabled={pairs.length >= 8} onClick={() => setPairs([...pairs, { left: "", right: "" }])}>
            Ajouter une paire
          </button>
        </fieldset>
      )}

      {type === "SPEAKING" && (
        <Field label="Exemple de réponse (facultatif)">
          <textarea className={inputCls} rows={2} value={example} onChange={(e) => setExample(e.target.value)} maxLength={500} />
        </Field>
      )}

      {!FREE.includes(type) && (
        <Field label="Explication affichée après la correction (facultatif)">
          <input className={inputCls} value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={500} />
        </Field>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={invalid} className="h-11">
          {initial ? "Enregistrer" : "Ajouter l'exercice"}
        </Button>
        <button type="button" onClick={onCancel} className={`${smallBtn} h-11`}>
          Annuler
        </button>
      </div>
    </form>
  );
}
