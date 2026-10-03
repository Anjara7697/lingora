"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { BookIcon, ClockIcon, DownloadIcon, TrashIcon } from "@/components/ui/icons";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { clearOfflineData, listSavedLessons, pendingAnswers, removeSavedLesson } from "@/lib/offline/db";
import type { SavedLesson } from "@/lib/offline/db";
import { SYNCED_EVENT, type SyncReport, syncPending } from "@/lib/offline/sync";
import { useOnline } from "@/lib/useOnline";

const day = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function DownloadsPage() {
  const allowed = useRequireAuth();
  const { user } = useAuth();
  const online = useOnline();
  const userId = user?.id;
  const [lessons, setLessons] = useState<SavedLesson[] | null>(null);
  const [pending, setPending] = useState(0);
  const [synced, setSynced] = useState<SyncReport | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    void Promise.all([listSavedLessons(userId), pendingAnswers(userId)]).then(([l, p]) => {
      setLessons(l);
      setPending(p.length);
    });
  }, [userId]);

  useEffect(() => {
    load();
    const onSynced = (e: Event) => {
      setSynced((e as CustomEvent<SyncReport>).detail);
      load();
    };
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(SYNCED_EVENT, onSynced);
  }, [load]);

  if (!allowed || !lessons) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-[68px] w-full rounded-lg" />
        <Skeleton className="h-[68px] w-full rounded-lg" />
        <Skeleton className="h-[68px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Hors ligne</h1>
        <p className="text-[15px] leading-normal text-muted">
          Leçons enregistrées sur cet appareil. Les réponses données sans Internet sont corrigées à la reconnexion.
        </p>
      </header>

      {!online && (
        <Notice tone="offline" title="Hors ligne.">
          Vos leçons restent ouvertes.
        </Notice>
      )}
      {online && synced && pending === 0 && synced.synced > 0 && (
        <Notice tone="success" title="Tout est envoyé.">
          {synced.synced} réponse{synced.synced > 1 ? "s" : ""} corrigée{synced.synced > 1 ? "s" : ""}, progression à jour.
        </Notice>
      )}

      {pending > 0 && (
        <section className="flex flex-col gap-3 rounded-lg bg-ink-tint p-4" role="status">
          <p className="flex gap-2.5 text-[15px] font-semibold leading-[1.45] text-ink">
            <ClockIcon size={20} strokeWidth={2} className="mt-px flex-none" />
            {pending} réponse{pending > 1 ? "s" : ""} en attente d&apos;envoi
          </p>
          {online && userId ? (
            <Button
              loading={sending}
              onClick={async () => {
                setSending(true);
                await syncPending(userId);
                setSending(false);
                load();
              }}
            >
              Envoyer maintenant
            </Button>
          ) : (
            <p className="text-sm text-ink-2">Envoi automatique dès le retour du réseau.</p>
          )}
        </section>
      )}

      {lessons.length === 0 ? (
        <EmptyState
          icon={<DownloadIcon size={28} />}
          title="Aucune leçon téléchargée"
          action={
            <Link href="/programs" className={buttonClass("primary")}>
              Voir les programmes
            </Link>
          }
        >
          Ouvrez une leçon ou un programme, puis touchez « Télécharger pour hors ligne ».
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg bg-surface shadow-card">
          {lessons.map(({ lesson, savedAt, id }) => (
            <li key={id} className="flex min-h-[68px] items-center gap-3 py-2.5 pl-3.5 pr-1.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-tint text-brand-strong">
                <BookIcon size={20} />
              </span>
              <Link href={`/lessons/${id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold text-ink">{lesson.lesson.title}</span>
                <span className="text-[13px] text-muted">
                  {lesson.program.name} · le {day(savedAt)}
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Retirer « ${lesson.lesson.title} » de cet appareil`}
                className="flex h-11 w-11 flex-none items-center justify-center text-muted"
                onClick={async () => {
                  await removeSavedLesson(id);
                  load();
                }}
              >
                <TrashIcon size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lessons.length > 0 && pending === 0 && (
        <button type="button" className="flex h-11 items-center justify-center gap-2 text-sm font-semibold text-muted" onClick={() => setConfirmAll(true)}>
          <TrashIcon size={18} /> Tout supprimer de cet appareil
        </button>
      )}

      <ConfirmSheet
        open={confirmAll}
        title={`Supprimer ${lessons.length} leçon${lessons.length > 1 ? "s" : ""} ?`}
        confirmLabel="Supprimer de l'appareil"
        cancelLabel="Annuler"
        onCancel={() => setConfirmAll(false)}
        onConfirm={async () => {
          await clearOfflineData();
          setConfirmAll(false);
          load();
        }}
      >
        Elles ne seront plus disponibles sans Internet. Votre progression est conservée.
      </ConfirmSheet>
    </div>
  );
}
