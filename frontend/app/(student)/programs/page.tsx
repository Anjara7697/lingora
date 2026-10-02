"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listPrograms } from "@/lib/api/learning";
import type { ProgramListItem } from "@/types/learning";

export default function ProgramsPage() {
  const [items, setItems] = useState<ProgramListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPrograms()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-zinc-900">Programmes</h1>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!items && !error && <p className="text-zinc-500">Chargement…</p>}
      {items?.length === 0 && <p className="text-zinc-500">Aucun programme disponible pour le moment.</p>}
      <div className="grid gap-4">
        {items?.map(({ program, course_count, lesson_count }) => (
          <Link
            key={program.id}
            href={`/programs/${program.slug}`}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-indigo-400"
          >
            <h2 className="text-lg font-semibold text-zinc-900">{program.name}</h2>
            <p className="mt-1 text-sm text-zinc-600">{program.description}</p>
            <p className="mt-3 text-xs text-zinc-500">
              {program.duration_weeks ? `${program.duration_weeks} semaines · ` : ""}
              {course_count} cours · {lesson_count} leçons
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
