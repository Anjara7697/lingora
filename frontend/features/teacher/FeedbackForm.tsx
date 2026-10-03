"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Field";
import { sendFeedback } from "@/lib/api/teacher";
import type { FeedbackItem } from "@/types/teacher";

interface Props {
  studentId: string;
  sessionId?: string;
  onCreated: (item: FeedbackItem) => void;
}

export function FeedbackForm({ studentId, sessionId, onCreated }: Props) {
  const [comment, setComment] = useState("");
  const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const item = await sendFeedback(studentId, {
        comment: comment.trim(),
        score: score === "" ? null : Number(score),
        speaking_session_id: sessionId ?? null,
      });
      onCreated(item);
      setComment("");
      setScore("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="font-semibold text-zinc-900">Écrire un feedback</h3>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-800">Commentaire</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base"
          placeholder="Points forts, corrections, conseils…"
        />
      </label>
      <label className="grid gap-1 text-sm sm:w-40">
        <span className="font-medium text-zinc-800">Note (optionnelle, /100)</span>
        <input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base"
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={busy || !comment.trim()}>
        {busy ? "Envoi…" : "Envoyer à l'élève"}
      </Button>
      <p className="text-xs text-zinc-500">L&apos;élève reçoit une notification.</p>
    </form>
  );
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  if (!items.length) return <p className="text-[15px] text-muted">Aucun feedback pour le moment.</p>;
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
