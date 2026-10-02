"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { LEVEL_LABEL, SKILL_LABEL } from "@/lib/labels";
import { latestPlacementResult } from "@/lib/api/placement";
import type { PlacementResult } from "@/types/placement";

export default function PlacementResultPage() {
  const allowed = useRequireAuth();
  const [result, setResult] = useState<PlacementResult | null | undefined>(undefined);

  useEffect(() => {
    if (!allowed) return;
    latestPlacementResult()
      .then(setResult)
      .catch(() => setResult(null));
  }, [allowed]);

  if (!allowed || result === undefined) return <p className="text-zinc-500">Chargement…</p>;
  if (result === null) {
    return (
      <>
        <p className="text-zinc-600">Vous n&apos;avez pas encore passé le test de niveau.</p>
        <Link href="/placement" className="mt-3 inline-block font-medium text-indigo-600 hover:underline">
          Passer le test
        </Link>
      </>
    );
  }

  const skillName = (code: string | null) => (code ? (SKILL_LABEL[code] ?? code) : "");

  return (
    <>
      <h1 className="text-xl font-semibold text-zinc-900">Votre niveau estimé</h1>
      <div className="my-4 rounded-2xl bg-indigo-600 p-6 text-center text-white">
        <p className="text-5xl font-bold">{result.overall_level}</p>
        <p className="mt-1 text-indigo-100">{LEVEL_LABEL[result.overall_level]}</p>
        <p className="mt-2 text-xs text-indigo-200">Score global : {Math.round(Number(result.overall_score ?? 0))} %</p>
      </div>

      <h2 className="mb-2 font-semibold text-zinc-900">Par compétence</h2>
      <div className="mb-5 grid gap-3">
        {result.skills.map((s) => (
          <div key={s.code} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-zinc-900">{skillName(s.code)}</span>
              {s.level && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">{s.level}</span>}
            </div>
            <ProgressBar value={Number(s.score)} />
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-2 text-sm">
        {result.strongest && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-green-900">
            <span className="font-semibold">Point fort :</span> {skillName(result.strongest)}
          </p>
        )}
        {result.weakest && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
            <span className="font-semibold">À améliorer :</span> {skillName(result.weakest)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {result.recommended_program_slug && (
          <Link
            href={`/programs/${result.recommended_program_slug}`}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Voir le programme recommandé
          </Link>
        )}
        <Link href="/placement" className="text-sm font-medium text-indigo-600 hover:underline">
          Refaire le test
        </Link>
      </div>
      <p className="mt-5 text-xs text-zinc-500">
        Estimation pédagogique basée sur ce test (grammaire, vocabulaire, lecture) ; l&apos;oral sera évalué avec le
        Speaking Lab. Ce n&apos;est pas une certification officielle.
      </p>
    </>
  );
}
