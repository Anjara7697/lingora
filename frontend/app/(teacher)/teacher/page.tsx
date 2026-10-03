"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ChevronRightIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { Avatar, StudentStatusPill } from "@/features/teacher/StatusPill";
import { getDashboard, listStudents } from "@/lib/api/teacher";
import { STATUS_LABEL } from "@/lib/labels";
import { timeAgo } from "@/lib/time";
import type { Role } from "@/types/api";
import type { Dashboard, StudentRow, StudentStatus } from "@/types/teacher";

const STAFF: Role[] = ["TEACHER", "ADMIN"];
const ORDER: StudentStatus[] = ["ON_TRACK", "NEW", "LOW_ACTIVITY", "SPEAKING_DIFFICULTY", "INACTIVE"];

export default function TeacherDashboard() {
  const allowed = useRequireRole(STAFF);
  const { user } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    getDashboard()
      .then((d) => {
        setDash(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [allowed, attempt]);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(() => {
      listStudents(search.trim(), status)
        .then((r) => {
          setRows(r);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }, 250); // petite attente pendant la frappe
    return () => clearTimeout(t);
  }, [allowed, search, status, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (!allowed) return null;
  if (failed && (!dash || !rows)) return <ErrorState title="Liste indisponible" onRetry={retry} />;

  const attention = dash?.needs_attention.length ?? 0;
  const clear = () => {
    setSearch("");
    setStatus(null);
  };

  return (
    <>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Mes élèves</h1>
      <p className="mt-1 text-[15px] text-ink-2">
        {user ? `Bonjour ${user.first_name}. ` : ""}
        {dash ? (attention > 0 ? `${attention} élève${attention > 1 ? "s demandent" : " demande"} votre attention.` : "Aucun élève ne demande votre attention.") : ""}
      </p>

      {!dash ? (
        <div className="mt-5 grid grid-cols-3 gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Chiffres clés">
          <Kpi label="Élèves" value={dash.total_students} />
          <Kpi label="Actifs sur 7 jours" value={dash.active_students} sub={`sur ${dash.total_students}`} />
          <div className="rounded-lg bg-surface p-4 shadow-card">
            <p className="text-[13px] font-semibold text-muted">Progression moyenne</p>
            <p className="font-display text-[28px] font-bold text-ink">{dash.average_progress === null ? "—" : `${Math.round(dash.average_progress)} %`}</p>
            <ProgressBar value={dash.average_progress ?? 0} />
          </div>
        </section>
      )}

      {dash && attention > 0 && (
        <section className="mt-5 rounded-lg bg-ink-tint p-4" aria-label="À suivre">
          <h2 className="font-display text-lg font-bold text-ink">À suivre</h2>
          <ul className="mt-2 grid gap-1.5">
            {dash.needs_attention.map((s) => (
              <li key={s.id}>
                <Link href={`/teacher/students/${s.id}`} className="flex min-h-12 items-center gap-3 rounded-md bg-surface px-3 py-2">
                  <Avatar first={s.first_name} last={s.last_name} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                    {s.first_name} {s.last_name}
                  </span>
                  <StudentStatusPill status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="relative mt-5">
        <SearchIcon size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un élève (nom, email)"
          aria-label="Rechercher un élève"
          className="h-12 w-full rounded-md bg-surface pl-11 pr-3.5 text-base text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] outline-none placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5]"
        />
      </div>

      {dash && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
          <Chip active={status === null} onClick={() => setStatus(null)}>
            Tous ({dash.total_students})
          </Chip>
          {ORDER.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? null : s)}>
              {STATUS_LABEL[s]} ({dash.status_counts[s] ?? 0})
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4">
        {!rows ? (
          <div className="grid gap-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          dash?.total_students === 0 ? (
            <EmptyState icon={<UserIcon size={28} />} title="Aucun élève pour le moment" action={<Link href="/admin/content" className="text-center text-[15px] font-semibold text-brand-strong underline">Préparer du contenu en attendant</Link>}>
              Un administrateur vous assigne vos élèves.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title={search ? `Aucun élève ne correspond à « ${search} »` : "Aucun élève dans ce statut"}
              action={
                <button type="button" onClick={clear} className="text-[15px] font-semibold text-brand-strong underline">
                  Effacer la recherche et les filtres
                </button>
              }
            />
          )
        ) : (
          <>
            {/* bureau : tableau */}
            <div className="hidden overflow-hidden rounded-lg bg-surface shadow-card md:block">
              <table className="w-full text-left text-[15px]">
                <thead className="text-[12px] uppercase tracking-wide text-muted">
                  <tr className="h-10">
                    <th className="pl-4 font-semibold">Élève</th>
                    <th className="font-semibold">Statut</th>
                    <th className="font-semibold">Niveau</th>
                    <th className="font-semibold">Oral</th>
                    <th className="font-semibold">Progression</th>
                    <th className="font-semibold">Activité</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="relative h-16 border-t border-line hover:bg-canvas">
                      <td className="pl-4">
                        <Link href={`/teacher/students/${s.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                          <Avatar first={s.first_name} last={s.last_name} />
                          <span className="font-semibold text-ink">
                            {s.first_name} {s.last_name}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <StudentStatusPill status={s.status} />
                      </td>
                      <td className="text-ink-2">{s.level ?? "—"}</td>
                      <td className="tabular-nums text-ink-2">{s.speaking_score === null ? "—" : Math.round(s.speaking_score)}</td>
                      <td className="w-36 pr-4">
                        <ProgressBar value={s.progress ?? 0} />
                      </td>
                      <td className="text-ink-2">{timeAgo(s.last_activity_at)}</td>
                      <td className="text-muted">
                        <ChevronRightIcon size={18} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* mobile : cartes */}
            <ul className="grid gap-2.5 md:hidden">
              {rows.map((s) => (
                <li key={s.id}>
                  <Link href={`/teacher/students/${s.id}`} className="flex flex-col gap-2.5 rounded-lg bg-surface p-4 shadow-card">
                    <span className="flex items-center gap-3">
                      <Avatar first={s.first_name} last={s.last_name} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                        {s.first_name} {s.last_name}
                      </span>
                      <StudentStatusPill status={s.status} />
                    </span>
                    <span className="text-[13px] text-muted">
                      {s.level ?? "Niveau non évalué"}
                      {s.speaking_score !== null ? ` · oral ${Math.round(s.speaking_score)}` : ""} · {timeAgo(s.last_activity_at)}
                    </span>
                    <ProgressBar value={s.progress ?? 0} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="font-display text-[28px] font-bold text-ink">
        {value}
        {sub && <span className="ml-2 font-sans text-sm font-normal text-muted">{sub}</span>}
      </p>
    </div>
  );
}

