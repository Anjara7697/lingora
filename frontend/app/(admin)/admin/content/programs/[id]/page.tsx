"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { DIFFICULTY_LABEL, Field, MoveButtons, Notice, StatusBadge, inputCls, moved, smallBtn } from "@/features/cms/ui";
import { archive, createCourse, createLesson, errorMessages, getProgram, reorder, setPublished, updateProgram } from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsProgramDetail, Difficulty } from "@/types/cms";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];

export default function ProgramEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const allowed = useRequireRole(EDITORS);
  const [d, setD] = useState<CmsProgramDetail | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newLesson, setNewLesson] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    getProgram(id)
      .then((x) => {
        setD(x);
        setName(x.program.name);
        setDescription(x.program.description ?? "");
      })
      .catch((e) => setErrors(errorMessages(e)));
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

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (!d) return <Notice kind="error" messages={errors.length ? errors : ["Chargement…"]} />;
  const p = d.program;

  return (
    <>
      <Link href="/admin/content" className="text-sm text-indigo-600 hover:underline">← Programmes</Link>
      <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-zinc-900">{p.name}</h1>
        <StatusBadge status={p.status} />
      </div>
      <Notice kind="error" messages={errors} />
      <Notice kind="success" messages={ok} />
      {d.enrolled_students > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {d.enrolled_students} élève(s) suivent ce programme : dépublier ou archiver leur retire l&apos;accès, mais leur historique est conservé.
        </p>
      )}

      <section className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <Field label="Nom">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(() => updateProgram(id, { name, description }), "Programme enregistré.")} disabled={!name.trim()}>
            Enregistrer
          </Button>
          <button className={smallBtn} onClick={() => run(() => setPublished("programs", id, p.status !== "PUBLISHED"), p.status === "PUBLISHED" ? "Programme dépublié." : "Programme publié.")}>
            {p.status === "PUBLISHED" ? "Dépublier" : "Publier"}
          </button>
          <button
            className={`${smallBtn} text-red-700`}
            onClick={() => {
              if (window.confirm("Archiver ce programme ? Il disparaîtra pour tout le monde (l'historique des élèves est conservé).")) {
                run(async () => {
                  await archive("programs", id);
                  router.replace("/admin/content");
                }, undefined, false);
              }
            }}
          >
            Archiver
          </button>
        </div>
      </section>

      <h2 className="mb-2 font-semibold text-zinc-900">Cours et leçons</h2>
      {d.courses.map(({ course, lessons }, ci) => (
        <section key={course.id} className="mb-4 rounded-xl border border-zinc-200 bg-white p-4" aria-label={course.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900">{course.title}</h3>
              <StatusBadge status={course.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <MoveButtons index={ci} length={d.courses.length} onMove={(a, b) => run(() => reorder("programs/%/courses", id, moved(d.courses, a, b).map((c) => c.course.id)))} />
              <button className={smallBtn} onClick={() => run(() => setPublished("courses", course.id, course.status !== "PUBLISHED"))}>
                {course.status === "PUBLISHED" ? "Dépublier" : "Publier"}
              </button>
              <button className={`${smallBtn} text-red-700`} onClick={() => window.confirm(`Archiver le cours « ${course.title} » ?`) && run(() => archive("courses", course.id))}>
                Archiver
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500">{DIFFICULTY_LABEL[course.difficulty]}</p>

          <ol className="mt-3 grid gap-2">
            {lessons.map((l, li) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                <Link href={`/admin/content/lessons/${l.id}`} className="font-medium text-indigo-700 hover:underline">
                  {l.title}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{l.activity_count} exercice(s)</span>
                  <StatusBadge status={l.status} />
                  <MoveButtons index={li} length={lessons.length} onMove={(a, b) => run(() => reorder("courses/%/lessons", course.id, moved(lessons, a, b).map((x) => x.id)))} />
                </span>
              </li>
            ))}
          </ol>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const title = (newLesson[course.id] ?? "").trim();
              if (title) run(async () => { await createLesson(course.id, { title }); setNewLesson((n) => ({ ...n, [course.id]: "" })); }, "Leçon créée (brouillon).");
            }}
          >
            <input className={inputCls} placeholder="Titre de la nouvelle leçon" aria-label={`Nouvelle leçon dans ${course.title}`} value={newLesson[course.id] ?? ""} onChange={(e) => setNewLesson({ ...newLesson, [course.id]: e.target.value })} />
            <button className={smallBtn} type="submit">+ Leçon</button>
          </form>
        </section>
      ))}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newCourse.trim()) run(async () => { await createCourse(id, { title: newCourse, difficulty: p.difficulty as Difficulty }); setNewCourse(""); }, "Cours créé (brouillon).");
        }}
      >
        <input className={inputCls} placeholder="Titre du nouveau cours" aria-label="Nouveau cours" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} />
        <Button type="submit" disabled={!newCourse.trim()}>+ Cours</Button>
      </form>
    </>
  );
}
