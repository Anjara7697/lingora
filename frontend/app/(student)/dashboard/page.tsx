"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { myEnrollments, nextStep } from "@/lib/api/learning";
import type { EnrollmentItem, NextStep } from "@/types/learning";

const SOON = [
  { title: "Test de niveau", text: "Découvrez votre niveau d'anglais (A1 → C2)." },
  { title: "Speaking Lab", text: "Pratiquez l'oral et recevez un feedback." },
];

export default function DashboardPage() {
  const allowed = useRequireAuth();
  const { user } = useAuth();
  const [next, setNext] = useState<NextStep | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[] | null>(null);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([nextStep(), myEnrollments()])
      .then(([n, e]) => {
        setNext(n);
        setEnrollments(e);
      })
      .catch(() => setEnrollments([]));
  }, [allowed]);

  if (!allowed || !user) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Bonjour {user.first_name} 👋</h1>
      <p className="mb-6 text-sm text-zinc-500">{user.email}</p>

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

      <section className="grid gap-3 sm:grid-cols-2">
        {SOON.map((item) => (
          <article key={item.title} className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="font-semibold text-zinc-900">{item.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{item.text}</p>
            <span className="mt-3 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              Bientôt
            </span>
          </article>
        ))}
      </section>
    </>
  );
}
