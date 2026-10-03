"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { DIFFICULTY_LABEL, Field, Notice, StatusBadge, inputCls } from "@/features/cms/ui";
import { createProgram, errorMessages, listPrograms } from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsProgramItem, Difficulty } from "@/types/cms";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];

export default function ContentPage() {
  const allowed = useRequireRole(EDITORS);
  const [items, setItems] = useState<CmsProgramItem[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", difficulty: "BEGINNER" as Difficulty, description: "", weeks: "" });

  const load = useCallback(() => {
    listPrograms()
      .then(setItems)
      .catch((e) => setErrors(errorMessages(e)));
  }, []);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    try {
      await createProgram({
        name: form.name,
        difficulty: form.difficulty,
        description: form.description || undefined,
        duration_weeks: form.weeks ? Number(form.weeks) : null,
      });
      setOpen(false);
      setForm({ name: "", difficulty: "BEGINNER", description: "", weeks: "" });
      load();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-zinc-900">Contenu pédagogique</h1>
        <Button onClick={() => setOpen(!open)}>{open ? "Fermer" : "Nouveau programme"}</Button>
      </div>
      <p className="mb-4 text-sm text-zinc-600">
        Les programmes restent en <b>brouillon</b> (invisibles pour les élèves) jusqu&apos;à leur publication.{" "}
        <Link href="/admin/content/scenarios" className="font-medium text-indigo-600 hover:underline">
          Gérer les situations d&apos;oral →
        </Link>
      </p>
      <Notice kind="error" messages={errors} />

      {open && (
        <form onSubmit={create} className="mb-4 grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <Field label="Nom du programme">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={200} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Niveau">
              <select className={inputCls} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}>
                {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
                ))}
              </select>
            </Field>
            <Field label="Durée (semaines, facultatif)">
              <input className={inputCls} type="number" min={1} max={104} value={form.weeks} onChange={(e) => setForm({ ...form, weeks: e.target.value })} />
            </Field>
          </div>
          <Field label="Description (facultatif)">
            <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Button type="submit" disabled={!form.name.trim()}>Créer le programme</Button>
        </form>
      )}

      {items?.length === 0 && <p className="text-sm text-zinc-500">Aucun programme. Créez le premier !</p>}
      <div className="grid gap-3">
        {items?.map(({ program, course_count, lesson_count, enrolled_students }) => (
          <Link key={program.id} href={`/admin/content/programs/${program.id}`} className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-400">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-zinc-900">{program.name}</h2>
              <StatusBadge status={program.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {DIFFICULTY_LABEL[program.difficulty]} · {course_count} cours · {lesson_count} leçons · {enrolled_students} élève(s) inscrit(s)
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
