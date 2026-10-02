import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Analysis, Issue, SessionFeedback } from "@/types/speaking";

const DIMENSIONS: { key: keyof Pick<Analysis, "grammar" | "vocabulary" | "fluency" | "relevance" | "pronunciation">; label: string }[] = [
  { key: "grammar", label: "Grammaire" },
  { key: "vocabulary", label: "Vocabulaire" },
  { key: "fluency", label: "Fluidité" },
  { key: "relevance", label: "Pertinence" },
  { key: "pronunciation", label: "Prononciation" },
];

const KIND_LABEL: Record<Issue["kind"], { label: string; cls: string }> = {
  ERROR: { label: "Erreur", cls: "bg-red-100 text-red-800" },
  SUGGESTION: { label: "Suggestion", cls: "bg-amber-100 text-amber-900" },
  STYLE: { label: "Style", cls: "bg-zinc-100 text-zinc-700" },
};

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="grid gap-2">
      {issues.map((i, n) => (
        <li key={n} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
          <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${KIND_LABEL[i.kind].cls}`}>
            {KIND_LABEL[i.kind].label}
          </span>
          {i.original && (
            <span className="text-zinc-700">
              « <span className="line-through">{i.original}</span> »
              {i.suggestion && <> → <span className="font-medium text-green-700">« {i.suggestion} »</span></>}
            </span>
          )}
          <p className="mt-1 text-zinc-600">{i.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

export function AnalysisCard({ analysis, overall }: { analysis: Analysis; overall: number | null }) {
  const allIssues = DIMENSIONS.flatMap(({ key }) => analysis[key].issues);
  return (
    <div className="grid gap-4">
      {overall !== null && (
        <p className="text-center">
          <span className="text-4xl font-bold text-indigo-600">{Math.round(overall)}</span>
          <span className="text-zinc-500"> / 100</span>
        </p>
      )}
      <div className="grid gap-3">
        {DIMENSIONS.map(({ key, label }) => {
          const d = analysis[key];
          return (
            <div key={key}>
              {d.score === null ? (
                <p className="text-sm text-zinc-500">
                  <span className="font-medium text-zinc-700">{label}</span> — non évaluée
                  {d.note && <span className="block text-xs">{d.note}</span>}
                </p>
              ) : (
                <>
                  <ProgressBar value={d.score} label={label} />
                  {d.note && <p className="mt-0.5 text-xs text-zinc-500">{d.note}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
      {analysis.strengths.length > 0 && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
          <span className="font-semibold">Ce que vous avez bien fait :</span> {analysis.strengths.join(", ")}
        </p>
      )}
      {allIssues.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-zinc-900">À améliorer</h4>
          <IssueList issues={allIssues} />
        </div>
      )}
      {analysis.tips.map((t) => (
        <p key={t} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          💡 {t}
        </p>
      ))}
    </div>
  );
}

export function SessionSummary({ feedback }: { feedback: SessionFeedback }) {
  const { first_attempt_score: first, last_attempt_score: last } = feedback;
  const improved = first !== null && last !== null && last > first;
  return (
    <section className="rounded-xl border border-green-200 bg-green-50 p-5" role="status">
      <h3 className="text-lg font-semibold text-green-900">🎉 Session terminée</h3>
      {first !== null && last !== null && feedback.attempts > 1 && (
        <p className="mt-2 text-sm text-green-900">
          Votre score est passé de <b>{Math.round(first)}</b> à <b>{Math.round(last)}</b>
          {improved ? " : bravo, vous progressez !" : "."}
        </p>
      )}
      {feedback.attempts === 1 && last !== null && (
        <p className="mt-2 text-sm text-green-900">Score de votre tentative : <b>{Math.round(last)}</b> / 100.</p>
      )}
      {feedback.strengths.length > 0 && <p className="mt-2 text-sm">✅ {feedback.strengths.join(", ")}</p>}
      {feedback.recommendations.map((r) => (
        <p key={r} className="mt-1 text-sm">💡 {r}</p>
      ))}
      <p className="mt-3 text-xs text-green-800">Votre progression en expression orale a été mise à jour.</p>
    </section>
  );
}
