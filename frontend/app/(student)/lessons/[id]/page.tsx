"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { buttonClass } from "@/components/ui/Button";
import { BulbIcon, CheckIcon, ChevronLeftIcon, DownloadIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
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

  if (!allowed) return <p className="p-5 text-muted">Chargement…</p>;
  if (error) {
    const notEnrolled = error instanceof ApiError && error.body.code === "NOT_ENROLLED";
    return (
      <div className="flex flex-col gap-3 p-5">
        <Link href="/programs" className="inline-flex items-center gap-1 text-[15px] font-semibold text-ink">
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> Programmes
        </Link>
        <Notice tone="error">{error.message}</Notice>
        {notEnrolled && (
          <Link href="/programs" className={buttonClass("primary")}>
            Voir les programmes
          </Link>
        )}
      </div>
    );
  }
  if (!lesson) return <p className="p-5 text-muted">Chargement…</p>;

  const total = lesson.activities.length;
  const done = lesson.activities.filter((a) => a.mastered).length;
  const completed = lesson.progress?.status === "COMPLETED";

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col gap-2.5 border-b border-line bg-surface px-2 pb-3.5">
        <div className="flex h-[52px] items-center justify-between">
          <Link
            href={`/programs/${lesson.program.slug}`}
            className="flex h-11 items-center gap-1 px-2 text-[15px] font-semibold text-ink"
          >
            <ChevronLeftIcon size={22} strokeWidth={2.2} />
            {lesson.program.name}
          </Link>
          {offlineSupported() && !fromDevice && (
            <button
              type="button"
              onClick={toggleSaved}
              disabled={saving}
              aria-label={saved ? "Disponible hors ligne. Retirer cette leçon de l'appareil" : "Télécharger cette leçon pour l'utiliser hors ligne"}
              className={`mr-2 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold disabled:opacity-60 ${saved ? "bg-brand-tint text-brand-strong" : "text-brand-strong shadow-[inset_0_0_0_1.5px_#cbd5e1]"}`}
            >
              {saved ? <CheckIcon size={16} strokeWidth={2.4} /> : <DownloadIcon size={16} strokeWidth={2.2} />}
              {saving ? "Téléchargement…" : saved ? "Hors ligne" : "Télécharger"}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 px-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{lesson.course.title}</p>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">{lesson.lesson.title}</h1>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-2.5">
              <div
                role="progressbar"
                aria-label="Exercices réussis"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={total}
                className="grid flex-1 gap-1"
                style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
              >
                {lesson.activities.map((a) => (
                  <span key={a.activity.id} className={`h-1.5 rounded-full ${a.mastered ? "bg-brand" : "bg-line"}`} />
                ))}
              </div>
              <span className="text-[13px] font-semibold text-ink-2">
                {done} / {total}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 p-5 pb-10">
        {fromDevice && (
          <Notice tone="offline" title="Hors ligne.">
            Lecture seule : vos réponses seront corrigées dès que vous retrouverez Internet.
          </Notice>
        )}

        {lesson.contents.map((c) => (
          <section key={c.id} className="flex flex-col gap-2 rounded-lg bg-ink-tint px-[18px] py-4">
            <h2 className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal text-ink">
              <BulbIcon size={20} /> {c.title ?? "À retenir"}
            </h2>
            {c.body && <p className="whitespace-pre-line text-[15px] leading-[1.55] text-ink-2">{c.body}</p>}
          </section>
        ))}

        <h2 className="mt-1 font-display text-lg font-bold text-ink">Exercices</h2>
        {lesson.activities.map((a, i) => (
          <ActivityCard key={a.activity.id} item={a} index={i + 1} onResult={onResult} />
        ))}

        {completed && (
          <div className="flex flex-col gap-3 rounded-lg bg-brand-tint p-4 text-brand-strong" role="status">
            <p className="flex items-center gap-2 font-semibold">
              <CheckIcon size={20} strokeWidth={2.4} /> Leçon terminée, bravo !
            </p>
            {lesson.next_lesson ? (
              <Link href={`/lessons/${lesson.next_lesson.id}`} className={buttonClass("primary")}>
                Leçon suivante : {lesson.next_lesson.title}
              </Link>
            ) : (
              <Link href={`/programs/${lesson.program.slug}`} className={buttonClass("secondary")}>
                Retour au programme
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
