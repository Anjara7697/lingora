"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { inputClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SearchIcon, UsersIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ListSkeleton } from "@/features/admin/ui";
import { Avatar } from "@/features/teacher/StatusPill";
import { ApiError } from "@/lib/api/client";
import { assignStudents, getRoster, listTeachers, unassignStudent } from "@/lib/api/admin";
import type { Role } from "@/types/api";
import type { Roster, StudentItem, TeacherItem } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];
type Tab = "group" | "add";
const countLabel = (n: number) => (n === 0 ? "0 élève" : `${n} élève${n > 1 ? "s" : ""}`);

export default function TeachersPage() {
  const allowed = useRequireRole(ADMIN);
  const [teachers, setTeachers] = useState<TeacherItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("group");
  const [showAll, setShowAll] = useState(false);
  const [removing, setRemoving] = useState<StudentItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTeachers = useCallback(() => {
    listTeachers()
      .then((r) => {
        setTeachers(r);
        setFailed(false);
        setSelected((cur) => cur ?? r[0]?.id ?? null);
      })
      .catch(() => setFailed(true));
  }, []);

  const loadRoster = useCallback(() => {
    if (!selected) return;
    getRoster(selected, search.trim())
      .then((r) => {
        setRoster(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
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
    setBusy(true);
    try {
      await fn();
      setMessage({ tone: "success", text: success });
      setPicked(new Set());
      loadRoster();
      loadTeachers();
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof ApiError && e.status < 500 ? e.message : "Le serveur ne répond pas. Réessayez." });
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  const choose = (id: string) => {
    setSelected(id);
    setPicked(new Set());
    setSearch("");
    setRoster(null);
    setShowAll(false);
    setMessage(null);
  };
  const retry = () => {
    setFailed(false);
    loadTeachers();
    loadRoster();
  };

  if (!allowed) return null;
  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };
  const current = teachers?.find((t) => t.id === selected);
  const shown = roster ? (showAll ? roster.assigned : roster.assigned.slice(0, 2)) : [];

  return (
    <>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Enseignants et élèves</h1>
      <p className="mt-1 text-[15px] text-ink-2">Un enseignant ne voit que les élèves de son groupe.</p>

      {message && (
        <Notice tone={message.tone} className="mt-4">
          {message.text}
        </Notice>
      )}

      {failed && !teachers ? (
        <ErrorState title="Groupe indisponible" onRetry={retry} />
      ) : !teachers ? (
        <div className="mt-5">
          <ListSkeleton />
        </div>
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={28} />}
          title="Aucun enseignant"
          action={
            <Link href="/admin/users" className="text-center text-[15px] font-semibold text-brand-strong underline">
              Aller aux utilisateurs
            </Link>
          }
        >
          Créez un compte Enseignant dans « Utilisateurs », ou changez le rôle d&apos;un compte existant.
        </EmptyState>
      ) : (
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
          {/* mobile : sélecteur ; bureau : liste */}
          <div className="md:hidden">
            <label htmlFor="teacher-select" className="mb-1.5 block text-sm font-semibold text-ink">
              Enseignant
            </label>
            <select id="teacher-select" value={selected ?? ""} onChange={(e) => choose(e.target.value)} className={inputClass}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} · {countLabel(t.student_count)}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden content-start gap-2 md:grid" role="radiogroup" aria-label="Enseignants">
            {teachers.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected === t.id}
                onClick={() => choose(t.id)}
                className={`flex items-center gap-3 rounded-lg p-3 text-left ${selected === t.id ? "bg-ink-tint shadow-[inset_0_0_0_2px_#172554]" : "bg-surface shadow-card"}`}
              >
                <Avatar first={t.first_name} last={t.last_name} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {t.first_name} {t.last_name}
                  </span>
                  <span className="text-[13px] text-muted">{t.student_count === 0 ? "0 élève · nouveau" : countLabel(t.student_count)}</span>
                </span>
              </button>
            ))}
          </div>

          <section className="min-w-0" aria-label={current ? `Groupe de ${current.first_name}` : "Groupe"}>
            {!roster ? (
              failed ? (
                <ErrorState title="Groupe indisponible" onRetry={retry} />
              ) : (
                <ListSkeleton rows={3} />
              )
            ) : (
              <>
                <div role="tablist" aria-label="Groupe" className="mb-4 flex gap-1 rounded-md bg-ink-tint p-1 md:hidden">
                  {(
                    [
                      ["group", `Groupe · ${roster.assigned.length}`],
                      ["add", "Ajouter"],
                    ] as [Tab, string][]
                  ).map(([t, label]) => (
                    <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-10 flex-1 rounded-[10px] text-sm font-semibold ${tab === t ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className={tab === "group" ? "" : "hidden md:block"}>
                  <h2 className="mb-1 font-display text-lg font-bold text-ink">
                    Groupe de {roster.teacher.first_name} · {roster.assigned.length}
                  </h2>
                  <p className="mb-3 text-[13px] text-muted">{roster.teacher.email}</p>
                  {roster.assigned.length === 0 ? (
                    <p className="rounded-lg bg-surface p-4 text-[15px] text-muted shadow-card">Aucun élève assigné. Ajoutez-en ci-dessous.</p>
                  ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
                      {shown.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-card">
                          <Avatar first={s.first_name} last={s.last_name} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-ink">
                              {s.first_name} {s.last_name}
                            </span>
                            <span className="block truncate text-[13px] text-muted">{s.email}</span>
                          </span>
                          <button type="button" onClick={() => setRemoving(s)} aria-label={`Retirer ${s.first_name} ${s.last_name}`} className="h-11 px-3 text-sm font-semibold text-danger underline">
                            Retirer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {roster.assigned.length > 2 && (
                    <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 h-11 text-[15px] font-semibold text-brand-strong underline">
                      {showAll ? "Réduire la liste" : `Afficher les ${roster.assigned.length - 2} autres`}
                    </button>
                  )}
                </div>

                <div className={`mt-6 ${tab === "add" ? "" : "hidden md:block"}`}>
                  <h2 className="mb-3 font-display text-lg font-bold text-ink">Ajouter des élèves</h2>
                  <div className="relative">
                    <SearchIcon size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève sans groupe" aria-label="Rechercher un élève à ajouter" className={`${inputClass} pl-11`} />
                  </div>
                  {roster.available.length === 0 ? (
                    <p className="mt-3 text-[15px] text-muted">{search ? "Aucun élève ne correspond." : "Tous les élèves ont déjà un enseignant."}</p>
                  ) : (
                    <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
                      {roster.available.map((s) => (
                        <li key={s.id}>
                          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg bg-surface p-3 shadow-card">
                            <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="h-5 w-5 accent-[#172554]" />
                            <Avatar first={s.first_name} last={s.last_name} size={32} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">
                                {s.first_name} {s.last_name}
                              </span>
                              <span className="block truncate text-[13px] text-muted">{s.email}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button className="mt-4 w-full sm:w-auto" disabled={picked.size === 0} loading={busy && picked.size > 0} onClick={() => void run(() => assignStudents(roster.teacher.id, [...picked]), `${picked.size} élève${picked.size > 1 ? "s assignés" : " assigné"} à ${roster.teacher.first_name}.`)}>
                    Assigner la sélection ({picked.size})
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <ConfirmSheet
        open={removing !== null}
        busy={busy}
        title={removing && roster ? `Retirer ${removing.first_name} du groupe de ${roster.teacher.first_name} ?` : ""}
        confirmLabel="Retirer du groupe"
        cancelLabel="Annuler"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && roster && void run(() => unassignStudent(roster.teacher.id, removing.id), `${removing.first_name} retiré(e) du groupe.`)}
      >
        {roster?.teacher.first_name} ne verra plus sa fiche ni ses sessions. Les retours déjà envoyés restent visibles pour {removing?.first_name}.
      </ConfirmSheet>
    </>
  );
}
