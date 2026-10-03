"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";
import { clearOfflineData, listSavedLessons, pendingAnswers, removeSavedLesson } from "@/lib/offline/db";
import type { SavedLesson } from "@/lib/offline/db";
import { SYNCED_EVENT, syncPending } from "@/lib/offline/sync";
import { formatDate } from "@/lib/time";

export default function DownloadsPage() {
  const allowed = useRequireAuth();
  const { user } = useAuth();
  const userId = user?.id;
  const [lessons, setLessons] = useState<SavedLesson[] | null>(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  const load = useCallback(() => {
    if (!userId) return;
    void Promise.all([listSavedLessons(userId), pendingAnswers(userId)]).then(([l, p]) => {
      setLessons(l);
      setPending(p.length);
    });
  }, [userId]);

  useEffect(() => {
    load();
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener(SYNCED_EVENT, load);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener(SYNCED_EVENT, load);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [load]);

  if (!allowed || !lessons) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Hors ligne</h1>
      <p className="mb-5 text-sm text-zinc-500">
        Leçons enregistrées sur cet appareil. Vos réponses données sans Internet sont corrigées à la reconnexion.
      </p>

      {pending > 0 && (
        <section className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900" role="status">
          <p>{pending} réponse(s) en attente d&apos;envoi.</p>
          {online && userId && (
            <Button className="mt-2" onClick={() => void syncPending(userId)}>
              Envoyer maintenant
            </Button>
          )}
        </section>
      )}

      {lessons.length === 0 ? (
        <p className="text-zinc-600">
          Aucune leçon téléchargée. Ouvrez une leçon ou un programme, puis choisissez « Télécharger pour hors ligne ».{" "}
          <Link href="/programs" className="text-indigo-600 hover:underline">
            Voir les programmes
          </Link>
        </p>
      ) : (
        <ul className="grid gap-2">
          {lessons.map(({ lesson, savedAt, id }) => (
            <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <Link href={`/lessons/${id}`} className="min-w-0">
                <span className="block truncate font-medium text-zinc-900">{lesson.lesson.title}</span>
                <span className="block text-xs text-zinc-500">
                  {lesson.program.name} · téléchargée le {formatDate(new Date(savedAt).toISOString())}
                </span>
              </Link>
              <button
                type="button"
                className="shrink-0 text-sm text-zinc-500 hover:text-red-700"
                onClick={async () => {
                  await removeSavedLesson(id);
                  load();
                }}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      {lessons.length > 0 && pending === 0 && (
        <button
          type="button"
          className="mt-5 text-sm text-zinc-600 underline hover:text-red-700"
          onClick={async () => {
            await clearOfflineData();
            load();
          }}
        >
          Tout supprimer de cet appareil
        </button>
      )}
    </>
  );
}
