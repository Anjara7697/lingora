import { BulbIcon, CheckIcon } from "@/components/ui/icons";
import type { Analysis, Issue, SessionFeedback } from "@/types/speaking";

type DimKey = keyof Pick<Analysis, "grammar" | "vocabulary" | "fluency" | "relevance" | "pronunciation">;

const DIMENSIONS: { key: DimKey; label: string }[] = [
  { key: "grammar", label: "Grammaire" },
  { key: "vocabulary", label: "Vocabulaire" },
  { key: "fluency", label: "Fluidité" },
  { key: "relevance", label: "Pertinence" },
  { key: "pronunciation", label: "Prononciation" },
];

const KIND: Record<Issue["kind"], { label: string; cls: string }> = {
  ERROR: { label: "Erreur", cls: "bg-ink text-white" },
  SUGGESTION: { label: "Suggestion", cls: "bg-brand-tint text-brand-strong" },
  STYLE: { label: "Style", cls: "bg-ink-tint text-ink" },
};

const card = "rounded-lg bg-surface p-[18px] shadow-card";

/** Critère évalué le plus bas : c'est l'« axe prioritaire » (calculé ici, à partir de l'analyse reçue). */
export function weakestKey(analysis: Analysis): DimKey | null {
  const scored = DIMENSIONS.filter(({ key }) => analysis[key].score !== null);
  if (scored.length < 2) return null;
  return scored.reduce((low, d) => (analysis[d.key].score! < analysis[low.key].score! ? d : low)).key;
}

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="grid gap-2.5">
      {issues.map((i, n) => (
        <li key={n} className="flex flex-col gap-2 rounded-[14px] bg-surface p-3.5 shadow-[inset_0_0_0_1px_#e2e8f0]">
          <span className={`inline-flex h-6 items-center self-start rounded-full px-2 text-xs font-semibold ${KIND[i.kind].cls}`}>
            {KIND[i.kind].label}
          </span>
          {i.original && (
            <p className="text-[15px] leading-normal text-ink-2">
              <span className={i.suggestion && i.kind === "ERROR" ? "text-muted line-through" : "text-muted"}>« {i.original} »</span>
              {i.suggestion && (
                <>
                  {" "}
                  → <b className="font-semibold text-brand-strong">« {i.suggestion} »</b>
                </>
              )}
            </p>
          )}
          <p className="text-[13px] leading-[1.45] text-muted">{i.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

export function CriteriaCard({ analysis }: { analysis: Analysis }) {
  const weakest = weakestKey(analysis);
  return (
    <section className={`${card} flex flex-col gap-3.5`} aria-label="Résultat par critère">
      <h3 className="font-sans text-base font-semibold tracking-normal text-ink">Par critère</h3>
      {DIMENSIONS.map(({ key, label }) => {
        const d = analysis[key];
        if (d.score === null) {
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <p className="flex justify-between text-sm text-muted">
                <span className="font-semibold">{label}</span>
                <span>Non évaluée</span>
              </p>
              {d.note && <p className="text-xs text-muted">{d.note}</p>}
            </div>
          );
        }
        const priority = key === weakest;
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <p className="flex justify-between text-sm">
              <span className="font-semibold text-ink">{label}</span>
              <span className="tabular-nums text-ink-2">{Math.round(d.score)}</span>
            </p>
            <div
              role="progressbar"
              aria-label={label}
              aria-valuenow={Math.round(d.score)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-full bg-line"
            >
              <div className={`h-full rounded-full ${priority ? "bg-ink" : "bg-brand"}`} style={{ width: `${d.score}%` }} />
            </div>
            {priority && <p className="text-xs font-semibold text-ink">Axe prioritaire</p>}
            {d.note && <p className="text-xs text-muted">{d.note}</p>}
          </div>
        );
      })}
    </section>
  );
}

export function StrengthsCard({ strengths }: { strengths: string[] }) {
  if (!strengths.length) return null;
  return (
    <section className="flex flex-col gap-1.5 rounded-lg bg-brand-tint px-[18px] py-4">
      <h3 className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal text-brand-strong">
        <CheckIcon size={18} strokeWidth={2.4} /> Ce que vous avez bien fait
      </h3>
      <p className="text-sm leading-normal text-ink-2">{strengths.join(", ")}.</p>
    </section>
  );
}

export function TipBox({ text }: { text: string }) {
  return (
    <p className="flex gap-2.5 rounded-[14px] bg-ink-tint px-4 py-3.5 text-sm leading-normal text-ink">
      <BulbIcon size={20} className="mt-px flex-none" />
      <span>{text}</span>
    </p>
  );
}

/** Analyse complète d'une tentative (utilisée aussi par l'espace enseignant). */
export function AnalysisCard({ analysis, overall }: { analysis: Analysis; overall: number | null }) {
  const allIssues = DIMENSIONS.flatMap(({ key }) => analysis[key].issues);
  return (
    <div className="grid gap-4">
      {overall !== null && (
        <p className="text-center">
          <span className="font-display text-4xl font-bold text-ink">{Math.round(overall)}</span>
          <span className="text-muted"> / 100</span>
        </p>
      )}
      <CriteriaCard analysis={analysis} />
      <StrengthsCard strengths={analysis.strengths} />
      {allIssues.length > 0 && (
        <div className="grid gap-2.5">
          <h3 className="font-sans text-base font-semibold tracking-normal text-ink">Erreurs et suggestions · {allIssues.length}</h3>
          <IssueList issues={allIssues} />
        </div>
      )}
      {analysis.tips.map((t) => (
        <TipBox key={t} text={t} />
      ))}
    </div>
  );
}

/** Bandeau bleu nuit du feedback : score en anneau, formule d'encouragement et écart avec la première tentative. */
export function FeedbackHero({
  attempt,
  scenarioTitle,
  score,
  firstScore,
}: {
  attempt: number;
  scenarioTitle: string;
  score: number;
  firstScore: number | null;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const delta = firstScore !== null && attempt > 1 ? pct - Math.round(firstScore) : null;
  const headline =
    delta !== null && delta > 0 ? "Belle progression" : pct >= 75 ? "Très bonne réponse" : pct >= 50 ? "Un bon début" : "Un premier pas";
  const detail =
    delta === null
      ? "Réessayez pour mesurer votre progression."
      : delta > 0
        ? `+${delta} points par rapport à votre première tentative.`
        : delta === 0
          ? "Même score que votre première tentative : continuez !"
          : "Un peu en dessous de votre première tentative : réessayez, ça vient.";
  return (
    <div className="flex flex-col gap-5 bg-ink px-5 pb-7 pt-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Feedback · tentative {attempt}</p>
        <p className="truncate text-[13px] text-slate-300">{scenarioTitle}</p>
      </div>
      <div className="flex items-center gap-5">
        <div
          role="img"
          aria-label={`Score ${pct} sur 100`}
          className="flex h-28 w-28 flex-none items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#14b8a6 0 ${pct}%, rgba(255,255,255,.14) ${pct}% 100%)` }}
        >
          <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-ink">
            <span className="font-display text-[34px] font-bold leading-none">{pct}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xl font-bold leading-tight">{headline}</p>
          <p className="text-sm leading-[1.45] text-slate-300">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function SessionSummary({ feedback }: { feedback: SessionFeedback }) {
  const { first_attempt_score: first, last_attempt_score: last } = feedback;
  const improved = first !== null && last !== null && last > first;
  return (
    <section className="flex flex-col gap-2 rounded-lg bg-brand-tint p-5 text-ink-2" role="status">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
        <CheckIcon size={22} strokeWidth={2.4} className="text-brand-strong" /> Session terminée
      </h2>
      {first !== null && last !== null && feedback.attempts > 1 && (
        <p className="text-[15px]">
          Votre score est passé de <b className="text-ink">{Math.round(first)}</b> à <b className="text-ink">{Math.round(last)}</b>
          {improved ? " : bravo, vous progressez !" : "."}
        </p>
      )}
      {feedback.attempts === 1 && last !== null && (
        <p className="text-[15px]">
          Score de votre tentative : <b className="text-ink">{Math.round(last)}</b> / 100.
        </p>
      )}
      {feedback.strengths.length > 0 && <p className="text-sm">À retenir : {feedback.strengths.join(", ")}.</p>}
      {feedback.recommendations.map((r) => (
        <p key={r} className="flex gap-2 text-sm">
          <BulbIcon size={18} className="mt-px flex-none text-brand-strong" />
          {r}
        </p>
      ))}
      <p className="mt-1 text-xs text-brand-strong">Votre progression en expression orale a été mise à jour.</p>
    </section>
  );
}
