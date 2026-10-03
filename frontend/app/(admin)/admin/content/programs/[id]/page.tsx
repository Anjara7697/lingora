"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ListSkeleton } from "@/features/admin/ui";
import { DIFFICULTY_LABEL, Field, MoveButtons, Notice, StatusBadge, dangerBtn, inputCls, moved, smallBtn, useConfirm } from "@/features/cms/ui";
import { archive, createCourse, createLesson, errorMessages, getProgram, reorder, setPublished, updateProgram } from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsProgramDetail, Difficulty } from "@/types/cms";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];

export default function ProgramEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const allowed = useRequireRole(EDITORS);
  const [d, setD] = useState<CmsProgramDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newLesson, setNewLesson] = useState<Record<string, string>>({});
  const { confirm, element } = useConfirm();

  const load = useCallback(() => {
    getProgram(id)
      .then((x) => {
        setD(x);
        setName(x.program.name);
        setDescription(x.program.description ?? "");
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function run(fn: () => Promise<unknown>, success?: string, reload = true) {
    setErrors([]);
    setOk([]);
    try {
      await fn();
      if (success) setOk([success]);
      if (reload) load();
    } catch (e) {
      setErrors(errorMessages(e));
    }
  }

  if (!allowed) return null;
  const back = (
    <Link href="/admin/content" className="mb-3 inline-flex h-10 items-center text-[15px] font-semibold text-brand-strong">
      Contenu
    </Link>
  );
  if (failed && !d) return <>{back}<ErrorState title="Programme indisponible" onRetry={load} /></>;
  if (!d) return <>{back}<ListSkeleton rows={4} /></>;
  const p = d.program;
  const published = p.status === "PUBLISHED";
  const lessons = d.courses.reduce((n, c) => n + c.lessons.length, 0);
  const students = d.enrolled_students;

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 flex flex-wrap items-center gap-1 text-[15px] font-semibold text-brand-strong">
        <Link href="/admin/content" className="inline-flex h-10 items-center">Contenu</Link>
        <ChevronRightIcon size={14} className="text-muted" />
        <span className="text-muted">Programmes</span>
        <ChevronRightIcon size={14} className="text-muted" />
        <span className="text-ink">{p.name}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">{p.name}</h1>
        <StatusBadge status={p.status} />
      </div>
      <p className="mt-1 text-[15px] text-ink-2">
        {DIFFICULTY_LABEL[p.difficulty]}
        {p.duration_weeks ? ` · ${p.duration_weeks} semaines` : ""} · {d.courses.length} cours · {lessons} leçons · {students} élève{students > 1 ? "s" : ""} inscrit{students > 1 ? "s" : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={smallBtn} onClick={() => setEditing(!editing)}>
          {editing ? "Fermer" : "Modifier"}
        </button>
        <button
          type="button"
          className={smallBtn}
          onClick={() =>
            published && students > 0
              ? confirm({
                  title: `Dépublier « ${p.name} » ?`,
                  body: `${students} élève${students > 1 ? "s inscrits perdront" : " inscrit perdra"} l'accès jusqu'à la republication. Leur progression est conservée.`,
                  confirmLabel: "Dépublier",
                  tone: "neutral",
                  run: () => run(() => setPublished("programs", id, false), "Programme dépublié."),
                })
              : run(() => setPublished("programs", id, !published), published ? "Programme dépublié." : "Programme publié.")
          }
        >
          {published ? "Dépublier" : "Publier"}
        </button>
        <button
          type="button"
          className={dangerBtn}
          onClick={() =>
            confirm({
              title: `Archiver « ${p.name} » ?`,
              body: `Il disparaît du catalogue et des élèves inscrits (${students} ici). L'historique est conservé ; il n'y a pas de suppression définitive.`,
              confirmLabel: "Archiver",
              tone: "danger",
              run: () =>
                run(async () => {
                  await archive("programs", id);
                  router.replace("/admin/content");
                }, undefined, false),
            })
          }
        >
          Archiver
        </button>
      </div>

      <div className="mt-4">
        <Notice kind="error" messages={errors} />
        <Notice kind="success" messages={ok} />
      </div>

      {editing && (
        <section className="mb-5 grid gap-3.5 rounded-lg bg-surface p-4 shadow-card">
          <Field label="Nom">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Button className="sm:w-fit" onClick={() => void run(() => updateProgram(id, { name, description }), "Programme enregistré.")} disabled={!name.trim()}>
            Enregistrer
          </Button>
        </section>
      )}

      {d.courses.length === 0 && <p className="mb-4 rounded-lg bg-surface p-4 text-[15px] text-muted shadow-card">Aucun cours. Ajoutez-en un ci-dessous.</p>}
      {d.courses.map(({ course, lessons: ls }, ci) => (
        <section key={course.id} className="mb-4 rounded-lg bg-surface p-4 shadow-card" aria-label={course.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Cours {ci + 1}</p>
              <h2 className="font-display text-lg font-bold text-ink">{course.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={course.status} />
              <MoveButtons index={ci} length={d.courses.length} onMove={(a, b) => void run(() => reorder("programs/%/courses", id, moved(d.courses, a, b).map((c) => c.course.id)))} />
              <button type="button" className={smallBtn} onClick={() => void run(() => setPublished("courses", course.id, course.status !== "PUBLISHED"))}>
                {course.status === "PUBLISHED" ? "Dépublier" : "Publier"}
              </button>
              <button
                type="button"
                className={dangerBtn}
                onClick={() =>
                  confirm({
                    title: `Archiver le cours « ${course.title} » ?`,
                    body: "Il disparaît du catalogue. L'historique des élèves est conservé.",
                    confirmLabel: "Archiver",
                    tone: "danger",
                    run: () => run(() => archive("courses", course.id)),
                  })
                }
              >
                Archiver
              </button>
            </div>
          </div>

          <ol className="mt-3 grid gap-2">
            {ls.map((l, li) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-canvas px-3 py-2.5">
                <Link href={`/admin/content/lessons/${l.id}`} className="min-w-0 flex-1 basis-48 font-semibold text-ink hover:underline">
                  {li + 1} · {l.title}
                  <span className="block text-[13px] font-normal text-muted">
                    {l.activity_count} exercice{l.activity_count > 1 ? "s" : ""}
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  <StatusBadge status={l.status} />
                  <MoveButtons index={li} length={ls.length} onMove={(a, b) => void run(() => reorder("courses/%/lessons", course.id, moved(ls, a, b).map((x) => x.id)))} />
                </span>
              </li>
            ))}
          </ol>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const title = (newLesson[course.id] ?? "").trim();
              if (title)
                void run(async () => {
                  await createLesson(course.id, { title });
                  setNewLesson((n) => ({ ...n, [course.id]: "" }));
                }, "Leçon créée (brouillon).");
            }}
          >
            <input className={inputCls} placeholder="Titre de la nouvelle leçon" aria-label={`Nouvelle leçon dans ${course.title}`} value={newLesson[course.id] ?? ""} onChange={(e) => setNewLesson({ ...newLesson, [course.id]: e.target.value })} />
            <button className={`${smallBtn} flex-none`} type="submit" disabled={!(newLesson[course.id] ?? "").trim()}>
              Ajouter une leçon
            </button>
          </form>
        </section>
      ))}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newCourse.trim())
            void run(async () => {
              await createCourse(id, { title: newCourse, difficulty: p.difficulty as Difficulty });
              setNewCourse("");
            }, "Cours créé (brouillon).");
        }}
      >
        <input className={inputCls} placeholder="Titre du nouveau cours" aria-label="Nouveau cours" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} />
        <Button type="submit" disabled={!newCourse.trim()} className="h-auto flex-none px-4">
          Ajouter un cours
        </Button>
      </form>

      <p className="mt-6 rounded-lg bg-ink-tint p-4 text-[13px] leading-[1.5] text-ink-2">
        <b className="font-semibold text-ink">Règles de publication.</b> Une leçon a besoin d&apos;au moins un exercice valide, un cours d&apos;au moins une leçon publiée, et un programme d&apos;au moins un cours publié. Dépublier est toujours possible : les élèves perdent l&apos;accès, pas leur historique.
      </p>
      {element}
    </>
  );
}
