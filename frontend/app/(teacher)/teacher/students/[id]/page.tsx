"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { FeedbackForm, FeedbackList } from "@/features/teacher/FeedbackForm";
import { LEVEL_LABEL, SKILL_LABEL, STATUS_LABEL } from "@/lib/labels";
import { getStudent } from "@/lib/api/teacher";
import { formatDate, timeAgo } from "@/lib/time";
import type { Role } from "@/types/api";
import type { FeedbackItem, StudentDetail } from "@/types/teacher";

const STAFF: Role[] = ["TEACHER", "ADMIN"];

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const allowed = useRequireRole(STAFF);
  const [d, setD] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getStudent(id)
      .then(setD)
      .catch((e: Error) => setError(e.message));
  }, [allowed, id]);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!d) return <p className="text-zinc-500">Chargement…</p>;

  const addFeedback = (item: FeedbackItem) => setD({ ...d, feedback: [item, ...d.feedback] });
  const st = STATUS_LABEL[d.status];

  return (
    <>
      <Link href="/teacher" className="text-sm text-indigo-600 hover:underline">
        ← Mes élèves
      </Link>
      <header className="mt-2 mb-5">
        <h1 className="text-2xl font-bold text-zinc-900">
          {d.student.first_name} {d.student.last_name}
        </h1>
        <p className="text-sm text-zinc-500">{d.student.email} · inscrit le {formatDate(d.student.created_at)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
          {d.current_level && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
              {d.current_level} · {LEVEL_LABEL[d.current_level]}
            </span>
          )}
          <span className="text-zinc-500">Dernière activité : {timeAgo(d.last_activity_at)}</span>
        </div>
      </header>

      <Section title="Compétences">
        {d.skills.length === 0 ? (
          <Empty>Pas encore de mesure (test de niveau ou Speaking Lab).</Empty>
        ) : (
          <div className="grid gap-3">
            {d.skills.map((s) => (
              <ProgressBar key={s.code} value={Number(s.score)} label={`${SKILL_LABEL[s.code] ?? s.name}${s.level ? ` · ${s.level}` : ""}`} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Programmes">
        {d.enrollments.length === 0 ? (
          <Empty>Aucune inscription.</Empty>
        ) : (
          <div className="grid gap-3">
            {d.enrollments.map((e) => (
              <ProgressBar key={e.program_slug} value={Number(e.progress)} label={e.program_name} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Sessions d'oral">
        {d.speaking_sessions.length === 0 ? (
          <Empty>Aucune session.</Empty>
        ) : (
          <ul className="grid gap-2">
            {d.speaking_sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/teacher/students/${id}/speaking/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-indigo-400"
                >
                  <span>
                    <span className="font-medium text-zinc-900">{s.scenario_title}</span>
                    <span className="block text-xs text-zinc-500">
                      {formatDate(s.started_at)} · {s.attempts} tentative(s) · {s.status === "COMPLETED" ? "terminée" : "en cours"}
                    </span>
                  </span>
                  <span className="font-semibold text-indigo-600">{s.last_score === null ? "—" : Math.round(s.last_score)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Derniers exercices">
        {d.recent_attempts.length === 0 ? (
          <Empty>Aucun exercice réalisé.</Empty>
        ) : (
          <ul className="grid gap-1 text-sm">
            {d.recent_attempts.map((a, i) => (
              <li key={i} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2">
                <span>
                  {a.lesson_title} — {a.activity_title}
                </span>
                <span className={a.is_correct === false ? "text-red-600" : "text-green-700"}>
                  {a.is_correct === null ? "libre" : a.is_correct ? "✓" : "✗"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Tests de niveau">
        {d.placements.length === 0 ? (
          <Empty>Test non passé.</Empty>
        ) : (
          <ul className="grid gap-1 text-sm">
            {d.placements.map((p) => (
              <li key={p.attempt_id} className="flex justify-between rounded-lg bg-white px-3 py-2">
                <span>{formatDate(p.completed_at)}</span>
                <span className="font-semibold">{p.level} · {Math.round(Number(p.score ?? 0))} %</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Feedback">
        <FeedbackForm studentId={id} onCreated={addFeedback} />
        <div className="mt-4">
          <FeedbackList items={d.feedback} />
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-zinc-500">{children}</p>;
