"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useRequireRole } from "@/features/auth/useRequireRole";
import { AnalysisCard } from "@/features/speaking/FeedbackCard";
import { FeedbackForm, FeedbackList } from "@/features/teacher/FeedbackForm";
import { getStudentSession } from "@/lib/api/teacher";
import { mediaUrl } from "@/lib/api/speaking";
import type { Role } from "@/types/api";
import type { FeedbackItem, TeacherSessionDetail } from "@/types/teacher";

const STAFF: Role[] = ["TEACHER", "ADMIN"];

export default function TeacherSessionPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const allowed = useRequireRole(STAFF);
  const [d, setD] = useState<TeacherSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getStudentSession(id, sessionId)
      .then(setD)
      .catch((e: Error) => setError(e.message));
  }, [allowed, id, sessionId]);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!d) return <p className="text-zinc-500">Chargement…</p>;

  const add = (item: FeedbackItem) => setD({ ...d, teacher_feedback: [item, ...d.teacher_feedback] });
  const name = `${d.student.first_name} ${d.student.last_name}`;

  return (
    <>
      <Link href={`/teacher/students/${id}`} className="text-sm text-indigo-600 hover:underline">
        ← {name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">{d.scenario.title}</h1>
      <p className="mb-4 text-sm text-zinc-600">{d.scenario.context}</p>

      {d.turns.length === 0 && <p className="text-sm text-zinc-500">Aucune tentative.</p>}
      <div className="grid gap-4">
        {d.turns.map((t) => (
          <section key={t.id} className="rounded-xl border border-zinc-200 bg-white p-4" aria-label={`Tentative ${t.sequence_number}`}>
            <h2 className="mb-1 font-semibold text-zinc-900">Tentative {t.sequence_number}</h2>
            {t.transcript && <p className="mb-2 text-sm italic text-zinc-700">« {t.transcript} »</p>}
            {t.audio_url && <audio controls src={mediaUrl(t.audio_url)} className="mb-3 w-full" />}
            {t.analysis && <AnalysisCard analysis={t.analysis} overall={t.overall_score} />}
          </section>
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-semibold text-zinc-900">Votre feedback sur cette session</h2>
      <FeedbackForm studentId={id} sessionId={sessionId} onCreated={add} />
      <div className="mt-4">
        <FeedbackList items={d.teacher_feedback} />
      </div>
    </>
  );
}
