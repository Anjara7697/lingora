"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonClass } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ChevronRightIcon, DownloadIcon, MicIcon } from "@/components/ui/icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { myEnrollments, nextStep } from "@/lib/api/learning";
import { getOnboarding, latestPlacementResult } from "@/lib/api/placement";
import { LEVEL_LABEL } from "@/lib/labels";
import { listSavedLessons } from "@/lib/offline/db";
import type { Role } from "@/types/api";
import type { EnrollmentItem, NextStep } from "@/types/learning";
import type { PlacementResult } from "@/types/placement";

const STUDENT_ONLY: Role[] = ["STUDENT"];
const card = "rounded-lg bg-surface shadow-card";
const kicker = "text-xs font-semibold uppercase tracking-[0.08em]";

export default function DashboardPage() {
  const allowed = useRequireRole(STUDENT_ONLY);
  const { user } = useAuth();
  const [next, setNext] = useState<NextStep | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[] | null>(null);
  const [placement, setPlacement] = useState<PlacementResult | null | undefined>(undefined);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!allowed || !userId) return;
    Promise.all([nextStep(), myEnrollments(), latestPlacementResult()])
      .then(([n, e, p]) => {
        setNext(n);
        setEnrollments(e);
        setPlacement(p);
      })
      .catch(() => {
        setEnrollments([]);
        setPlacement(null);
      });
    getOnboarding()
      .then((o) => setMinutes(o?.daily_minutes ?? null))
      .catch(() => {});
    void listSavedLessons(userId).then((l) => setOfflineCount(l.length));
  }, [allowed, userId]);

  if (!allowed || !user) return <p className="text-muted">Chargement…</p>;

  const progress = next ? Number(enrollments?.find((e) => e.program.id === next.program.id)?.enrollment.progress_percentage ?? 0) : 0;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Bonjour {user.first_name}</h1>
        <p className="text-[15px] text-muted">{minutes ? `Prêt pour ${minutes} minutes d'anglais ?` : "Prêt pour votre séance d'anglais ?"}</p>
      </header>

      {placement === null && (
        <section className={`${card} flex flex-col gap-3 p-5`}>
          <h2 className="font-display text-lg font-bold text-ink">Passez le test de niveau</h2>
          <p className="text-sm text-ink-2">25 questions, environ 10 minutes, pour estimer votre niveau.</p>
          <Link href="/placement" className={buttonClass("primary")}>
            Commencer le test
          </Link>
        </section>
      )}

      {enrollments && enrollments.length === 0 && (
        <section className="flex flex-col gap-3 rounded-lg bg-ink-tint p-5">
          <h2 className="font-display text-lg font-bold text-ink">Commencez votre parcours</h2>
          <p className="text-sm text-ink-2">Choisissez un programme pour débuter l&apos;apprentissage.</p>
          <Link href="/programs" className={buttonClass("primary")}>
            Voir les programmes
          </Link>
        </section>
      )}

      {next?.lesson && (
        <section className="relative flex flex-col gap-4 overflow-hidden rounded-[20px] bg-ink p-5 text-white">
          <span aria-hidden className="absolute -right-12 -top-14 h-[180px] w-[180px] rounded-full bg-brand opacity-[0.18]" />
          <div className="relative flex flex-col gap-1.5">
            <p className={`${kicker} text-brand`}>Continuer</p>
            <h2 className="font-display text-xl font-bold leading-tight">{next.lesson.title}</h2>
            <p className="text-sm text-slate-300">
              {next.program.name}
              {next.course ? ` · ${next.course.title}` : ""}
            </p>
          </div>
          <div className="relative flex items-center gap-3">
            <div role="progressbar" aria-label="Progression du programme" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(progress)}%` }} />
            </div>
            <span className="text-[13px] font-semibold">{Math.round(progress)} %</span>
          </div>
          <Link href={`/lessons/${next.lesson.id}`} className="relative inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand font-semibold text-ink">
            Reprendre la leçon <ChevronRightIcon size={18} strokeWidth={2.4} />
          </Link>
        </section>
      )}
      {next && !next.lesson && (
        <Notice tone="success" title="Bravo !">
          Vous avez terminé toutes les leçons disponibles de {next.program.name}.
        </Notice>
      )}

      <div className={`grid gap-3 ${placement ? "grid-cols-2" : "grid-cols-1"}`}>
        {placement && (
          <Link href="/placement/result" className={`${card} flex min-h-[132px] flex-col gap-2.5 p-4`}>
            <span className={`${kicker} text-muted`}>Mon niveau</span>
            <span className="font-display text-[32px] font-bold leading-none text-ink">{placement.overall_level}</span>
            <span className="mt-auto flex items-center justify-between text-sm text-ink-2">
              {LEVEL_LABEL[placement.overall_level]}
              <ChevronRightIcon size={16} strokeWidth={2.4} className="text-brand-strong" />
            </span>
          </Link>
        )}
        <Link href="/speaking" className="flex min-h-[132px] flex-col gap-2.5 rounded-lg bg-brand-tint p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-ink">
            <MicIcon size={20} strokeWidth={2} />
          </span>
          <span className="text-base font-semibold text-ink">Speaking Lab</span>
          <span className="text-[13px] leading-snug text-brand-strong">Pratiquez l&apos;oral, recevez un feedback.</span>
        </Link>
      </div>

      {enrollments && enrollments.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Mes programmes</h2>
            <Link href="/programs" className="text-sm font-semibold text-brand-strong">
              Tout voir
            </Link>
          </div>
          <ul className={`${card} divide-y divide-line`}>
            {enrollments.map(({ enrollment, program }) => {
              const pct = Math.round(Number(enrollment.progress_percentage));
              return (
                <li key={enrollment.id}>
                  <Link href={`/programs/${program.slug}`} className="flex flex-col gap-2.5 p-4">
                    <span className="flex justify-between gap-3">
                      <span className="text-[15px] font-semibold text-ink">{program.name}</span>
                      <span className="text-[13px] text-ink-2">{pct} %</span>
                    </span>
                    <span role="progressbar" aria-label={`Progression ${program.name}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link href="/downloads" className="flex h-14 items-center gap-3 rounded-[14px] bg-surface px-4 shadow-[inset_0_0_0_1px_#e2e8f0]">
        <DownloadIcon size={22} className="text-brand-strong" />
        <span className="flex-1 text-[15px] font-semibold text-ink">Mes leçons hors ligne</span>
        <span className="text-[13px] text-muted">{offlineCount}</span>
        <ChevronRightIcon size={16} strokeWidth={2.4} className="text-muted" />
      </Link>
    </div>
  );
}
