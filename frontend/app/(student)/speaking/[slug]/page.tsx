"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { ChevronLeftIcon, MicIcon, RefreshIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { AudioPreview } from "@/features/speaking/AudioPreview";
import {
  CriteriaCard,
  FeedbackHero,
  IssueList,
  SessionSummary,
  StrengthsCard,
  TipBox,
} from "@/features/speaking/FeedbackCard";
import { QuotaReached } from "@/features/speaking/QuotaReached";
import { useRecorder } from "@/features/speaking/useRecorder";
import { ApiError } from "@/lib/api/client";
import { myBilling } from "@/lib/api/billing";
import { completeSession, createSession, getSession, listScenarios, mediaUrl, submitTurn } from "@/lib/api/speaking";
import type { BillingStatus } from "@/types/billing";
import type { Analysis, Scenario, SessionDetail, Turn } from "@/types/speaking";

const MAX_SECONDS = 120;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const LEVEL: Record<string, string> = {
  BEGINNER: "Débutant",
  ELEMENTARY: "Élémentaire",
  INTERMEDIATE: "Intermédiaire",
  UPPER_INTERMEDIATE: "Intermédiaire sup.",
  ADVANCED: "Avancé",
};
const WAVE = [14, 28, 40, 22, 50, 34, 18, 44, 26, 12, 36, 20, 46, 30, 16, 40, 24, 48, 18, 32];
const pill = "inline-flex h-[26px] items-center rounded-full bg-ink-tint px-2.5 text-xs font-semibold text-ink";

function BackBar({ href, label, onClick }: { href?: string; label: string; onClick?: () => void }) {
  const cls = "flex h-11 items-center gap-1 px-2 text-[15px] font-semibold text-ink";
  return (
    <div className="flex h-[52px] items-center px-2">
      {href ? (
        <Link href={href} className={cls}>
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> {label}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cls}>
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> {label}
        </button>
      )}
    </div>
  );
}

const allIssues = (a: Analysis) => [a.grammar, a.vocabulary, a.fluency, a.relevance, a.pronunciation].flatMap((d) => d.issues);

export default function SpeakingPracticePage() {
  const { slug } = useParams<{ slug: string }>();
  const allowed = useRequireAuth();
  const { status } = useAuth();
  const rec = useRecorder(MAX_SECONDS);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [latest, setLatest] = useState<Turn | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quota, setQuota] = useState<BillingStatus | null>(null);
  const [limitHit, setLimitHit] = useState(false); // le serveur a refusé : quota du jour atteint
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScenarios()
      .then((all) => {
        const found = all.find((s) => s.slug === slug) ?? null;
        setScenario(found);
        if (!found) setError("Scénario introuvable.");
      })
      .catch((e: Error) => setError(e.message));
    // Le quota du jour est connu avant de commencer (et mis à jour après chaque tentative).
    myBilling()
      .then(setQuota)
      .catch(() => {});
  }, [slug]);

  if (!allowed || status !== "authenticated") return <p className="p-5 text-muted">Chargement…</p>;
  if (!scenario) {
    return error ? (
      <div className="flex flex-col gap-3 p-5">
        <BackBar href="/speaking" label="Speaking Lab" />
        <Notice tone="error">{error}</Notice>
      </div>
    ) : (
      <p className="p-5 text-muted">Chargement…</p>
    );
  }

  const completed = detail?.session.status === "COMPLETED";
  const left = detail?.attempts_left_today ?? quota?.speaking_attempts_left_today ?? null;
  const total = quota?.speaking_daily_limit ?? null;
  const limitReached = left === 0 || limitHit;

  async function begin() {
    setBusy(true);
    try {
      const { id } = await createSession(scenario!.id);
      const d = await getSession(id);
      setDetail(d);
      setLatest(d.turns.at(-1) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startAnswer() {
    if (limitReached) return;
    setError(null);
    setShowFeedback(false);
    if (!detail) void begin(); // la session se crée pendant que le navigateur demande le micro
    await rec.start();
  }

  async function send() {
    if (!rec.blob || !detail) return;
    setBusy(true);
    setError(null);
    try {
      const turn = await submitTurn(detail.session.id, rec.blob, rec.seconds, rec.transcript.trim());
      setLatest(turn);
      setDetail(await getSession(detail.session.id));
      setShowFeedback(true);
      rec.reset();
    } catch (e) {
      if (e instanceof ApiError && e.body.code === "DAILY_LIMIT_REACHED") {
        // Code d'erreur stable : on affiche l'écran dédié plutôt qu'un message d'erreur.
        setLimitHit(true);
        rec.reset();
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      setDetail(await completeSession(detail.session.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error && (
    <Notice tone="error">{error}</Notice>
  );

  // ── Session terminée ───────────────────────────────────────────────────────────────────
  if (completed && detail?.feedback) {
    return (
      <>
        <BackBar href="/speaking" label="Speaking Lab" />
        <div className="flex flex-col gap-4 px-5 pb-10 pt-2">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">{scenario.title}</h1>
          <SessionSummary feedback={detail.feedback} />
          <Link href="/speaking" className={buttonClass("primary")}>
            Autre situation
          </Link>
          <Link href="/dashboard" className={buttonClass("ghost")}>
            Tableau de bord
          </Link>
        </div>
      </>
    );
  }

  // ── Enregistrement en cours : plein écran bleu nuit ───────────────────────────────────
  if (rec.phase === "recording") {
    const progress = Math.min(1, rec.seconds / MAX_SECONDS);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
        <div className="flex flex-col gap-1.5 px-6 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{scenario.title}</p>
          <p className="line-clamp-2 text-base text-slate-300">{scenario.context}</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6">
          <div className="flex items-center gap-2.5" role="timer" aria-label={`Durée ${fmt(rec.seconds)}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_5px_rgba(20,184,166,0.25)]" />
            <span className="font-display text-[56px] font-bold leading-none tracking-[-0.02em] tabular-nums">{fmt(rec.seconds)}</span>
            <span className="mb-3 self-end text-base text-slate-400">/ {fmt(MAX_SECONDS)}</span>
          </div>
          <div className="flex h-14 items-center gap-1" aria-hidden="true">
            {WAVE.map((h, i) => (
              <span
                key={i}
                className="wave-bar w-1 rounded-full bg-brand"
                style={{ height: h, animationDelay: `${(i % 7) * 0.12}s`, opacity: i / WAVE.length <= progress + 0.5 ? 1 : 0.3 }}
              />
            ))}
          </div>
          {rec.transcript && <p className="line-clamp-4 text-center text-base italic leading-[1.55] text-slate-300">« {rec.transcript} »</p>}
        </div>
        <div className="flex flex-col items-center gap-3.5 px-6 pb-12">
          <button
            type="button"
            onClick={rec.stop}
            aria-label="Arrêter l'enregistrement"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_0_0_10px_rgba(20,184,166,0.25),0_0_0_22px_rgba(20,184,166,0.1)]"
          >
            <span className="h-[30px] w-[30px] rounded-[7px] bg-ink" />
          </button>
          <p className="mt-2.5 text-[15px] font-semibold">Appuyez pour arrêter</p>
        </div>
      </div>
    );
  }

  // ── Vérification avant l'analyse ──────────────────────────────────────────────────────
  if (rec.phase === "recorded") {
    return (
      <div className="flex min-h-screen flex-col">
        <BackBar label={scenario.title} onClick={rec.reset} />
        <div className="flex flex-1 flex-col gap-[18px] px-5 pt-2">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">Vérifiez avant l&apos;analyse</h1>
          <AudioPreview src={rec.previewUrl ?? undefined} seconds={rec.seconds} />
          <div className="flex flex-col gap-2">
            <label htmlFor="transcript" className="text-sm font-semibold text-ink">
              {rec.sttAvailable ? "Transcription (vérifiez-la)" : "Que venez-vous de dire ? (mode démo)"}
            </label>
            <textarea
              id="transcript"
              value={rec.transcript}
              onChange={(e) => rec.setTranscript(e.target.value)}
              rows={5}
              placeholder="Écrivez ici votre réponse en anglais"
              className="min-h-[132px] w-full rounded-md bg-surface px-3.5 py-3 text-base leading-[1.55] text-ink shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5] outline-none"
            />
            <p className="text-[13px] leading-[1.45] text-muted">
              {rec.sttAvailable
                ? "Corrigez les mots mal reconnus : l'analyse porte sur ce texte. La prononciation n'est pas encore évaluée."
                : "Le mode démo n'a pas encore de reconnaissance vocale : l'analyse porte sur ce texte. La prononciation n'est pas encore évaluée."}
            </p>
          </div>
          {errorBox}
        </div>
        <div className="sticky bottom-0 flex flex-col gap-2.5 border-t border-line bg-surface px-5 pb-8 pt-4">
          <Button onClick={send} disabled={busy || !detail || !rec.transcript.trim()} className="h-[52px] w-full">
            {busy ? "Analyse en cours…" : "Envoyer pour analyse"}
          </Button>
          <Button onClick={rec.reset} disabled={busy} variant="ghost" className="w-full text-ink">
            <RefreshIcon size={18} strokeWidth={2} /> Refaire l&apos;enregistrement
          </Button>
        </div>
      </div>
    );
  }

  // ── Feedback de la dernière tentative ─────────────────────────────────────────────────
  if (showFeedback && latest?.analysis && detail) {
    const firstScore = detail.turns[0]?.overall_score ?? null;
    const issues = allIssues(latest.analysis);
    return (
      <>
        <FeedbackHero
          attempt={latest.sequence_number}
          scenarioTitle={scenario.title}
          score={latest.overall_score ?? 0}
          firstScore={firstScore}
        />
        <div className="flex flex-col gap-4 px-5 pb-10 pt-5">
          {latest.audio_url && <AudioPreview src={mediaUrl(latest.audio_url)} seconds={0} />}
          {latest.transcript && <p className="text-[15px] italic leading-normal text-muted">« {latest.transcript} »</p>}
          <CriteriaCard analysis={latest.analysis} />
          <StrengthsCard strengths={latest.analysis.strengths} />
          {issues.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h2 className="font-sans text-base font-semibold tracking-normal text-ink">À améliorer</h2>
              <IssueList issues={issues} />
            </div>
          )}
          {latest.analysis.tips.map((t) => (
            <TipBox key={t} text={t} />
          ))}
          {errorBox}
          <div className="mt-1 flex flex-col gap-2.5">
            {!limitReached && (
              <button type="button" onClick={startAnswer} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-md bg-brand font-semibold text-ink">
                <MicIcon size={20} strokeWidth={2} /> Nouvelle tentative
              </button>
            )}
            {limitReached && <QuotaReached total={total} premium={!!quota?.is_premium} trialAvailable={!!quota?.trial_available} />}
            <Button onClick={finish} disabled={busy} variant="secondary" className="w-full">
              {busy ? "…" : "Terminer la session"}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ── Prêt à répondre ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      <BackBar href="/speaking" label="Speaking Lab" />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <span className={pill}>{LEVEL[scenario.difficulty] ?? scenario.difficulty}</span>
            {scenario.estimated_minutes ? <span className={pill}>{scenario.estimated_minutes} min</span> : null}
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">{scenario.title}</h1>
        </div>
        <section className="flex flex-col gap-2 rounded-lg bg-surface p-[18px] shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong">La situation</p>
          <p className="text-base leading-[1.55] text-ink-2">{scenario.context}</p>
        </section>
        {errorBox}
        {rec.error && <Notice tone="error">{rec.error}</Notice>}
      </div>

      {limitReached ? (
        <div className="flex flex-1 flex-col justify-center px-5 py-6">
          <QuotaReached total={total} premium={!!quota?.is_premium} trialAvailable={!!quota?.trial_available} />
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6">
            <button
              type="button"
              onClick={startAnswer}
              aria-label="Démarrer l'enregistrement"
              className="flex h-44 w-44 items-center justify-center rounded-full bg-brand-tint"
            >
              <span className="flex h-[132px] w-[132px] items-center justify-center rounded-full bg-brand/30">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-ink shadow-[0_8px_24px_rgba(15,118,110,0.35)]">
                  <MicIcon size={40} strokeWidth={2} />
                </span>
              </span>
            </button>
            <div className="flex flex-col items-center gap-1.5 px-5 text-center">
              <p className="text-[17px] font-semibold text-ink">{detail?.turns.length ? "Nouvelle tentative : appuyez pour parler" : "Appuyez pour répondre"}</p>
              <p className="text-sm text-muted">À voix haute, en anglais · {Math.round(MAX_SECONDS / 60)} min max</p>
            </div>
          </div>

          {left !== null && (
            <div className="flex justify-center px-5 pb-7">
              <p className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] text-ink-2 shadow-[inset_0_0_0_1px_#e2e8f0]">
                {total !== null && total <= 5 && (
                  <span className="flex gap-[3px]" aria-hidden="true">
                    {Array.from({ length: total }, (_, i) => (
                      <span key={i} className={`h-2 w-2 rounded-full ${i < left ? "bg-brand" : "bg-slate-300"}`} />
                    ))}
                  </span>
                )}
                {left} analyse(s) restante(s) aujourd&apos;hui
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
