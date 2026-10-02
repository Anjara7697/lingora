"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listScenarios } from "@/lib/api/speaking";
import type { Scenario } from "@/types/speaking";

const LEVEL: Record<string, string> = {
  BEGINNER: "Débutant",
  ELEMENTARY: "Élémentaire",
  INTERMEDIATE: "Intermédiaire",
  UPPER_INTERMEDIATE: "Intermédiaire sup.",
  ADVANCED: "Avancé",
};

export default function SpeakingPage() {
  const [items, setItems] = useState<Scenario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScenarios()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Speaking Lab</h1>
      <p className="mb-5 text-zinc-600">
        Choisissez une situation, répondez à voix haute en anglais, puis recevez un feedback. Vous pouvez recommencer
        autant de fois que vous voulez.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!items && !error && <p className="text-zinc-500">Chargement…</p>}
      <div className="grid gap-3">
        {items?.map((s) => (
          <Link
            key={s.id}
            href={`/speaking/${s.slug}`}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-400"
          >
            <h2 className="font-semibold text-zinc-900">{s.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{s.description}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {LEVEL[s.difficulty] ?? s.difficulty}
              {s.estimated_minutes ? ` · ${s.estimated_minutes} min` : ""}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
