"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { FeedbackForm, FeedbackList } from "@/features/teacher/FeedbackForm";
import { Avatar, StudentStatusPill } from "@/features/teacher/StatusPill";
import { ApiError } from "@/lib/api/client";
import { getStudent } from "@/lib/api/teacher";
import { GOAL_LABEL, LEVEL_LABEL, SKILL_LABEL } from "@/lib/labels";
import { formatDate, timeAgo } from "@/lib/time";
import type { Role } from "@/types/api";
import type { PrimaryGoal } from "@/types/placement";
import type { FeedbackItem, StudentDetail } from "@/types/teacher";

const STAFF: Role[] = ["TEACHER", "ADMIN"];
type Tab = "follow" | "speaking" | "feedback";

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const allowed = useRequireRole(STAFF);
  const [d, setD] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<"notfound" | "network" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>("follow");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    getStudent(id)
      .then((r) => {
        setD(r);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 404 ? "notfound" : "network"));
  }, [allowed, id, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  if (!allowed) return null;
  const back = (
    <Link href="/teacher" className="mb-3 inline-flex h-10 items-center gap-1 text-[15px] font-semibold text-brand-strong">
      <ChevronLeftIcon size={18} /> Mes élèves
    </Link>
  );
  if (error === "notfound")
    return (
      <>
        {back}
        <div className="py-10 text-center">
          <h1 className="font-display text-xl font-bold text-ink">Élève introuvable</h1>
          <p className="mt-2 text-[15px] text-ink-2">Cet élève n&apos;est pas dans votre groupe.</p>
        </div>
      </>
    );
  if (error === "network")
    return (
      <>
        {back}
        <ErrorState title="Fiche indisponible" onRetry={retry} />
      </>
    );
  if (!d)
    return (
      <>
        {back}
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      </>
    );

  const addFeedback = (item: FeedbackItem) => setD({ ...d, feedback: [item, ...d.feedback] });
  const speakingSkill = d.skills.find((s) => s.code === "SPEAKING");
  const overall = d.enrollments.length ? d.enrollments.reduce((a, e) => a + Number(e.progress), 0) / d.enrollments.length : null;
  const weakest = d.skills.length ? d.skills.reduce((a, b) => (Number(b.score) < Number(a.score) ? b : a)).code : null;
  const sessions = showAll ? d.speaking_sessions : d.speaking_sessions.slice(0, 2);
  const show = (t: Tab) => (tab === t ? "" : "hidden lg:block");

  return (
    <>
      {back}
      <header className="flex items-start gap-4">
        <Avatar first={d.student.first_name} last={d.student.last_name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] font-bold leading-tight text-ink">
            {d.student.first_name} {d.student.last_name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StudentStatusPill status={d.status} />
            <span className="break-all text-[13px] text-muted">{d.student.email}</span>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Inscrit le {formatDate(d.student.created_at)}
            {d.primary_goal ? ` · Objectif : ${GOAL_LABEL[d.primary_goal as PrimaryGoal] ?? d.primary_goal}` : ""}
          </p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Résumé">
        <Summary label="Niveau" value={d.current_level ? `${d.current_level}` : "—"} sub={d.current_level ? LEVEL_LABEL[d.current_level] : "Non évalué"} />
        <Summary label="Progression" value={overall === null ? "—" : `${Math.round(overall)} %`} />
        <Summary
          label="Score oral"
          value={speakingSkill ? `${Math.round(Number(speakingSkill.score))}` : "—"}
          sub={speakingSkill && Number(speakingSkill.score) < 50 ? "sous 50" : undefined}
        />
        <Summary label="Dernière activité" value={timeAgo(d.last_activity_at)} small />
      </section>

      <div role="tablist" aria-label="Sections" className="mt-5 flex gap-1 rounded-md bg-ink-tint p-1 lg:hidden">
        {(
          [
            ["follow", "Suivi"],
            ["speaking", `Oral · ${d.speaking_sessions.length}`],
            ["feedback", `Retours · ${d.feedback.length}`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-10 flex-1 rounded-[10px] text-sm font-semibold ${tab === t ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <div className={show("follow")}>
            <Section title="Compétences">
              {d.skills.length === 0 ? (
                <Empty>Pas encore de mesure (test de niveau ou Speaking Lab).</Empty>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {d.skills.map((s) => (
                    <div key={s.code} className={s.code === weakest ? "rounded-md bg-ink-tint p-3" : "p-3"}>
                      <ProgressBar value={Number(s.score)} label={`${SKILL_LABEL[s.code] ?? s.name}${s.level ? ` · ${s.level}` : ""}`} />
                      {s.code === weakest && <p className="mt-1.5 text-xs font-semibold text-ink">Compétence la plus faible</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className={show("speaking")}>
            <Section title="Sessions d'oral">
              {d.speaking_sessions.length === 0 ? (
                <Empty>Aucune session.</Empty>
              ) : (
                <>
                  <ul className="grid gap-2">
                    {sessions.map((s) => (
                      <li key={s.id}>
                        <Link href={`/teacher/students/${id}/speaking/${s.id}`} className="flex min-h-16 items-center gap-3 rounded-lg bg-surface px-4 py-3 shadow-card">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-ink">{s.scenario_title}</span>
                            <span className="block text-[13px] text-muted">
                              {formatDate(s.started_at)} · {s.attempts} tentative{s.attempts > 1 ? "s" : ""}
                            </span>
                          </span>
                          {!s.reviewed && s.attempts > 0 && (
                            <span className="inline-flex h-7 items-center rounded-full bg-ink px-2.5 text-[13px] font-semibold text-white">À relire</span>
                          )}
                          <span className="font-display text-lg font-bold tabular-nums text-ink">{s.last_score === null ? "—" : Math.round(s.last_score)}</span>
                          <ChevronRightIcon size={18} className="text-muted" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {d.speaking_sessions.length > 2 && (
                    <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 h-11 text-[15px] font-semibold text-brand-strong underline">
                      {showAll ? "Réduire la liste" : `Voir les ${d.speaking_sessions.length - 2} autres sessions`}
                    </button>
                  )}
                </>
              )}
            </Section>
          </div>

          <div className={show("follow")}>
            <Section title="Derniers exercices">
              {d.recent_attempts.length === 0 ? (
                <Empty>Aucun exercice réalisé.</Empty>
              ) : (
                <ul className="grid gap-1.5">
                  {d.recent_attempts.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-surface px-3.5 py-2.5 text-[15px] shadow-card">
                      <span className="min-w-0 truncate text-ink-2">
                        {a.lesson_title} — {a.activity_title}
                      </span>
                      <span className={`flex-none text-[13px] font-semibold ${a.is_correct === false ? "text-ink underline decoration-2" : "text-brand-strong"}`}>
                        {a.is_correct === null ? "Libre" : a.is_correct ? "Juste" : "À revoir"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Programmes et tests" className="mt-6">
              {d.enrollments.length === 0 && d.placements.length === 0 ? (
                <Empty>Aucune inscription ni test passé.</Empty>
              ) : (
                <div className="grid gap-3">
                  {d.enrollments.map((e) => (
                    <ProgressBar key={e.program_slug} value={Number(e.progress)} label={e.program_name} />
                  ))}
                  {d.placements.map((p) => (
                    <p key={p.attempt_id} className="flex justify-between text-[15px] text-ink-2">
                      <span>Test de niveau · {formatDate(p.completed_at)}</span>
                      <span className="font-semibold text-ink">
                        {p.level} · {Math.round(Number(p.score ?? 0))} %
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>

        <aside className={`min-w-0 ${show("feedback")}`}>
          <FeedbackForm studentId={id} studentFirstName={d.student.first_name} onCreated={addFeedback} />
          <h2 className="mb-2 mt-6 font-display text-lg font-bold text-ink">Retours envoyés · {d.feedback.length}</h2>
          <FeedbackList items={d.feedback} />
        </aside>
      </div>
    </>
  );
}

function Summary({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-surface p-3.5 shadow-card">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className={`font-display font-bold text-ink ${small ? "text-lg leading-8" : "text-[26px]"}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-[15px] text-muted">{children}</p>;
