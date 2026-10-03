"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { MicIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ListSkeleton, Tag } from "@/features/admin/ui";
import { DIFFICULTY_LABEL, Field, Notice, inputCls, smallBtn } from "@/features/cms/ui";
import { createScenario, errorMessages, listScenarios, setPublished, updateScenario } from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsScenario, Difficulty } from "@/types/cms";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];
const EMPTY = { title: "", description: "", context: "", difficulty: "BEGINNER" as Difficulty, minutes: "" };

export default function ScenariosPage() {
  const allowed = useRequireRole(EDITORS);
  const [items, setItems] = useState<CmsScenario[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listScenarios()
      .then((r) => {
        setItems(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
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
    setBusy(true);
    const body = { title: form.title, description: form.description || undefined, context: form.context, difficulty: form.difficulty, estimated_minutes: form.minutes ? Number(form.minutes) : null };
    try {
      if (editing === "new") await createScenario(body);
      else await updateScenario(editing as string, body);
      setOk([editing === "new" ? "Scénario créé (brouillon)." : "Scénario enregistré."]);
      setEditing(null);
      load();
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: CmsScenario) {
    setErrors([]);
    setOk([]);
    try {
      await setPublished("scenarios", s.id, !s.is_published);
      setOk([s.is_published ? "Scénario dépublié." : "Scénario publié : les élèves peuvent le pratiquer."]);
      load();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  if (!allowed) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Contenu</h1>
        <Button onClick={() => edit(null)} className="h-11 px-4">
          Nouveau scénario
        </Button>
      </div>

      <div role="tablist" aria-label="Type de contenu" className="mt-4 flex gap-1 rounded-md bg-ink-tint p-1">
        <Link role="tab" aria-selected={false} href="/admin/content" className="flex h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold text-ink-2">
          Programmes
        </Link>
        <span role="tab" aria-selected className="flex h-10 flex-1 items-center justify-center rounded-[10px] bg-surface text-sm font-semibold text-ink shadow-card">
          Scénarios Speaking{items ? ` · ${items.length}` : ""}
        </span>
      </div>

      <div className="mt-4">
        <Notice kind="error" messages={errors} />
        <Notice kind="success" messages={ok} />
        {failed && !items ? (
          <ErrorState title="Scénarios indisponibles" onRetry={load} />
        ) : !items ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState icon={<MicIcon size={28} />} title="Aucun scénario" action={<Button onClick={() => edit(null)}>Nouveau scénario</Button>}>
            Un scénario donne à l&apos;élève une situation à jouer à voix haute.
          </EmptyState>
        ) : (
          <ul className="grid gap-2.5">
            {items.map((s) => (
              <li key={s.id} className="rounded-lg bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-semibold text-ink">{s.title}</p>
                    <p className="text-[13px] text-muted">
                      Scénario · {DIFFICULTY_LABEL[s.difficulty]}
                      {s.estimated_minutes ? ` · ${s.estimated_minutes} min` : ""}
                    </p>
                  </div>
                  <Tag tone={s.is_published ? "brand" : "outline"}>{s.is_published ? "Publié" : "Brouillon"}</Tag>
                </div>
                <p className="mt-2 text-[15px] text-ink-2">{s.context}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className={smallBtn} onClick={() => edit(s)}>
                    Modifier
                  </button>
                  <button type="button" role="switch" aria-checked={s.is_published} onClick={() => void toggle(s)} className="inline-flex h-10 items-center gap-2.5 px-1 text-sm font-semibold text-ink">
                    <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${s.is_published ? "bg-brand-strong" : "bg-slate-300"}`}>
                      <span className={`h-5 w-5 rounded-full bg-white transition-transform ${s.is_published ? "translate-x-5" : ""}`} />
                    </span>
                    {s.is_published ? "Publié" : "Dépublié"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} title={editing === "new" ? "Nouveau scénario" : "Modifier le scénario"} onClose={() => setEditing(null)}>
        <form onSubmit={save} className="flex flex-col gap-3.5" aria-label="Formulaire de scénario">
          <Notice kind="error" messages={errors} />
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
          <Button type="submit" loading={busy} disabled={!form.title.trim() || form.context.trim().length < 10}>
            Enregistrer
          </Button>
        </form>
      </Dialog>
    </>
  );
}
