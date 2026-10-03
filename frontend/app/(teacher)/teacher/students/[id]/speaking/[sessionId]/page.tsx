"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { CheckIcon, ChevronLeftIcon, RefreshIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { AudioPreview } from "@/features/speaking/AudioPreview";
import { AnalysisCard } from "@/features/speaking/FeedbackCard";
import { FeedbackForm, FeedbackList } from "@/features/teacher/FeedbackForm";
import { ApiError } from "@/lib/api/client";
import { mediaUrl } from "@/lib/api/speaking";
import { getStudentSession } from "@/lib/api/teacher";
import type { Role } from "@/types/api";
import type { FeedbackItem, TeacherSessionDetail } from "@/types/teacher";

const STAFF: Role[] = ["TEACHER", "ADMIN"];

/** Surligne dans la transcription les passages signalés comme erreurs (soulignés, jamais en rouge). */
function Transcript({ text, originals }: { text: string; originals: string[] }) {
  const needles = originals.filter((o) => o && text.toLowerCase().includes(o.toLowerCase()));
  if (!needles.length) return <>{text}</>;
  const escaped = needles.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        needles.some((n) => n.toLowerCase() === p.toLowerCase()) ? (
          <mark key={i} className="rounded bg-ink-tint px-0.5 text-ink underline decoration-2 underline-offset-4">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export default function TeacherSessionPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const allowed = useRequireRole(STAFF);
  const [d, setD] = useState<TeacherSessionDetail | null>(null);
  const [error, setError] = useState<"notfound" | "network" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    getStudentSession(id, sessionId)
      .then((r) => {
        setD(r);
        setError(null);
        setExpired(false);
      })
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 404 ? "notfound" : "network"));
  }, [allowed, id, sessionId, attempt]);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  if (!allowed) return null;
  const back = (to: string, label: string) => (
    <Link href={to} className="mb-3 inline-flex h-10 items-center gap-1 text-[15px] font-semibold text-brand-strong">
      <ChevronLeftIcon size={18} /> {label}
    </Link>
  );
  if (error === "notfound")
    return (
      <>
        {back(`/teacher/students/${id}`, "Retour à l'élève")}
        <div className="py-10 text-center">
          <h1 className="font-display text-xl font-bold text-ink">Session introuvable</h1>
          <p className="mt-2 text-[15px] text-ink-2">Elle n&apos;existe pas ou n&apos;appartient pas à cet élève.</p>
        </div>
      </>
    );
  if (error === "network")
    return (
      <>
        {back(`/teacher/students/${id}`, "Retour à l'élève")}
        <ErrorState title="Session indisponible" onRetry={reload} />
      </>
    );
  if (!d)
    return (
      <>
        {back(`/teacher/students/${id}`, "Retour à l'élève")}
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
        </div>
      </>
    );

  const add = (item: FeedbackItem) =>
    setD({ ...d, teacher_feedback: [item, ...d.teacher_feedback], reviewed_by: d.reviewed_by ?? item.teacher_name });
  const name = `${d.student.first_name} ${d.student.last_name}`;
  const turn = d.turns[Math.min(current, d.turns.length - 1)];
  const originals = turn?.analysis
    ? (["grammar", "vocabulary", "fluency", "relevance", "pronunciation"] as const).flatMap((k) =>
        turn.analysis![k].issues.flatMap((i) => (i.original ? [i.original] : [])),
      )
    : [];

  return (
    <>
      {back(`/teacher/students/${id}`, name)}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink">{d.scenario.title}</h1>
        {d.reviewed_by && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-tint px-2.5 text-[13px] font-semibold text-brand-strong">
            <CheckIcon size={14} strokeWidth={3} /> Relue par {d.reviewed_by}
          </span>
        )}
      </div>
      {d.scenario.context && <p className="mt-1 text-[15px] text-ink-2">{d.scenario.context}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 content-start gap-4">
          {d.turns.length === 0 || !turn ? (
            <p className="rounded-lg bg-surface p-5 text-center text-[15px] text-muted shadow-card">Aucune tentative enregistrée.</p>
          ) : (
            <>
              <div role="tablist" aria-label="Tentatives" className="flex gap-1 overflow-x-auto rounded-md bg-ink-tint p-1">
                {d.turns.map((t, i) => (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={turn.id === t.id}
                    onClick={() => setCurrent(i)}
                    className={`h-10 flex-1 whitespace-nowrap rounded-[10px] px-3 text-sm font-semibold ${turn.id === t.id ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
                  >
                    Tentative {t.sequence_number}
                    {t.overall_score !== null ? ` · ${Math.round(t.overall_score)}` : ""}
                  </button>
                ))}
              </div>

              {turn.audio_url &&
                (expired ? (
                  <div className="flex items-center gap-3 rounded-lg bg-ink-tint p-3.5">
                    <p className="flex-1 text-[15px] text-ink">
                      <b className="font-semibold">Lien d&apos;écoute expiré.</b> <span className="text-ink-2">Valable 5 minutes.</span>
                    </p>
                    <button type="button" onClick={reload} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-surface px-3 text-sm font-semibold text-ink shadow-card">
                      <RefreshIcon size={16} strokeWidth={2} /> Recharger
                    </button>
                  </div>
                ) : (
                  <AudioPreview src={mediaUrl(turn.audio_url)} seconds={0} onError={() => setExpired(true)} />
                ))}

              {turn.transcript && (
                <section className="rounded-lg bg-surface p-4 shadow-card" aria-label="Transcription">
                  <h2 className="mb-2 font-display text-lg font-bold text-ink">Transcription</h2>
                  <p className="text-[16px] leading-[1.6] text-ink-2">
                    <Transcript text={turn.transcript} originals={originals} />
                  </p>
                </section>
              )}
              {turn.analysis && <AnalysisCard analysis={turn.analysis} overall={turn.overall_score} />}
            </>
          )}
        </div>

        <aside className="min-w-0">
          <FeedbackForm studentId={id} studentFirstName={d.student.first_name} sessionId={sessionId} onCreated={add} />
          <h2 className="mb-2 mt-6 font-display text-lg font-bold text-ink">Retours sur cette session · {d.teacher_feedback.length}</h2>
          <FeedbackList items={d.teacher_feedback} />
        </aside>
      </div>
    </>
  );
}
