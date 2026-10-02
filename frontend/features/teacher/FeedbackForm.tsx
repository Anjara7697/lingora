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
  if (!items.length) return <p className="text-sm text-zinc-500">Aucun feedback pour le moment.</p>;
  return (
    <ul className="grid gap-2">
      {items.map((f) => (
        <li key={f.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
          <p className="whitespace-pre-line text-zinc-800">{f.comment}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {f.teacher_name} · {new Date(f.created_at).toLocaleDateString("fr-FR")}
            {f.score !== null && ` · note ${Math.round(Number(f.score))}/100`}
          </p>
        </li>
      ))}
    </ul>
  );
}
