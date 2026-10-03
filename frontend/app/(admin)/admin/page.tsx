"use client";

import { useCallback, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { getAnalytics } from "@/lib/api/admin";
import type { Analytics } from "@/types/admin";
import type { Role } from "@/types/api";

const ADMIN: Role[] = ["ADMIN"];
const nf = (n: number) => n.toLocaleString("fr-FR");
type Series = "exercises" | "speaking_attempts" | "new_students";
const SERIES: { key: Series; label: string; title: string }[] = [
  { key: "exercises", label: "Exercices", title: "Exercices réalisés" },
  { key: "speaking_attempts", label: "Oral", title: "Tentatives d'oral" },
  { key: "new_students", label: "Inscrits", title: "Nouveaux élèves" },
];

export default function AdminDashboard() {
  const allowed = useRequireRole(ADMIN);
  const [a, setA] = useState<Analytics | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [series, setSeries] = useState<Series>("exercises");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    getAnalytics()
      .then((r) => {
        setA(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [allowed, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (!allowed) return null;
  if (failed) return <ErrorState title="Statistiques indisponibles" onRetry={retry}>Le calcul n&apos;a pas abouti. Le serveur ne répond pas.</ErrorState>;
  if (!a)
    return (
      <>
        <h1 className="font-display text-[28px] font-bold text-ink">Statistiques</h1>
        <div className="mt-5 grid gap-3" aria-busy="true">
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      </>
    );

  const top = a.funnel[0]?.count || 0;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  // plus forte perte entre deux étapes consécutives de l'entonnoir
  let worst: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < a.funnel.length; i++) {
    const lost = a.funnel[i - 1].count - a.funnel[i].count;
    if (lost > 0 && (!worst || lost > worst.lost)) worst = { from: a.funnel[i - 1].label, to: a.funnel[i].label, lost };
  }
  const cur = SERIES.find((s) => s.key === series)!;
  const values = a.series.map((s) => s[series]);
  const max = Math.max(1, ...values);
  const total = values.reduce((x, y) => x + y, 0);
  const empty = a.north_star.value === 0;
  const dateLabel = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Statistiques</h1>
      <p className="mt-1 text-[13px] text-muted">Calculé le {new Date(a.generated_at).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>

      <section className="mt-5 rounded-lg bg-ink p-5 text-white" aria-label="Indicateur principal">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-white/70">Indicateur principal</p>
        <p className="mt-1 flex items-baseline gap-3">
          <span className="font-display text-5xl font-bold">{a.north_star.value}</span>
          {!empty && <span className="text-[15px] text-white/80">sur {nf(a.north_star.of_active_30d)} actifs en 30 jours</span>}
        </p>
        <p className="mt-1 text-[15px] font-semibold">élèves actifs avec une progression mesurable</p>
        {empty ? (
          <p className="mt-2 text-sm text-white/80">Pas encore d&apos;élève actif. Les chiffres apparaîtront dès les premières leçons.</p>
        ) : (
          <>
            <p className="mt-2 text-[13px] text-white/70">{a.definitions.north_star}</p>
            <p className="mt-3 text-[13px] text-white/80">Part des actifs · {pct(a.north_star.value, a.north_star.of_active_30d)} %</p>
          </>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Chiffres clés">
        <Kpi label="Élèves" value={nf(a.users.students)} />
        <Kpi label="Enseignants" value={nf(a.users.teachers)} />
        <Kpi label="Nouveaux · 7 j / 30 j" value={nf(a.users.new_7d)} sub={`/ ${nf(a.users.new_30d)}`} />
        <Kpi label="Actifs · 7 j / 30 j" value={nf(a.activity.active_7d)} sub={`/ ${nf(a.activity.active_30d)}`} />
        <Kpi label="Leçons terminées" value={nf(a.learning.lessons_completed)} />
        <Kpi label="Exercices · 7 j" value={nf(a.learning.exercises_7d)} />
        <Kpi label="Oral · tentatives 30 j" value={nf(a.speaking.attempts_30d)} />
        <Kpi label="Oral · score moyen" value={a.speaking.average_score_30d === null ? "—" : String(Math.round(a.speaking.average_score_30d))} sub={`· ${nf(a.speaking.ai_calls_30d)} appels IA`} />
      </section>

      <section className="mt-6" aria-label="Parcours d'activation">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Parcours d&apos;activation</h2>
        <ol className="grid gap-3 rounded-lg bg-surface p-4 shadow-card">
          {a.funnel.map((f, i) => {
            const n = i + 1;
            // sur mobile : 3 étapes clés tant qu'on n'a pas déplié
            const key = i === 0 || i === 2 || i === a.funnel.length - 1;
            return (
              <li key={f.key} className={showAll || key ? "" : "hidden sm:block"}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-ink">
                    {n} · {f.label}
                  </span>
                  <span className="tabular-nums text-ink-2">
                    {nf(f.count)} <span className="text-muted">{pct(f.count, top)} %</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct(f.count, top)}%` }} />
                </div>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setShowAll(!showAll)} className="h-10 text-sm font-semibold text-brand-strong underline sm:hidden">
              {showAll ? "Réduire" : `Voir les ${a.funnel.length} étapes`}
            </button>
          </li>
        </ol>
        {worst && (
          <p className="mt-2 text-[13px] text-ink-2">
            Plus forte perte : {worst.from.toLowerCase()} → {worst.to.toLowerCase()} (−{nf(worst.lost)}).
          </p>
        )}
        <p className="mt-1 text-xs text-muted">{a.definitions.funnel}</p>
      </section>

      <section className="mt-6" aria-label="14 derniers jours">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">14 derniers jours</h2>
        <div className="rounded-lg bg-surface p-4 shadow-card">
          <div role="tablist" aria-label="Série" className="flex gap-1 rounded-md bg-ink-tint p-1">
            {SERIES.map((s) => (
              <button
                key={s.key}
                role="tab"
                type="button"
                aria-selected={series === s.key}
                onClick={() => setSeries(s.key)}
                className={`h-10 flex-1 rounded-[10px] text-sm font-semibold ${series === s.key ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-3 flex justify-between text-sm">
            <span className="font-semibold text-ink">{cur.title}</span>
            <span className="tabular-nums text-ink-2">Total {nf(total)}</span>
          </p>
          <div className="mt-3 flex h-28 items-end gap-1.5" role="img" aria-label={`${cur.title} : ${values.join(", ")}`}>
            {values.map((v, i) => (
              <div
                key={a.series[i].date}
                title={`${dateLabel(a.series[i].date)} : ${v}`}
                className="flex-1 rounded-t bg-brand"
                style={{ height: `${Math.max(v ? 8 : 2, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted">
            <span>{dateLabel(a.series[0].date)}</span>
            <span>{dateLabel(a.series[Math.floor(a.series.length / 2)].date)}</span>
            <span>{dateLabel(a.series[a.series.length - 1].date)}</span>
          </div>
          {total === 0 && <p className="mt-3 text-[13px] text-muted">Aucune activité sur 14 jours.</p>}
        </div>
      </section>
      <p className="mt-4 text-xs text-muted">{a.definitions.active}</p>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-surface p-3.5 shadow-card">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="font-display text-[26px] font-bold text-ink">
        {value}
        {sub && <span className="ml-1.5 font-sans text-sm font-normal text-muted">{sub}</span>}
      </p>
    </div>
  );
}
