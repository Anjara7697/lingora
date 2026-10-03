"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { enroll, getProgram } from "@/lib/api/learning";
import { getSavedProgram, offlineSupported, saveProgram } from "@/lib/offline/db";
import { downloadProgram } from "@/lib/offline/download";
import type { ProgramDetail, ProgressStatus } from "@/types/learning";

const STATUS_LABEL: Record<ProgressStatus, string> = {
  LOCKED: "Verrouillée",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée ✓",
};

export default function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const { status, user } = useAuth();
  const userId = user?.id;
  const [note, setNote] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const router = useRouter();
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(() => {
    getProgram(slug)
      .then((d) => {
        setDetail(d);
        // garde à jour la copie hors ligne déjà téléchargée
        if (userId) void getSavedProgram(userId, slug).then((rec) => rec && saveProgram(userId, d));
      })
      .catch(async (e: Error) => {
        const copy = e instanceof ApiError && e.status === 0 && userId ? await getSavedProgram(userId, slug) : null;
        if (copy) {
          setDetail(copy.detail);
          setNote("Mode hors ligne : seules les leçons téléchargées sont disponibles.");
        } else setError(e.message);
      });
  }, [slug, userId]);

  async function onDownload() {
    if (!userId || !detail) return;
    setDownloading("0");
    try {
      const n = await downloadProgram(userId, detail, (done, total) => setDownloading(`${done}/${total}`));
      setNote(`${n} leçon(s) téléchargée(s) : elles s'ouvrent maintenant sans connexion.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    if (status !== "loading") load();
  }, [status, load]);

  async function onEnroll() {
    if (status !== "authenticated") return router.push("/register");
    setEnrolling(true);
    try {
      await enroll(detail!.program.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  }

  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!detail) return <p className="text-zinc-500">Chargement…</p>;

  const { program, courses, enrollment } = detail;
  return (
    <>
      <Link href="/programs" className="text-sm text-indigo-600 hover:underline">
        ← Programmes
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">{program.name}</h1>
      <p className="mt-1 text-zinc-600">{program.description}</p>

      <div className="my-5">
        {enrollment ? (
          <ProgressBar value={Number(enrollment.progress_percentage)} label="Votre progression" />
        ) : (
          <Button onClick={onEnroll} disabled={enrolling}>
            {status === "authenticated" ? "Commencer ce programme" : "Créer un compte pour commencer"}
          </Button>
        )}
      </div>

      {note && <p role="status" className="mb-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">{note}</p>}
      {enrollment && offlineSupported() && !note?.startsWith("Mode hors ligne") && (
        <button type="button" onClick={onDownload} disabled={downloading !== null} className="mb-5 text-sm font-medium text-indigo-600 hover:underline disabled:opacity-60">
          {downloading !== null ? `Téléchargement… ${downloading}` : "⬇ Télécharger les leçons pour hors ligne"}
        </button>
      )}

      {courses.map(({ course, lessons }) => (
        <section key={course.id} className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900">{course.title}</h2>
          <p className="mb-3 text-sm text-zinc-600">{course.description}</p>
          <ol className="grid gap-2">
            {lessons.map(({ lesson, status: lessonStatus }) => {
              const body = (
                <>
                  <span className="font-medium text-zinc-900">{lesson.title}</span>
                  <span className="text-xs text-zinc-500">
                    {lesson.estimated_minutes ? `${lesson.estimated_minutes} min · ` : ""}
                    {enrollment ? STATUS_LABEL[lessonStatus] : ""}
                  </span>
                </>
              );
              const cls = "flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3";
              return (
                <li key={lesson.id}>
                  {enrollment ? (
                    <Link href={`/lessons/${lesson.id}`} className={`${cls} hover:border-indigo-400`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}
