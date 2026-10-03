"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { assignStudents, getRoster, listTeachers, unassignStudent } from "@/lib/api/admin";
import type { Role } from "@/types/api";
import type { Roster, TeacherItem } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];

export default function TeachersPage() {
  const allowed = useRequireRole(ADMIN);
  const [teachers, setTeachers] = useState<TeacherItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadTeachers = useCallback(() => {
    listTeachers()
      .then(setTeachers)
      .catch((e: Error) => setMessage({ ok: false, text: e.message }));
  }, []);

  const loadRoster = useCallback(() => {
    if (!selected) return;
    getRoster(selected, search.trim())
      .then(setRoster)
      .catch((e: Error) => setMessage({ ok: false, text: e.message }));
  }, [selected, search]);

  useEffect(() => {
    if (allowed) loadTeachers();
  }, [allowed, loadTeachers]);

  useEffect(() => {
    if (!allowed || !selected) return;
    const t = setTimeout(loadRoster, 250);
    return () => clearTimeout(t);
  }, [allowed, selected, loadRoster]);

  async function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: success });
      setPicked(new Set());
      loadRoster();
      loadTeachers();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Enseignants et élèves</h1>
      <p className="mb-4 text-sm text-zinc-600">
        Un enseignant ne voit que les élèves qui lui sont assignés. Choisissez un enseignant pour gérer ses élèves.
      </p>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mb-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}
      {teachers?.length === 0 && (
        <p className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          Aucun enseignant. Créez-en un dans « Utilisateurs » (ou passez un compte en rôle Enseignant).
        </p>
      )}

      <div className="mb-5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Enseignants">
        {teachers?.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={selected === t.id}
            onClick={() => { setSelected(t.id); setPicked(new Set()); setSearch(""); setRoster(null); }}
            className={`rounded-xl border p-3 text-left transition ${selected === t.id ? "border-indigo-600 bg-indigo-50" : "border-zinc-200 bg-white hover:border-indigo-300"}`}
          >
            <p className="font-semibold text-zinc-900">{t.first_name} {t.last_name}</p>
            <p className="text-xs text-zinc-500">{t.email} · {t.student_count} élève(s)</p>
          </button>
        ))}
      </div>

      {roster && (
        <>
          <h2 className="mb-2 font-semibold text-zinc-900">Élèves de {roster.teacher.first_name} ({roster.assigned.length})</h2>
          {roster.assigned.length === 0 && <p className="mb-4 text-sm text-zinc-500">Aucun élève assigné.</p>}
          <ul className="mb-6 grid gap-2">
            {roster.assigned.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                <span>
                  {s.first_name} {s.last_name} <span className="text-xs text-zinc-500">{s.email}</span>
                </span>
                <button
                  onClick={() => run(() => unassignStudent(roster.teacher.id, s.id), `${s.first_name} retiré(e).`)}
                  className="text-red-600 hover:underline"
                  aria-label={`Retirer ${s.first_name} ${s.last_name}`}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>

          <h2 className="mb-2 font-semibold text-zinc-900">Ajouter des élèves</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève"
            aria-label="Rechercher un élève à ajouter"
            className="mb-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
          />
          {roster.available.length === 0 && <p className="text-sm text-zinc-500">Aucun élève disponible.</p>}
          <ul className="mb-3 grid gap-2">
            {roster.available.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                  <span>
                    {s.first_name} {s.last_name} <span className="text-xs text-zinc-500">{s.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            disabled={picked.size === 0}
            onClick={() => run(() => assignStudents(roster.teacher.id, [...picked]), `${picked.size} élève(s) assigné(s).`)}
          >
            Assigner la sélection ({picked.size})
          </Button>
        </>
      )}
    </>
  );
}
