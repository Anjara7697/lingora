"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "recording" | "recorded";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Enregistre la voix (MediaRecorder) et, si le navigateur le permet, une transcription en direct
 * (reconnaissance vocale du navigateur). Sans elle, l'utilisateur saisit/corrige la transcription (mode démo).
 */
export function useRecorder(maxSeconds = 120) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [sttAvailable, setSttAvailable] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const startedAt = useRef(0);
  const finalText = useRef("");

  const cleanupStream = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(
    () => () => {
      cleanupStream();
      recognition.current?.stop();
    },
    [cleanupStream],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    recognition.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Votre navigateur ne permet pas l'enregistrement audio. Essayez Chrome ou Firefox récent.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Accès au micro refusé. Autorisez le micro dans votre navigateur puis réessayez.");
      return;
    }
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    chunks.current = [];
    finalText.current = "";
    setTranscript("");
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      cleanupStream();
      const out = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      setBlob(out);
      setPreviewUrl(URL.createObjectURL(out));
      setSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      setPhase("recorded");
    };
    recorder.current = rec;

    const sr = getRecognition();
    setSttAvailable(!!sr);
    if (sr) {
      sr.lang = "en-US";
      sr.continuous = true;
      sr.interimResults = false;
      sr.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText.current += ` ${e.results[i][0].transcript}`;
        }
        setTranscript(finalText.current.trim());
      };
      sr.onerror = () => undefined; // la saisie manuelle reste possible
      try {
        sr.start();
      } catch {
        /* déjà démarrée */
      }
      recognition.current = sr;
    }

    startedAt.current = Date.now();
    setSeconds(0);
    rec.start();
    setPhase("recording");
    timer.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) stop();
    }, 250);
  }, [cleanupStream, maxSeconds, stop]);

  const reset = useCallback(() => {
    setBlob(null);
    setPreviewUrl(null);
    setTranscript("");
    setSeconds(0);
    setError(null);
    setPhase("idle");
  }, []);

  return { phase, error, seconds, blob, previewUrl, transcript, setTranscript, sttAvailable, start, stop, reset };
}
