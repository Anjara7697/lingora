"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ActivityEditor, TYPE_LABEL } from "@/features/cms/ActivityEditor";
import { Field, MoveButtons, Notice, StatusBadge, inputCls, moved, smallBtn } from "@/features/cms/ui";
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

const EDITORS: Role[] = ["ADMIN", "TEACHER"];
const CONTENT_TYPES: Record<CmsContent["type"], string> = {
  TEXT: "Texte",
  EXTERNAL_LINK: "Lien",
  IMAGE: "Image (URL)",
  AUDIO: "Audio (URL)",
  VIDEO: "Vidéo (URL)",
  DOCUMENT: "Document (URL)",
};

export default function LessonEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const allowed = useRequireRole(EDITORS);
  const [d, setD] = useState<CmsLessonDetail | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [newContent, setNewContent] = useState({ type: "TEXT" as CmsContent["type"], title: "", body: "", url: "" });

  const load = useCallback(() => {
    getLesson(id)
      .then((x) => {
        setD(x);
        setTitle(x.lesson.title);
        setDescription(x.lesson.description ?? "");
      })
      .catch((e) => setErrors(errorMessages(e)));
  }, [id]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function run(fn: () => Promise<unknown>, success?: string) {
    setErrors([]);
    setOk([]);
    try {
      await fn();
      if (success) setOk([success]);
      load();
    } catch (e) {
      setErrors(errorMessages(e));
    }
  }

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (!d) return <Notice kind="error" messages={errors.length ? errors : ["Chargement…"]} />;
  const { lesson } = d;
  const published = lesson.status === "PUBLISHED";

  return (
    <>
      <Link href={`/admin/content/programs/${d.program.id}`} className="text-sm text-indigo-600 hover:underline">
        ← {d.program.name} / {d.course.title}
      </Link>
      <div className="mb-3 mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-zinc-900">{lesson.title}</h1>
        <StatusBadge status={lesson.status} />
      </div>
      <Notice kind="error" messages={errors} />
      <Notice kind="success" messages={ok} />

      <section className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <Field label="Titre">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Objectif / description">
          <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(() => updateLesson(id, { title, description }), "Leçon enregistrée.")} disabled={!title.trim()}>
            Enregistrer
          </Button>
          <button className={smallBtn} onClick={() => run(() => setPublished("lessons", id, !published), published ? "Leçon dépubliée." : "Leçon publiée : elle est visible des élèves inscrits.")}>
            {published ? "Dépublier" : "Publier"}
          </button>
          <button
            className={`${smallBtn} text-red-700`}
            onClick={async () => {
              if (!window.confirm("Archiver cette leçon ?")) return;
              try {
                await archive("lessons", id);
                router.replace(`/admin/content/programs/${d.program.id}`);
              } catch (e) {
                setErrors(errorMessages(e));
              }
            }}
          >
            Archiver
          </button>
        </div>
      </section>

      <h2 className="mb-2 font-semibold text-zinc-900">Contenus (cours)</h2>
      <ul className="mb-3 grid gap-2">
        {d.contents.map(({ content: c }, i) => (
          <li key={c.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-900">
                  <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{CONTENT_TYPES[c.type]}</span>
                  {c.title}
                </p>
                {c.body && <p className="mt-1 whitespace-pre-line text-zinc-700">{c.body}</p>}
                {c.url && <p className="mt-1 break-all text-xs text-indigo-700">{c.url}</p>}
              </div>
              <span className="flex gap-2">
                <MoveButtons index={i} length={d.contents.length} onMove={(a, b) => run(() => reorder("lessons/%/contents", id, moved(d.contents, a, b).map((x) => x.content.id)))} />
                <button
                  className={smallBtn}
                  onClick={() => {
                    const body = c.type === "TEXT" ? window.prompt("Modifier le texte", c.body ?? "") : null;
                    if (c.type === "TEXT" && body !== null) run(() => updateContent(c.id, { body }), "Contenu modifié.");
                  }}
                  disabled={c.type !== "TEXT"}
                >
                  Modifier
                </button>
                <button className={`${smallBtn} text-red-700`} onClick={() => window.confirm("Supprimer ce contenu ?") && run(() => deleteContent(c.id))} aria-label="Supprimer le contenu">
                  ✕
                </button>
              </span>
            </div>
          </li>
        ))}
        {d.contents.length === 0 && <li className="text-sm text-zinc-500">Aucun contenu. Ajoutez une explication, un lien ou un média.</li>}
      </ul>
      <form
        className="mb-6 grid gap-2 rounded-xl border border-dashed border-zinc-300 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const { type, title: t, body, url } = newContent;
          run(async () => {
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
        <Button type="submit" disabled={newContent.type === "TEXT" ? !newContent.body.trim() : !newContent.url.trim()}>
          Ajouter le contenu
        </Button>
      </form>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Exercices ({d.activities.length})</h2>
        <Button onClick={() => setEditing("new")} disabled={editing === "new"}>+ Exercice</Button>
      </div>
      {editing === "new" && (
        <div className="mb-3">
          <ActivityEditor
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
          <li key={a.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
            {editing === a.id ? (
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">
                    {i + 1}. {a.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {TYPE_LABEL[a.type]} · {a.points} pt{a.points > 1 ? "s" : ""} · {a.attempts} tentative(s) d&apos;élèves
                  </p>
                </div>
                <span className="flex gap-2">
                  <MoveButtons index={i} length={d.activities.length} onMove={(x, y) => run(() => reorder("lessons/%/activities", id, moved(d.activities, x, y).map((z) => z.id)))} />
                  <button className={smallBtn} onClick={() => setEditing(a.id)}>Modifier</button>
                  <button className={`${smallBtn} text-red-700`} onClick={() => window.confirm("Supprimer cet exercice ? (l'historique des élèves est conservé)") && run(() => archive("activities", a.id))} aria-label={`Supprimer l'exercice ${a.title}`}>
                    ✕
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
        {d.activities.length === 0 && <li className="text-sm text-zinc-500">Aucun exercice : une leçon doit en avoir au moins un pour être publiée.</li>}
      </ol>
    </>
  );
}
