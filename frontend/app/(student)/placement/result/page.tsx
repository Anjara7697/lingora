"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { LevelPill } from "@/components/ui/Pill";
import { ChevronLeftIcon, RefreshIcon, StarIcon, OfflineIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { ApiError } from "@/lib/api/client";
import { latestPlacementResult } from "@/lib/api/placement";
import { LEVEL_LABEL, SKILL_LABEL } from "@/lib/labels";
import { useOnline } from "@/lib/useOnline";
import type { PlacementResult } from "@/types/placement";

const card = "rounded-lg bg-surface shadow-card";

function BackLink() {
  return (
    <Link href="/dashboard" className="flex h-11 w-fit items-center gap-1 px-2 text-[15px] font-semibold">
      <ChevronLeftIcon size={22} strokeWidth={2.2} /> Accueil
    </Link>
  );
}

export default function PlacementResultPage() {
  const allowed = useRequireAuth();
  const online = useOnline();
  const [result, setResult] = useState<PlacementResult | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    () =>
      latestPlacementResult()
        .then(setResult)
        .catch((e) => {
          if (e instanceof ApiError && e.status !== 0) setResult(null);
          else setFailed(true);
        }),
    [],
  );

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col gap-4 px-5 pt-3">
        <Link href="/dashboard" className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-[15px] font-semibold text-ink">
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> Accueil
        </Link>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink-tint text-ink">
            <OfflineIcon size={28} />
          </span>
          {!online && <p className="text-sm font-semibold text-ink">Hors ligne.</p>}
          <h1 className="font-display text-[22px] font-bold text-ink">Résultat indisponible</h1>
          <p className="max-w-xs text-[15px] text-ink-2">Votre niveau est bien enregistré. Reconnectez-vous pour l&apos;afficher.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setFailed(false);
              void load();
            }}
          >
            <RefreshIcon size={18} strokeWidth={2} /> Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!allowed || result === undefined) {
    return (
      <div aria-busy="true" aria-label="Chargement">
        <div className="flex flex-col items-center gap-3 bg-ink px-6 pb-8 pt-16">
          <Skeleton className="h-[148px] w-[148px] rounded-full bg-white/15" />
          <Skeleton className="h-6 w-40 bg-white/15" />
        </div>
        <div className="flex flex-col gap-4 p-5">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="flex min-h-screen flex-col px-5 pt-3">
        <Link href="/dashboard" className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-[15px] font-semibold text-ink">
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> Accueil
        </Link>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-20 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-ink-tint font-display text-5xl font-bold text-ink">?</span>
          <h1 className="font-display text-[22px] font-bold text-ink">Pas encore de niveau</h1>
          <p className="max-w-xs text-[15px] text-ink-2">25 questions, environ 10 minutes, pour savoir par où commencer.</p>
          <Link href="/placement" className={buttonClass("primary", "mt-2")}>
            Passer le test
          </Link>
        </div>
      </div>
    );
  }

  const skillName = (code: string | null) => (code ? (SKILL_LABEL[code] ?? code) : "");
  const levelTone = (code: string) => (code === result.strongest ? "solid" : code === result.weakest ? "brand" : "ink");

  return (
    <>
      <div className="relative overflow-hidden bg-ink pb-8 text-white">
        <span aria-hidden className="absolute left-1/2 top-[70px] h-80 w-80 -translate-x-1/2 rounded-full bg-brand opacity-[0.12]" />
        <span aria-hidden className="absolute left-1/2 top-[110px] h-60 w-60 -translate-x-1/2 rounded-full bg-brand opacity-[0.14]" />
        <div className="relative px-2 pt-3">
          <BackLink />
        </div>
        <div className="relative flex flex-col items-center gap-2.5 px-6 pt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Votre niveau estimé</p>
          <div className="flex h-[148px] w-[148px] items-center justify-center rounded-full bg-white text-ink shadow-[0_0_0_8px_rgba(20,184,166,0.35)]">
            <span className="font-display text-[60px] font-bold leading-none tracking-[-0.03em]">{result.overall_level}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold">{LEVEL_LABEL[result.overall_level]}</h1>
          <p className="text-[15px] text-slate-300">Score global : {Math.round(Number(result.overall_score ?? 0))} %</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5 pb-10">
        <section className={`${card} flex flex-col gap-3.5 p-[18px]`} aria-label="Par compétence">
          <h2 className="font-sans text-base font-semibold tracking-normal text-ink">Par compétence</h2>
          {result.skills.map((s) => (
            <div key={s.code} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  {skillName(s.code)}
                  {s.code === result.strongest && <StarIcon size={16} className="text-brand-strong" />}
                </span>
                {s.level && <LevelPill level={s.level} tone={levelTone(s.code)} />}
              </div>
              <div
                role="progressbar"
                aria-label={skillName(s.code)}
                aria-valuenow={Math.round(Number(s.score))}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-line"
              >
                <div className={`h-full rounded-full ${s.code === result.weakest ? "bg-ink" : "bg-brand"}`} style={{ width: `${Number(s.score)}%` }} />
              </div>
            </div>
          ))}
        </section>

        {(result.strongest || result.weakest) && (
          <div className="grid grid-cols-2 gap-2.5">
            {result.strongest && (
              <div className="flex flex-col gap-1 rounded-[14px] bg-brand-tint p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-brand-strong">Point fort</p>
                <p className="text-[15px] font-semibold text-ink">{skillName(result.strongest)}</p>
              </div>
            )}
            {result.weakest && (
              <div className="flex flex-col gap-1 rounded-[14px] bg-ink-tint p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink">À travailler</p>
                <p className="text-[15px] font-semibold text-ink">{skillName(result.weakest)}</p>
              </div>
            )}
          </div>
        )}

        {result.recommended_program_slug && (
          <Link href={`/programs/${result.recommended_program_slug}`} className={buttonClass("primary")}>
            Voir le programme recommandé
          </Link>
        )}
        <Link href="/placement" className="flex h-11 items-center justify-center text-[15px] font-semibold text-brand-strong">
          Refaire le test
        </Link>
        <p className="px-2 text-center text-[13px] leading-normal text-muted">
          Estimation pédagogique (grammaire, vocabulaire, lecture). L&apos;oral est évalué dans le Speaking Lab.
        </p>
      </div>
    </>
  );
}
