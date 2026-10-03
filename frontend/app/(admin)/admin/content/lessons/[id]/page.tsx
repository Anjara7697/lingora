"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState } from "@/components/ui/States";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ListSkeleton, Tag } from "@/features/admin/ui";
import { ActivityEditor, TYPE_LABEL, TypePicker } from "@/features/cms/ActivityEditor";
import { Field, MoveButtons, Notice, StatusBadge, dangerBtn, inputCls, moved, smallBtn, useConfirm } from "@/features/cms/ui";
import {
  addContent,
  archive,
  createActivity,
  deleteContent,
  errorMessages,
  getLesson,
  reorder,
  setPublished,
  updateActivity,
  updateContent,
  updateLesson,
} from "@/lib/api/cms";
import type { Role } from "@/types/api";
import type { CmsContent, CmsLessonDetail } from "@/types/cms";
import type { ActivityType } from "@/types/learning";

const EDITORS: Role[] = ["ADMIN", "TEACHER"];
const CONTENT_TYPES: Record<CmsContent["type"], string> = {
  TEXT: "Texte",
  EXTERNAL_LINK: "Lien",
  IMAGE: "Image (URL)",
  AUDIO: "Audio (URL)",
  VIDEO: "Vidéo (URL)",
  DOCUMENT: "Document (URL)",
};

type Editing = { kind: "pick" } | { kind: "new"; type: ActivityType } | { kind: "edit"; id: string } | null;

export default function LessonEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const allowed = useRequireRole(EDITORS);
  const [d, setD] = useState<CmsLessonDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorTitle, setErrorTitle] = useState<string | undefined>();
  const [ok, setOk] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [editText, setEditText] = useState<{ id: string; body: string } | null>(null);
  const [newContent, setNewContent] = useState({ type: "TEXT" as CmsContent["type"], title: "", body: "", url: "" });
  const { confirm, element } = useConfirm();

  const load = useCallback(() => {
    getLesson(id)
      .then((x) => {
        setD(x);
        setTitle(x.lesson.title);
        setDescription(x.lesson.description ?? "");
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function run(fn: () => Promise<unknown>, success?: string, refusal?: string) {
    setErrors([]);
    setErrorTitle(undefined);
    setOk([]);
    try {
      await fn();
      if (success) setOk([success]);
      load();
    } catch (e) {
      setErrorTitle(refusal);
      setErrors(errorMessages(e));
    }
  }

  if (!allowed) return null;
  if (failed && !d) return <ErrorState title="Leçon indisponible" onRetry={load} />;
  if (!d) return <ListSkeleton rows={4} />;
  const { lesson } = d;
  const published = lesson.status === "PUBLISHED";

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 flex flex-wrap items-center gap-1 text-[15px] font-semibold">
        <Link href="/admin/content" className="inline-flex h-10 items-center text-brand-strong">Contenu</Link>
        <ChevronRightIcon size={14} className="text-muted" />
        <Link href={`/admin/content/programs/${d.program.id}`} className="text-brand-strong">{d.program.name}</Link>
        <ChevronRightIcon size={14} className="text-muted" />
        <span className="text-muted">{d.course.title}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">{lesson.title}</h1>
        <StatusBadge status={lesson.status} />
      </div>
      {lesson.description && <p className="mt-1 text-[15px] text-ink-2">{lesson.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={smallBtn} onClick={() => setEditingInfo(!editingInfo)}>
          {editingInfo ? "Fermer" : "Modifier"}
        </button>
        <Button
          variant={published ? "secondary" : "primary"}
          className="h-10 px-4 text-sm"
          onClick={() =>
            void run(() => setPublished("lessons", id, !published), published ? "Leçon dépubliée." : "Leçon publiée : elle est visible des élèves inscrits.", "Cette leçon ne peut pas encore être publiée.")
          }
        >
          {published ? "Dépublier" : "Publier la leçon"}
        </Button>
        <button
          type="button"
          className={dangerBtn}
          onClick={() =>
            confirm({
              title: `Archiver « ${lesson.title} » ?`,
              body: "Elle disparaît du catalogue. L'historique des élèves est conservé.",
              confirmLabel: "Archiver",
              tone: "danger",
              run: () =>
                run(async () => {
                  await archive("lessons", id);
                  router.replace(`/admin/content/programs/${d.program.id}`);
                }),
            })
          }
        >
          Archiver
        </button>
      </div>

      <div className="mt-4">
        <Notice kind="error" title={errorTitle} messages={errors} />
        <Notice kind="success" messages={ok} />
      </div>

      {editingInfo && (
        <section className="mb-5 grid gap-3.5 rounded-lg bg-surface p-4 shadow-card">
          <Field label="Titre">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Objectif / description">
            <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Button className="sm:w-fit" onClick={() => void run(() => updateLesson(id, { title, description }), "Leçon enregistrée.")} disabled={!title.trim()}>
            Enregistrer
          </Button>
        </section>
      )}

      <h2 className="mb-3 mt-2 font-display text-lg font-bold text-ink">Contenus · {d.contents.length}</h2>
      <ul className="mb-3 grid gap-2">
        {d.contents.map(({ content: c }, i) => (
          <li key={c.id} className="rounded-lg bg-surface p-3.5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 basis-56">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <Tag tone="tint">{CONTENT_TYPES[c.type]}</Tag>
                  {c.title}
                </p>
                {c.body && <p className="mt-1.5 whitespace-pre-line text-[15px] text-ink-2">{c.body}</p>}
                {c.url && <p className="mt-1.5 break-all text-[13px] text-brand-strong">{c.url}</p>}
              </div>
              <span className="flex flex-wrap items-center gap-2">
                <MoveButtons index={i} length={d.contents.length} onMove={(a, b) => void run(() => reorder("lessons/%/contents", id, moved(d.contents, a, b).map((x) => x.content.id)))} />
                <button type="button" className={smallBtn} disabled={c.type !== "TEXT"} onClick={() => setEditText({ id: c.id, body: c.body ?? "" })}>
                  Modifier
                </button>
                <button
                  type="button"
                  className={dangerBtn}
                  onClick={() =>
                    confirm({
                      title: "Supprimer ce contenu ?",
                      body: "Le contenu disparaît de la leçon.",
                      confirmLabel: "Supprimer",
                      tone: "danger",
                      run: () => run(() => deleteContent(c.id)),
                    })
                  }
                  aria-label="Supprimer le contenu"
                >
                  Supprimer
                </button>
              </span>
            </div>
          </li>
        ))}
        {d.contents.length === 0 && <li className="rounded-lg bg-surface p-4 text-[15px] text-muted shadow-card">Aucun contenu. Ajoutez une explication, un lien ou un média.</li>}
      </ul>

      <form
        className="mb-6 grid gap-2.5 rounded-lg bg-canvas p-3.5 shadow-[inset_0_0_0_1.5px_#cbd5e1]"
        onSubmit={(e) => {
          e.preventDefault();
          const { type, title: t, body, url } = newContent;
          void run(async () => {
            await addContent(id, { type, title: t || undefined, body: type === "TEXT" ? body : undefined, url: type === "TEXT" ? undefined : url });
            setNewContent((c) => ({ ...c, title: "", body: "", url: "" }));
          }, "Contenu ajouté.");
        }}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <select className={inputCls} aria-label="Type de contenu" value={newContent.type} onChange={(e) => setNewContent({ ...newContent, type: e.target.value as CmsContent["type"] })}>
            {(Object.keys(CONTENT_TYPES) as CmsContent["type"][]).map((t) => (
              <option key={t} value={t}>{CONTENT_TYPES[t]}</option>
            ))}
          </select>
          <input className={`${inputCls} sm:col-span-2`} placeholder="Titre (facultatif)" aria-label="Titre du contenu" value={newContent.title} onChange={(e) => setNewContent({ ...newContent, title: e.target.value })} />
        </div>
        {newContent.type === "TEXT" ? (
          <textarea className={inputCls} rows={3} placeholder="Texte de la leçon (une ligne par exemple, ex. : I am — je suis)" aria-label="Texte du contenu" value={newContent.body} onChange={(e) => setNewContent({ ...newContent, body: e.target.value })} />
        ) : (
          <input className={inputCls} placeholder="https://…" aria-label="Adresse du contenu" value={newContent.url} onChange={(e) => setNewContent({ ...newContent, url: e.target.value })} />
        )}
        <Button type="submit" className="sm:w-fit" disabled={newContent.type === "TEXT" ? !newContent.body.trim() : !newContent.url.trim()}>
          Ajouter le contenu
        </Button>
      </form>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">Exercices · {d.activities.length}</h2>
        <Button onClick={() => setEditing({ kind: "pick" })} disabled={editing !== null} className="h-11 px-4">
          Ajouter un exercice
        </Button>
      </div>
      {editing?.kind === "pick" && (
        <div className="mb-3">
          <TypePicker onPick={(type) => setEditing({ kind: "new", type })} onCancel={() => setEditing(null)} />
        </div>
      )}
      {editing?.kind === "new" && (
        <div className="mb-3">
          <ActivityEditor
            startType={editing.type}
            onCancel={() => setEditing(null)}
            onSave={async (payload) => {
              await createActivity(id, payload);
              setEditing(null);
              setOk(["Exercice ajouté."]);
              load();
            }}
          />
        </div>
      )}
      <ol className="grid gap-2">
        {d.activities.map((a, i) => (
          <li key={a.id}>
            {editing?.kind === "edit" && editing.id === a.id ? (
              <ActivityEditor
                initial={a}
                onCancel={() => setEditing(null)}
                onSave={async (payload) => {
                  await updateActivity(a.id, payload);
                  setEditing(null);
                  setOk(["Exercice enregistré."]);
                  load();
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3.5 shadow-card">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold text-ink">
                    {i + 1} · {a.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    <Tag tone="tint">{TYPE_LABEL[a.type]}</Tag>
                    {a.points} pt{a.points > 1 ? "s" : ""} · {a.attempts} tentative{a.attempts > 1 ? "s" : ""} d&apos;élèves
                  </p>
                </div>
                <span className="flex flex-wrap items-center gap-2">
                  <MoveButtons index={i} length={d.activities.length} onMove={(x, y) => void run(() => reorder("lessons/%/activities", id, moved(d.activities, x, y).map((z) => z.id)))} />
                  <button type="button" className={smallBtn} onClick={() => setEditing({ kind: "edit", id: a.id })} disabled={editing !== null}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className={dangerBtn}
                    aria-label={`Archiver l'exercice ${a.title}`}
                    onClick={() =>
                      confirm({
                        title: `Archiver « ${a.title} » ?`,
                        body: "L'exercice disparaît de la leçon. L'historique des élèves est conservé.",
                        confirmLabel: "Archiver l'exercice",
                        tone: "danger",
                        run: () => run(() => archive("activities", a.id)),
                      })
                    }
                  >
                    Archiver
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
        {d.activities.length === 0 && <li className="rounded-lg bg-surface p-4 text-[15px] text-muted shadow-card">Aucun exercice : une leçon doit en avoir au moins un pour être publiée.</li>}
      </ol>

      <Dialog open={editText !== null} title="Modifier le texte" onClose={() => setEditText(null)}>
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editText) return;
            const t = editText;
            setEditText(null);
            void run(() => updateContent(t.id, { body: t.body }), "Contenu modifié.");
          }}
        >
          <textarea className={inputCls} rows={6} value={editText?.body ?? ""} onChange={(e) => setEditText(editText && { ...editText, body: e.target.value })} aria-label="Texte du contenu" />
          <Button type="submit" disabled={!editText?.body.trim()}>
            Enregistrer
          </Button>
        </form>
      </Dialog>
      {element}
    </>
  );
}
