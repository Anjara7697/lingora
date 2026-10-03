"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, DownloadIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { enroll, getProgram } from "@/lib/api/learning";
import { getSavedProgram, listSavedLessons, offlineSupported, saveProgram } from "@/lib/offline/db";
import { downloadProgram } from "@/lib/offline/download";
import { useOnline } from "@/lib/useOnline";
import type { ProgramDetail, ProgressStatus } from "@/types/learning";

const row = "flex min-h-16 items-center gap-3 px-3.5 py-2.5";

function Marker({ status, n }: { status: ProgressStatus | null; n: number }) {
  const base = "flex h-7 w-7 flex-none items-center justify-center rounded-full";
  if (status === "COMPLETED") return <span className={`${base} bg-brand-strong text-white`}><CheckIcon size={16} strokeWidth={3} /></span>;
  if (status === "IN_PROGRESS") return <span className={`${base} bg-brand-tint text-brand-strong`}><ClockIcon size={16} strokeWidth={2.2} /></span>;
  if (status === "LOCKED") return <span className={`${base} bg-slate-100 text-muted`}><LockIcon size={15} strokeWidth={2.2} /></span>;
  return <span className={`${base} text-[13px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1]`}>{n}</span>;
}

const LABEL: Record<ProgressStatus, string> = { COMPLETED: "Terminée", IN_PROGRESS: "En cours", AVAILABLE: "Disponible", LOCKED: "Verrouillée" };

export default function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const { status, user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const online = useOnline();
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [failure, setFailure] = useState<"notfound" | "network" | null>(null);
  const [fromDevice, setFromDevice] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const refreshSaved = useCallback(
    () => (userId ? listSavedLessons(userId).then((l) => setSaved(new Set(l.map((x) => x.id)))) : Promise.resolve()),
    [userId],
  );

  const load = useCallback(
    () =>
      getProgram(slug)
        .then((d) => {
          setDetail(d);
          setFromDevice(false);
          // garde à jour la copie hors ligne déjà téléchargée
          if (userId) void getSavedProgram(userId, slug).then((rec) => rec && saveProgram(userId, d));
        })
        .catch(async (e: Error) => {
          const network = e instanceof ApiError && e.status === 0;
          const copy = network && userId ? await getSavedProgram(userId, slug) : null;
          if (copy) {
            setDetail(copy.detail);
            setFromDevice(true);
          } else setFailure(network ? "network" : "notfound");
        }),
    [slug, userId],
  );

  useEffect(() => {
    if (status !== "loading") void load();
  }, [status, load]);
  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved, detail]);

  async function onDownload() {
    if (!userId || !detail) return;
    setProblem(null);
    setDone(null);
    setProgress([0, 1]);
    try {
      const n = await downloadProgram(userId, detail, (d, total) => setProgress([d, total]));
      setDone(n);
      await refreshSaved();
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  async function onEnroll() {
    if (status !== "authenticated") return router.push("/register");
    setEnrolling(true);
    try {
      await enroll(detail!.program.id);
      await load();
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  }

  const back = (
    <Link href="/programs" className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-[15px] font-semibold text-ink">
      <ChevronLeftIcon size={22} strokeWidth={2.2} /> Programmes
    </Link>
  );

  if (failure === "notfound") {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <EmptyState
          icon={<LockIcon size={28} />}
          title="Programme introuvable"
          action={
            <Link href="/programs" className={buttonClass("primary")}>
              Voir les programmes
            </Link>
          }
        >
          Il a peut-être été retiré, ou le serveur ne répond pas.
        </EmptyState>
      </div>
    );
  }
  if (failure === "network") {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <ErrorState
          offline={!online}
          onRetry={() => {
            setFailure(null);
            void load();
          }}
        />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
        {back}
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    );
  }

  const { program, courses, enrollment } = detail;
  const enrolled = !!enrollment;
  const downloading = progress !== null;

  return (
    <div className="flex flex-col gap-[18px]">
      {back}
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">{program.name}</h1>
        {program.description && <p className="text-[15px] leading-normal text-ink-2">{program.description}</p>}
      </header>

      {fromDevice && (
        <Notice tone="offline" title="Mode hors ligne.">
          Seules les leçons téléchargées sont disponibles.
        </Notice>
      )}
      {problem && <Notice tone="error">{problem}</Notice>}

      {enrolled ? (
        <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
          <ProgressBar value={Number(enrollment.progress_percentage)} label="Votre progression" />
          {offlineSupported() && !fromDevice && (
            <>
              <button
                type="button"
                onClick={onDownload}
                disabled={downloading}
                className="flex min-h-11 items-center gap-2 text-left text-[15px] font-semibold text-brand-strong disabled:opacity-70"
              >
                <DownloadIcon size={20} strokeWidth={2} className="flex-none" />
                {downloading ? `Téléchargement… ${progress[0]} / ${progress[1] > 1 ? progress[1] : "…"}` : "Télécharger les leçons pour hors ligne"}
              </button>
              {done !== null && (
                <Notice tone="success">
                  {done} leçon(s) téléchargée(s). Elles s&apos;ouvrent maintenant sans connexion.
                </Notice>
              )}
            </>
          )}
        </section>
      ) : (
        <Button onClick={onEnroll} loading={enrolling}>
          {status === "authenticated" ? "Commencer ce programme" : "Créer un compte pour commencer"}
        </Button>
      )}

      {courses.map(({ course, lessons }, ci) => (
        <section key={course.id} className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Cours {ci + 1}</p>
            <h2 className="font-display text-lg font-bold text-ink">{course.title}</h2>
          </div>
          <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-card">
            {lessons.map(({ lesson, status: ls }, li) => {
              const onDevice = saved.has(lesson.id);
              const reachable = enrolled && ls !== "LOCKED" && (!fromDevice || onDevice);
              const meta = [lesson.estimated_minutes ? `${lesson.estimated_minutes} min` : null, enrolled ? LABEL[ls] : null].filter(Boolean).join(" · ");
              const body = (
                <>
                  <Marker status={enrolled ? ls : null} n={li + 1} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-[15px] font-semibold ${enrolled && ls === "LOCKED" ? "text-muted" : "text-ink"}`}>{lesson.title}</span>
                    <span className={`text-[13px] ${enrolled && ls === "IN_PROGRESS" ? "font-semibold text-brand-strong" : "text-muted"}`}>
                      {fromDevice ? (onDevice ? "Sur l'appareil" : "Non téléchargée") : meta}
                      {!fromDevice && onDevice && " · sur l'appareil"}
                    </span>
                  </span>
                  {reachable && <ChevronRightIcon size={16} strokeWidth={2.4} className="flex-none text-muted" />}
                </>
              );
              const tint = enrolled && ls === "IN_PROGRESS" ? "bg-[#f8fffe] shadow-[inset_3px_0_0_#14b8a6]" : "";
              return (
                <li key={lesson.id}>
                  {reachable ? (
                    <Link href={`/lessons/${lesson.id}`} className={`${row} ${tint}`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={`${row} ${fromDevice && !onDevice ? "opacity-60" : ""}`}>{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
