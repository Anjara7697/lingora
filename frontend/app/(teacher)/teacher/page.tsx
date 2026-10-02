"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { LEVEL_LABEL, STATUS_LABEL } from "@/lib/labels";
import { getDashboard, listStudents } from "@/lib/api/teacher";
import { timeAgo } from "@/lib/time";
import type { Role } from "@/types/api";
import type { Dashboard, StudentRow, StudentStatus } from "@/types/teacher";

const STAFF: Role[] = ["TEACHER", "ADMIN"];
const ORDER: StudentStatus[] = ["ON_TRACK", "NEW", "LOW_ACTIVITY", "SPEAKING_DIFFICULTY", "INACTIVE"];

export default function TeacherDashboard() {
  const allowed = useRequireRole(STAFF);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getDashboard()
      .then(setDash)
      .catch((e: Error) => setError(e.message));
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(() => {
      listStudents(search.trim(), status)
        .then(setRows)
        .catch((e: Error) => setError(e.message));
    }, 250); // petite attente pendant la frappe
    return () => clearTimeout(t);
  }, [allowed, search, status]);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Mes élèves</h1>
      {error && <p role="alert" className="my-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {dash && (
        <>
          <section className="my-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Élèves" value={dash.total_students} />
            <Stat label="Actifs (7 j)" value={dash.active_students} />
            <Stat label="Progression moy." value={dash.average_progress === null ? "—" : `${Math.round(dash.average_progress)} %`} />
          </section>

          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
            <Chip active={status === null} onClick={() => setStatus(null)}>
              Tous ({dash.total_students})
            </Chip>
            {ORDER.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? null : s)}>
                {STATUS_LABEL[s].label} ({dash.status_counts[s] ?? 0})
              </Chip>
            ))}
          </div>
        </>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un élève (nom, email)"
        aria-label="Rechercher un élève"
        className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
      />

      {rows && rows.length === 0 && (
        <p className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          {dash?.total_students === 0
            ? "Aucun élève ne vous est encore assigné. Un administrateur peut vous en assigner."
            : "Aucun élève ne correspond à cette recherche."}
        </p>
      )}
      <div className="grid gap-3">
        {rows?.map((s) => (
          <Link
            key={s.id}
            href={`/teacher/students/${s.id}`}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-400"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">
                  {s.first_name} {s.last_name}
                </p>
                <p className="text-xs text-zinc-500">{s.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABEL[s.status].cls}`}>
                {STATUS_LABEL[s.status].label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 items-center gap-3 text-xs text-zinc-500">
              <ProgressBar value={s.progress ?? 0} label="Progression" />
              <p className="text-right">
                {s.level ? `${s.level} · ${LEVEL_LABEL[s.level]}` : "Niveau non évalué"}
                <br />
                Dernière activité : {timeAgo(s.last_activity_at)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-2xl font-bold text-indigo-600">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}
