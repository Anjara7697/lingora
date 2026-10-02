"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { AnalysisCard, SessionSummary } from "@/features/speaking/FeedbackCard";
import { useRecorder } from "@/features/speaking/useRecorder";
import { completeSession, createSession, getSession, listScenarios, mediaUrl, submitTurn } from "@/lib/api/speaking";
import type { Scenario, SessionDetail, Turn } from "@/types/speaking";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function SpeakingPracticePage() {
  const { slug } = useParams<{ slug: string }>();
  const allowed = useRequireAuth();
  const { status } = useAuth();
  const rec = useRecorder(120);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [latest, setLatest] = useState<Turn | null>(null);
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
  }, [slug]);

  if (!allowed || status !== "authenticated") return <p className="text-zinc-500">Chargement…</p>;
  if (!scenario) return error ? <p role="alert" className="text-red-700">{error}</p> : <p className="text-zinc-500">Chargement…</p>;

  const completed = detail?.session.status === "COMPLETED";

  async function begin() {
    setBusy(true);
    setError(null);
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

  async function send() {
    if (!rec.blob || !detail) return;
    setBusy(true);
    setError(null);
    try {
      const turn = await submitTurn(detail.session.id, rec.blob, rec.seconds, rec.transcript.trim());
      setLatest(turn);
      setDetail(await getSession(detail.session.id));
      rec.reset();
    } catch (e) {
      setError((e as Error).message);
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

  return (
    <>
      <Link href="/speaking" className="text-sm text-indigo-600 hover:underline">
        ← Speaking Lab
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">{scenario.title}</h1>

      <section className="my-4 rounded-xl bg-indigo-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">La situation</p>
        <p className="mt-1 text-zinc-900">{scenario.context}</p>
      </section>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!detail && (
        <Button onClick={begin} disabled={busy} className="w-full">
          {busy ? "Chargement…" : "Commencer la pratique"}
        </Button>
      )}

      {detail && !completed && (
        <>
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            {rec.phase === "idle" && (
              <div className="text-center">
                <button
                  onClick={rec.start}
                  aria-label="Démarrer l'enregistrement"
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-3xl text-white shadow hover:bg-red-700"
                >
                  🎙️
                </button>
                <p className="mt-2 text-sm text-zinc-600">
                  {detail.turns.length ? "Nouvelle tentative : appuyez pour parler" : "Appuyez pour répondre à voix haute, en anglais"}
                </p>
              </div>
            )}

            {rec.phase === "recording" && (
              <div className="text-center">
                <button
                  onClick={rec.stop}
                  aria-label="Arrêter l'enregistrement"
                  className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-zinc-900 text-2xl text-white"
                >
                  ■
                </button>
                <p className="mt-2 font-mono text-lg text-red-600" role="timer">● {fmt(rec.seconds)}</p>
                {rec.transcript && <p className="mt-2 text-sm italic text-zinc-600">« {rec.transcript} »</p>}
              </div>
            )}

            {rec.phase === "recorded" && (
              <div className="grid gap-3">
                <audio controls src={rec.previewUrl ?? undefined} className="w-full" />
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-zinc-800">
                    {rec.sttAvailable ? "Transcription (vérifiez-la)" : "Que venez-vous de dire ? (mode démo)"}
                  </span>
                  <textarea
                    value={rec.transcript}
                    onChange={(e) => rec.setTranscript(e.target.value)}
                    rows={3}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-base"
                    placeholder="Écrivez ici votre réponse en anglais"
                  />
                  <span className="text-xs text-zinc-500">
                    Le mode démo n&apos;a pas encore de reconnaissance vocale intégrée : l&apos;analyse porte sur ce texte.
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button onClick={send} disabled={busy || !rec.transcript.trim()}>
                    {busy ? "Analyse…" : "Envoyer pour analyse"}
                  </Button>
                  <Button onClick={rec.reset} disabled={busy} className="bg-zinc-700 hover:bg-zinc-800">
                    Refaire
                  </Button>
                </div>
              </div>
            )}
            {rec.error && <p role="alert" className="mt-3 text-sm text-red-700">{rec.error}</p>}
          </section>
          <p className="mt-2 text-xs text-zinc-500">Tentatives restantes aujourd&apos;hui : {detail.attempts_left_today}</p>
        </>
      )}

      {latest?.analysis && (
        <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-4" aria-label="Feedback">
          <h2 className="mb-1 font-semibold text-zinc-900">Feedback — tentative {latest.sequence_number}</h2>
          {latest.transcript && <p className="mb-1 text-sm italic text-zinc-600">« {latest.transcript} »</p>}
          {latest.audio_url && <audio controls src={mediaUrl(latest.audio_url)} className="mb-3 w-full" />}
          <AnalysisCard analysis={latest.analysis} overall={latest.overall_score} />
          {detail && !completed && rec.phase === "idle" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <p className="w-full text-sm text-zinc-600">Réessayez pour vous améliorer, ou terminez la session.</p>
              <Button onClick={finish} disabled={busy}>
                {busy ? "…" : "Terminer la session"}
              </Button>
            </div>
          )}
        </section>
      )}

      {completed && detail?.feedback && (
        <div className="mt-5 grid gap-3">
          <SessionSummary feedback={detail.feedback} />
          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <Link href="/speaking" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Autre situation
            </Link>
            <Link href="/dashboard" className="px-2 py-2 text-indigo-600 hover:underline">
              Tableau de bord
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
