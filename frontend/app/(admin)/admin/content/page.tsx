"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { BookIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ListSkeleton } from "@/features/admin/ui";
import { DIFFICULTY_LABEL, Field, Notice, StatusBadge, inputCls } from "@/features/cms/ui";
import { createProgram, errorMessages, listPrograms } from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsProgramItem, Difficulty } from "@/types/cms";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export default function ContentPage() {
  const allowed = useRequireRole(EDITORS);
  const [items, setItems] = useState<CmsProgramItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", difficulty: "BEGINNER" as Difficulty, description: "", weeks: "" });

  const load = useCallback(() => {
    listPrograms()
      .then((r) => {
        setItems(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Contenu</h1>
        <Button onClick={() => setOpen(true)} className="h-11 px-4">
          Nouveau programme
        </Button>
      </div>

      <div role="tablist" aria-label="Type de contenu" className="mt-4 flex gap-1 rounded-md bg-ink-tint p-1">
        <span role="tab" aria-selected className="flex h-10 flex-1 items-center justify-center rounded-[10px] bg-surface text-sm font-semibold text-ink shadow-card">
          Programmes{items ? ` · ${items.length}` : ""}
        </span>
        <Link role="tab" aria-selected={false} href="/admin/content/scenarios" className="flex h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold text-ink-2">
          Scénarios Speaking
        </Link>
      </div>
      <p className="mt-3 text-[13px] text-muted">Un programme reste en brouillon, invisible des élèves, jusqu&apos;à sa publication.</p>

      <div className="mt-4">
        {failed && !items ? (
          <ErrorState title="Contenu indisponible" onRetry={load} />
        ) : !items ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState icon={<BookIcon size={28} />} title="Aucun programme" action={<Button onClick={() => setOpen(true)}>Nouveau programme</Button>}>
            Créez votre premier programme : il restera en brouillon, invisible des élèves, jusqu&apos;à sa publication.
          </EmptyState>
        ) : (
          <ul className="grid gap-2.5">
            {items.map(({ program, course_count, lesson_count, enrolled_students }) => (
              <li key={program.id}>
                <Link href={`/admin/content/programs/${program.id}`} className="flex min-h-[72px] items-center gap-3 rounded-lg bg-surface p-4 shadow-card">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{program.name}</span>
                    <span className="block text-[13px] text-muted">
                      {plural(course_count, "cours", "cours")} · {plural(lesson_count, "leçon")} ·{" "}
                      {program.status === "ARCHIVED" && enrolled_students > 0 ? `historique conservé · ${plural(enrolled_students, "élève")}` : plural(enrolled_students, "inscrit")}
                    </span>
                  </span>
                  <StatusBadge status={program.status} />
                  <ChevronRightIcon size={18} className="flex-none text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} title="Nouveau programme" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <Notice kind="error" messages={errors} />
          <Field label="Nom du programme">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={200} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Niveau">
              <select className={inputCls} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}>
                {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Durée en semaines (facultatif)">
              <input className={inputCls} type="number" min={1} max={104} value={form.weeks} onChange={(e) => setForm({ ...form, weeks: e.target.value })} />
            </Field>
          </div>
          <Field label="Description (facultatif)">
            <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Button type="submit" loading={busy} disabled={!form.name.trim()}>
            Créer le programme
          </Button>
        </form>
      </Dialog>
    </>
  );
}
