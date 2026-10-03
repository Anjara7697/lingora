"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { buttonClass } from "@/components/ui/Button";
import { CheckIcon, DownloadIcon, MicIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { useAuth } from "@/features/auth/AuthProvider";
import { listPrograms } from "@/lib/api/learning";
import { latestPlacementResult } from "@/lib/api/placement";
import { useOnline } from "@/lib/useOnline";
import type { ProgramListItem } from "@/types/learning";

const LEVEL: Record<string, string> = {
  BEGINNER: "Débutant",
  ELEMENTARY: "Élémentaire",
  INTERMEDIATE: "Intermédiaire",
  UPPER_INTERMEDIATE: "Intermédiaire sup.",
  ADVANCED: "Avancé",
};
const pill = "inline-flex h-[26px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold";

export default function ProgramsPage() {
  const { status } = useAuth();
  const online = useOnline();
  const [items, setItems] = useState<ProgramListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [recommended, setRecommended] = useState<string | null>(null);

  const load = useCallback(
    () =>
      listPrograms()
        .then(setItems)
        .catch(() => setFailed(true)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Le badge « Recommandé » vient du résultat du test de niveau (élève connecté seulement).
  useEffect(() => {
    if (status !== "authenticated") return;
    latestPlacementResult()
      .then((r) => setRecommended(r?.recommended_program_slug ?? null))
      .catch(() => {});
  }, [status]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Programmes</h1>

      {failed ? (
        <>
          {!online && <Notice tone="offline" title="Hors ligne.">Le catalogue n&apos;est pas disponible. Vos leçons téléchargées restent accessibles.</Notice>}
          <ErrorState
            title="Chargement impossible"
            offline={!online}
            onRetry={() => {
              setFailed(false);
              void load();
            }}
          />
          {status === "authenticated" && (
            <Link href="/downloads" className={buttonClass("secondary")}>
              <DownloadIcon size={20} /> Mes leçons hors ligne
            </Link>
          )}
        </>
      ) : !items ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MicIcon size={28} />}
          title="Aucun programme pour l'instant"
          action={
            <Link href="/speaking" className={buttonClass("primary")}>
              Aller au Speaking Lab
            </Link>
          }
        >
          De nouveaux programmes arrivent bientôt. En attendant, entraînez-vous dans le Speaking Lab.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map(({ program, course_count, lesson_count }) => {
            const isRecommended = program.slug === recommended;
            return (
              <li key={program.id}>
                <Link href={`/programs/${program.slug}`} className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-card">
                  {isRecommended && <span aria-hidden className="h-2 bg-brand" />}
                  <span className="flex flex-col gap-2.5 p-[18px]">
                    <span className="flex items-center justify-between gap-2.5">
                      <span className={`${pill} bg-ink-tint text-ink`}>{LEVEL[program.difficulty] ?? program.difficulty}</span>
                      {isRecommended && (
                        <span className={`${pill} bg-brand-tint text-brand-strong`}>
                          <CheckIcon size={13} strokeWidth={3} /> Recommandé
                        </span>
                      )}
                    </span>
                    <span className="font-display text-xl font-bold text-ink">{program.name}</span>
                    {program.description && <span className="text-[15px] leading-normal text-ink-2">{program.description}</span>}
                    <span className="flex gap-3.5 text-[13px] font-semibold text-muted">
                      {program.duration_weeks ? <span>{program.duration_weeks} semaines</span> : null}
                      <span>{course_count} cours</span>
                      <span>{lesson_count} leçons</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
