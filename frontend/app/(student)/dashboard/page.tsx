"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { myEnrollments, nextStep } from "@/lib/api/learning";
import { latestPlacementResult } from "@/lib/api/placement";
import { LEVEL_LABEL } from "@/lib/labels";
import type { Role } from "@/types/api";
import type { EnrollmentItem, NextStep } from "@/types/learning";
import type { PlacementResult } from "@/types/placement";

const STUDENT_ONLY: Role[] = ["STUDENT"];

export default function DashboardPage() {
  const allowed = useRequireRole(STUDENT_ONLY);
  const { user } = useAuth();
  const [next, setNext] = useState<NextStep | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[] | null>(null);
  const [placement, setPlacement] = useState<PlacementResult | null | undefined>(undefined);

  useEffect(() => {
    if (!allowed) return;
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
  }, [allowed]);

  if (!allowed || !user) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Bonjour {user.first_name} 👋</h1>
      <p className="mb-2 text-sm text-zinc-500">{user.email}</p>
      <Link href="/downloads" className="mb-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
        Mes leçons hors ligne
      </Link>

      {placement === null && (
        <section className="mb-6 rounded-xl border border-indigo-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Passez le test de niveau</h2>
          <p className="mt-1 text-sm text-zinc-600">25 questions, environ 10 minutes, pour estimer votre niveau.</p>
          <Link
            href="/placement"
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Commencer le test
          </Link>
        </section>
      )}
      {placement && (
        <Link
          href="/placement/result"
          className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-indigo-400"
        >
          <span>
            <span className="block text-xs uppercase tracking-wide text-zinc-500">Mon niveau</span>
            <span className="font-semibold text-zinc-900">{LEVEL_LABEL[placement.overall_level]}</span>
          </span>
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-lg font-bold text-white">{placement.overall_level}</span>
        </Link>
      )}

      {enrollments && enrollments.length === 0 && (
        <section className="mb-6 rounded-xl bg-indigo-50 p-5">
          <h2 className="font-semibold text-indigo-900">Commencez votre parcours</h2>
          <p className="mt-1 text-sm text-indigo-800">Choisissez un programme pour débuter l&apos;apprentissage.</p>
          <Link
            href="/programs"
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Voir les programmes
          </Link>
        </section>
      )}

      {next?.lesson && (
        <section className="mb-6 rounded-xl border border-indigo-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Continuer</p>
          <h2 className="text-lg font-semibold text-zinc-900">{next.lesson.title}</h2>
          <p className="mb-3 text-sm text-zinc-600">
            {next.program.name} — {next.course?.title}
          </p>
          <Link
            href={`/lessons/${next.lesson.id}`}
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Reprendre la leçon
          </Link>
        </section>
      )}
      {next && !next.lesson && (
        <p className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          🎉 Vous avez terminé toutes les leçons disponibles de {next.program.name} !
        </p>
      )}

      {enrollments && enrollments.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold text-zinc-900">Mes programmes</h2>
          <div className="grid gap-3">
            {enrollments.map(({ enrollment, program }) => (
              <Link
                key={enrollment.id}
                href={`/programs/${program.slug}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-indigo-400"
              >
                <p className="mb-2 font-medium text-zinc-900">{program.name}</p>
                <ProgressBar value={Number(enrollment.progress_percentage)} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link
        href="/speaking"
        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-indigo-400"
      >
        <span>
          <span className="block font-semibold text-zinc-900">🎙️ Speaking Lab</span>
          <span className="text-sm text-zinc-600">Pratiquez l&apos;oral et recevez un feedback.</span>
        </span>
        <span className="text-indigo-600">→</span>
      </Link>
    </>
  );
}
