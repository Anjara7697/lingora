"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError, inputClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { sendFeedback } from "@/lib/api/teacher";
import type { FeedbackItem } from "@/types/teacher";

interface Props {
  studentId: string;
  studentFirstName: string;
  sessionId?: string;
  onCreated: (item: FeedbackItem) => void;
}

const MAX = 2000;

export function FeedbackForm({ studentId, studentFirstName, sessionId, onCreated }: Props) {
  const [comment, setComment] = useState("");
  const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const scoreNum = score === "" ? null : Number(score);
  const scoreInvalid = scoreNum !== null && (!Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !comment.trim() || scoreInvalid) return;
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const item = await sendFeedback(studentId, {
        comment: comment.trim(),
        score: scoreNum,
        speaking_session_id: sessionId ?? null,
      });
      onCreated(item);
      setComment("");
      setScore("");
      setSent(true);
      area.current?.focus();
    } catch (err) {
      // le texte saisi est conservé : le professeur peut réessayer sans tout retaper
      setError((err as Error).message || "Le retour n'a pas pu être envoyé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-lg bg-surface p-4 shadow-card">
      <h3 className="font-display text-lg font-bold text-ink">Écrire un retour</h3>
      {sessionId && <p className="text-[13px] text-muted">Envoyer un retour marque l&apos;analyse automatique comme relue.</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-comment" className="text-sm font-semibold text-ink">
          Commentaire
        </label>
        <textarea
          id="fb-comment"
          ref={area}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setSent(false);
          }}
          rows={5}
          maxLength={MAX}
          className={`${inputClass} h-auto py-3 leading-[1.5]`}
          placeholder="Points forts, corrections, conseils…"
        />
        <p className="text-right text-xs tabular-nums text-muted">
          {comment.length} / {MAX}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-score" className="text-sm font-semibold text-ink">
          Note sur 100 (facultative)
        </label>
        <input
          id="fb-score"
          type="number"
          inputMode="numeric"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          aria-invalid={scoreInvalid || undefined}
          aria-describedby={scoreInvalid ? "fb-score-error" : undefined}
          className={`${inputClass} sm:w-40`}
        />
        {scoreInvalid && <FieldError id="fb-score-error">Entre 0 et 100, ou laissez vide</FieldError>}
      </div>
      {error && <Notice tone="error">{error} Votre texte est conservé.</Notice>}
      {sent && <Notice tone="success">Retour envoyé. {studentFirstName} reçoit une notification.</Notice>}
      <Button type="submit" loading={busy} disabled={!comment.trim() || scoreInvalid}>
        Envoyer à l&apos;élève
      </Button>
      <p className="text-xs text-muted">{studentFirstName} reçoit une notification.</p>
    </form>
  );
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  if (!items.length) return <p className="text-[15px] text-muted">Aucun retour envoyé pour le moment.</p>;
  return (
    <ul className="grid gap-2.5">
      {items.map((f) => (
        <li key={f.id} className="flex flex-col gap-2.5 rounded-lg bg-surface p-4 shadow-card">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink-tint text-sm font-semibold text-ink">
              {f.teacher_name.trim()[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold text-ink">{f.teacher_name}</span>
              <span className="text-xs text-muted">{new Date(f.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </span>
            {f.score !== null && (
              <span className="inline-flex h-7 items-center rounded-full bg-ink px-2.5 text-[13px] font-semibold text-white">
                {Math.round(Number(f.score))} / 100
              </span>
            )}
          </div>
          <p className="whitespace-pre-line text-[15px] leading-[1.55] text-ink-2">{f.comment}</p>
        </li>
      ))}
    </ul>
  );
}
