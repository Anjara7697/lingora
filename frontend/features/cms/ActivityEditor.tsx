"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Field";
import { type ActivityPayload, errorMessages } from "@/lib/api/cms";
import type { ActivityConfig, CmsActivity } from "@/types/cms";
import type { ActivityType } from "@/types/learning";

import { Field, Notice, inputCls, smallBtn } from "./ui";

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
const AUTHORABLE = Object.keys(TYPE_LABEL) as ActivityType[];

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
  onSave: (payload: ActivityPayload) => Promise<void>;
  onCancel: () => void;
}

export function ActivityEditor({ initial, onSave, onCancel }: Props) {
  const cfg = (initial?.configuration ?? {}) as ActivityConfig;
  const [type, setType] = useState<ActivityType>(initial?.type ?? "MCQ");
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

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4" aria-label="Éditeur d'exercice">
      <Notice kind="error" messages={errors} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type d'exercice" hint={locked ? "Verrouillé : des élèves ont déjà tenté cet exercice." : undefined}>
          <select className={inputCls} value={type} disabled={locked} onChange={(e) => setType(e.target.value as ActivityType)}>
            {AUTHORABLE.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Titre (affiché à l'élève)">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </Field>
      </div>
      <Field label="Consigne (facultatif)">
        <input className={inputCls} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={1000} />
      </Field>

      <Field
        label={FREE.includes(type) ? "Sujet / consigne en anglais" : type === "TRUE_FALSE" ? "Affirmation" : "Question"}
        hint={type === "FILL_BLANK" ? "Écrivez ___ à l'endroit du mot à compléter. Ex. : My name ___ Hery." : undefined}
      >
        <textarea className={inputCls} rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} />
      </Field>

      {MCQ_LIKE.includes(type) && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-zinc-800">Propositions (cochez la bonne réponse)</legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} aria-label={`Bonne réponse : proposition ${i + 1}`} />
              <input className={inputCls} value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Proposition ${i + 1}`} aria-label={`Proposition ${i + 1}`} />
              <button
                type="button"
                className={smallBtn}
                disabled={options.length <= 2}
                onClick={() => {
                  setOptions(options.filter((_, j) => j !== i));
                  setCorrect(correct === i ? 0 : correct > i ? correct - 1 : correct);
                }}
                aria-label={`Supprimer la proposition ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={`${smallBtn} w-fit`} disabled={options.length >= 6} onClick={() => setOptions([...options, ""])}>
            + Ajouter une proposition
          </button>
        </fieldset>
      )}

      {type === "TRUE_FALSE" && (
        <fieldset className="flex gap-4 text-sm">
          <legend className="mb-1 font-medium text-zinc-800">Bonne réponse</legend>
          {[true, false].map((v) => (
            <label key={String(v)} className="flex items-center gap-2">
              <input type="radio" name="truth" checked={truth === v} onChange={() => setTruth(v)} />
              {v ? "Vrai" : "Faux"}
            </label>
          ))}
        </fieldset>
      )}

      {TEXT_ANSWER.includes(type) && (
        <Field label="Réponses acceptées (une par ligne)" hint="La casse, les espaces en trop et le point final sont ignorés.">
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
          <legend className="text-sm font-medium text-zinc-800">Paires à associer</legend>
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputCls} value={p.left} onChange={(e) => setPair(i, "left", e.target.value)} placeholder="Anglais" aria-label={`Paire ${i + 1} gauche`} />
              <span aria-hidden>↔</span>
              <input className={inputCls} value={p.right} onChange={(e) => setPair(i, "right", e.target.value)} placeholder="Français" aria-label={`Paire ${i + 1} droite`} />
              <button type="button" className={smallBtn} disabled={pairs.length <= 2} onClick={() => setPairs(pairs.filter((_, j) => j !== i))} aria-label={`Supprimer la paire ${i + 1}`}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={`${smallBtn} w-fit`} disabled={pairs.length >= 8} onClick={() => setPairs([...pairs, { left: "", right: "" }])}>
            + Ajouter une paire
          </button>
        </fieldset>
      )}

      {type === "SPEAKING" && (
        <Field label="Exemple de réponse (facultatif)">
          <textarea className={inputCls} rows={2} value={example} onChange={(e) => setExample(e.target.value)} maxLength={500} />
        </Field>
      )}

      {!FREE.includes(type) && (
        <Field label="Explication affichée après la réponse (facultatif)">
          <input className={inputCls} value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={500} />
        </Field>
      )}

      <Field label="Points">
        <input className={`${inputCls} sm:w-24`} type="number" min={1} max={20} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !title.trim()}>
          {busy ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter l'exercice"}
        </Button>
        <button type="button" onClick={onCancel} className={smallBtn}>
          Annuler
        </button>
      </div>
    </form>
  );
}
