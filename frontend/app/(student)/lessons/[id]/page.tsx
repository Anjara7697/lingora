"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { ActivityCard } from "@/features/learning/ActivityCard";
import { ApiError } from "@/lib/api/client";
import { getLesson } from "@/lib/api/learning";
import { downloadLesson, refreshIfSaved } from "@/lib/offline/download";
import { getSavedLesson, offlineSupported, removeSavedLesson } from "@/lib/offline/db";
import type { LessonDetail, SubmitResult } from "@/types/learning";

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const allowed = useRequireAuth();
  const { status, user } = useAuth();
  const userId = user?.id;
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [fromDevice, setFromDevice] = useState(false); // leçon lue depuis l'appareil (hors ligne)
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    getLesson(id)
      .then((l) => {
        setLesson(l);
        void refreshIfSaved(userId, l);
        void getSavedLesson(userId, id).then((rec) => setSaved(!!rec));
      })
      .catch(async (e: Error) => {
        // Sans réseau : on ouvre la copie téléchargée, si elle existe.
        const copy = e instanceof ApiError && e.status === 0 ? await getSavedLesson(userId, id) : null;
        if (copy) {
          setLesson(copy.lesson);
          setFromDevice(true);
          setSaved(true);
        } else if (e instanceof ApiError && e.status === 0) {
          setError(new Error("Cette leçon n'est pas téléchargée. Reconnectez-vous à Internet, ou téléchargez-la la prochaine fois pour l'ouvrir sans réseau."));
        } else setError(e);
      });
  }, [id, status, userId]);

  // Le réseau est revenu : la leçon redevient la version du serveur.
  useEffect(() => {
    if (!fromDevice) return;
    const back = () => {
      setFromDevice(false);
      setLesson(null);
      setError(null);
      if (userId) getLesson(id).then(setLesson).catch((e: Error) => setError(e));
    };
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [fromDevice, id, userId]);

  async function toggleSaved() {
    if (!userId) return;
    setSaving(true);
    try {
      if (saved) {
        await removeSavedLesson(id);
        setSaved(false);
      } else {
        setLesson(await downloadLesson(userId, id));
        setSaved(true);
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  }

  const onResult = useCallback((activityId: string, result: SubmitResult) => {
    setLesson((cur) =>
      cur && {
        ...cur,
        progress: result.lesson_progress,
        activities: cur.activities.map((a) =>
          a.activity.id === activityId
            ? { ...a, mastered: a.mastered || result.is_correct === true || !result.graded }
            : a,
        ),
      },
    );
  }, []);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (error) {
    const notEnrolled = error instanceof ApiError && error.body.code === "NOT_ENROLLED";
    return (
      <div role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p>{error.message}</p>
        {notEnrolled && (
          <Link href="/programs" className="mt-2 inline-block font-medium text-indigo-600 hover:underline">
            Voir les programmes
          </Link>
        )}
      </div>
    );
  }
  if (!lesson) return <p className="text-zinc-500">Chargement…</p>;

  const pct = Number(lesson.progress?.progress_percentage ?? 0);
  const completed = lesson.progress?.status === "COMPLETED";

  return (
    <>
      <Link href={`/programs/${lesson.program.slug}`} className="text-sm text-indigo-600 hover:underline">
        ← {lesson.program.name}
      </Link>
      <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">{lesson.course.title}</p>
      <h1 className="text-2xl font-bold text-zinc-900">{lesson.lesson.title}</h1>
      {fromDevice && (
        <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Mode hors ligne : vos réponses seront corrigées dès que vous retrouverez Internet.
        </p>
      )}
      {offlineSupported() && !fromDevice && (
        <button
          type="button"
          onClick={toggleSaved}
          disabled={saving}
          className="mt-2 text-sm font-medium text-indigo-600 hover:underline disabled:opacity-60"
        >
          {saving ? "Téléchargement…" : saved ? "✓ Disponible hors ligne · Retirer" : "⬇ Télécharger pour hors ligne"}
        </button>
      )}
      <div className="my-4">
        <ProgressBar value={pct} label="Progression de la leçon" />
      </div>

      {lesson.contents.map((c) => (
        <section key={c.id} className="mb-4 rounded-xl bg-indigo-50 p-4">
          {c.title && <h2 className="mb-1 font-semibold text-indigo-900">{c.title}</h2>}
          <p className="whitespace-pre-line text-sm text-zinc-800">{c.body}</p>
        </section>
      ))}

      <h2 className="mb-3 mt-6 text-lg font-semibold text-zinc-900">Exercices</h2>
      <div className="grid gap-4">
        {lesson.activities.map((a) => (
          <ActivityCard key={a.activity.id} item={a} onResult={onResult} />
        ))}
      </div>

      {completed && (
        <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-900" role="status">
          <p className="font-semibold">🎉 Leçon terminée !</p>
          {lesson.next_lesson ? (
            <Link
              href={`/lessons/${lesson.next_lesson.id}`}
              className="mt-2 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Leçon suivante : {lesson.next_lesson.title}
            </Link>
          ) : (
            <Link href={`/programs/${lesson.program.slug}`} className="mt-2 inline-block font-medium text-indigo-700 hover:underline">
              Retour au programme
            </Link>
          )}
        </div>
      )}
    </>
  );
}
