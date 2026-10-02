"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/features/auth/AuthProvider";
import { enroll, getProgram } from "@/lib/api/learning";
import type { ProgramDetail, ProgressStatus } from "@/types/learning";

const STATUS_LABEL: Record<ProgressStatus, string> = {
  LOCKED: "Verrouillée",
  AVAILABLE: "Disponible",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée ✓",
};

export default function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const { status } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(() => {
    getProgram(slug)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [slug]);

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
