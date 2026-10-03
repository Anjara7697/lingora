"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { DIFFICULTY_LABEL, Field, Notice, inputCls, smallBtn } from "@/features/cms/ui";
import { createScenario, errorMessages, listScenarios, setPublished, updateScenario } from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsScenario, Difficulty } from "@/types/cms";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];
const EMPTY = { title: "", description: "", context: "", difficulty: "BEGINNER" as Difficulty, minutes: "" };

export default function ScenariosPage() {
  const allowed = useRequireRole(EDITORS);
  const [items, setItems] = useState<CmsScenario[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(() => {
    listScenarios()
      .then(setItems)
      .catch((e) => setErrors(errorMessages(e)));
  }, []);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  function edit(s: CmsScenario | null) {
    setEditing(s ? s.id : "new");
    setForm(s ? { title: s.title, description: s.description ?? "", context: s.context ?? "", difficulty: s.difficulty, minutes: s.estimated_minutes?.toString() ?? "" } : EMPTY);
    setErrors([]);
    setOk([]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    const body = { title: form.title, description: form.description || undefined, context: form.context, difficulty: form.difficulty, estimated_minutes: form.minutes ? Number(form.minutes) : null };
    try {
      if (editing === "new") await createScenario(body);
      else await updateScenario(editing as string, body);
      setOk([editing === "new" ? "Situation créée (brouillon)." : "Situation enregistrée."]);
      setEditing(null);
      load();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  async function toggle(s: CmsScenario) {
    setErrors([]);
    try {
      await setPublished("scenarios", s.id, !s.is_published);
      setOk([s.is_published ? "Situation dépubliée." : "Situation publiée : les élèves peuvent la pratiquer."]);
      load();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <Link href="/admin/content" className="text-sm text-indigo-600 hover:underline">← Contenu</Link>
      <div className="mb-3 mt-2 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-zinc-900">Situations d&apos;oral</h1>
        <Button onClick={() => edit(null)}>Nouvelle situation</Button>
      </div>
      <Notice kind="error" messages={errors} />
      <Notice kind="success" messages={ok} />

      {editing && (
        <form onSubmit={save} className="mb-4 grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4" aria-label="Formulaire de situation">
          <Field label="Titre (en français)">
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Description courte (en français)">
            <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Consigne en anglais" hint="Ce que l'élève lit avant de répondre à voix haute. Ex. : You are at a hotel. Ask about breakfast.">
            <textarea className={inputCls} rows={3} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} required minLength={10} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Niveau">
              <select className={inputCls} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}>
                {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
                ))}
              </select>
            </Field>
            <Field label="Durée estimée (minutes)">
              <input className={inputCls} type="number" min={1} max={60} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!form.title.trim() || form.context.trim().length < 10}>Enregistrer</Button>
            <button type="button" className={smallBtn} onClick={() => setEditing(null)}>Annuler</button>
          </div>
        </form>
      )}

      <ul className="grid gap-3">
        {items?.map((s) => (
          <li key={s.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{s.title}</p>
                <p className="text-xs text-zinc-500">{DIFFICULTY_LABEL[s.difficulty]}{s.estimated_minutes ? ` · ${s.estimated_minutes} min` : ""}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.is_published ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700"}`}>
                {s.is_published ? "Publié" : "Brouillon"}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-700">{s.context}</p>
            <div className="mt-3 flex gap-2">
              <button className={smallBtn} onClick={() => edit(s)}>Modifier</button>
              <button className={smallBtn} onClick={() => toggle(s)}>{s.is_published ? "Dépublier" : "Publier"}</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
