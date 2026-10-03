"use client";

import { useEffect, useState } from "react";

import { useRequireRole } from "@/features/auth/useRequireRole";
import { getAnalytics } from "@/lib/api/admin";
import type { Role } from "@/types/api";
import type { Analytics } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];

export default function AdminDashboard() {
  const allowed = useRequireRole(ADMIN);
  const [a, setA] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getAnalytics()
      .then(setA)
      .catch((e: Error) => setError(e.message));
  }, [allowed]);

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!a) return <p className="text-zinc-500">Chargement…</p>;

  const top = a.funnel[0]?.count || 1;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Statistiques</h1>

      <section className="my-4 rounded-2xl bg-indigo-600 p-5 text-white" aria-label="Indicateur principal">
        <p className="text-xs uppercase tracking-wide text-indigo-200">Indicateur principal</p>
        <p className="mt-1 text-4xl font-bold">{a.north_star.value}</p>
        <p className="text-sm text-indigo-100">
          élève(s) actif(s) avec une progression mesurable, sur {a.north_star.of_active_30d} actif(s) en 30 jours
        </p>
        <p className="mt-2 text-xs text-indigo-200">{a.definitions.north_star}</p>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Élèves" value={a.users.students} />
        <Kpi label="Enseignants" value={a.users.teachers} />
        <Kpi label="Nouveaux (7 j)" value={a.users.new_7d} />
        <Kpi label="Nouveaux (30 j)" value={a.users.new_30d} />
        <Kpi label="Actifs (7 j)" value={a.activity.active_7d} />
        <Kpi label="Actifs (30 j)" value={a.activity.active_30d} />
        <Kpi label="Leçons terminées" value={a.learning.lessons_completed} />
        <Kpi label="Exercices (7 j)" value={a.learning.exercises_7d} />
      </section>

      <h2 className="mb-2 font-semibold text-zinc-900">Parcours d&apos;activation</h2>
      <ol className="mb-5 grid gap-2">
        {a.funnel.map((f) => (
          <li key={f.key} className="text-sm">
            <div className="mb-1 flex justify-between text-zinc-700">
              <span>{f.label}</span>
              <span className="font-medium">
                {f.count} <span className="text-zinc-500">({pct(f.count, top)} %)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct(f.count, top)}%` }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="mb-5 text-xs text-zinc-500">{a.definitions.funnel}</p>

      <h2 className="mb-2 font-semibold text-zinc-900">Oral (30 jours)</h2>
      <section className="mb-5 grid grid-cols-3 gap-3">
        <Kpi label="Tentatives" value={a.speaking.attempts_30d} />
        <Kpi label="Score moyen" value={a.speaking.average_score_30d ?? "—"} />
        <Kpi label="Appels IA" value={a.speaking.ai_calls_30d} />
      </section>

      <h2 className="mb-2 font-semibold text-zinc-900">14 derniers jours</h2>
      <Bars title="Nouveaux élèves" values={a.series.map((s) => s.new_students)} dates={a.series.map((s) => s.date)} />
      <Bars title="Exercices réalisés" values={a.series.map((s) => s.exercises)} dates={a.series.map((s) => s.date)} />
      <Bars title="Tentatives d'oral" values={a.series.map((s) => s.speaking_attempts)} dates={a.series.map((s) => s.date)} />
      <p className="mt-4 text-xs text-zinc-500">
        Données calculées à la demande ({new Date(a.generated_at).toLocaleString("fr-FR")}). {a.definitions.active}
      </p>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
      <p className="text-2xl font-bold text-indigo-600">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function Bars({ title, values, dates }: { title: string; values: number[]; dates: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <figure className="mb-4 rounded-xl border border-zinc-200 bg-white p-3">
      <figcaption className="mb-2 flex justify-between text-sm text-zinc-700">
        <span>{title}</span>
        <span className="text-zinc-500">total {values.reduce((x, y) => x + y, 0)}</span>
      </figcaption>
      <div className="flex h-16 items-end gap-1" role="img" aria-label={`${title} : ${values.join(", ")}`}>
        {values.map((v, i) => (
          <div
            key={dates[i]}
            title={`${dates[i]} : ${v}`}
            className="flex-1 rounded-t bg-indigo-500"
            style={{ height: `${Math.max(v ? 8 : 2, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }}
          />
        ))}
      </div>
    </figure>
  );
}
