"use client";

import { useRef, useState } from "react";

const BARS = [10, 18, 24, 14, 22, 12, 26, 16, 8, 20, 14, 24, 10, 18, 12, 22, 8, 16];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Lecteur audio compact (lecture / pause, barres de progression, durée) pour réécouter un enregistrement. */
export function AudioPreview({ src, seconds, onError }: { src: string | undefined; seconds: number; onError?: () => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(seconds);
  const filled = Math.round((time / Math.max(length, 1)) * BARS.length);

  return (
    <div className="flex h-16 items-center gap-3 rounded-lg bg-surface px-3 shadow-card">
      <audio
        ref={audio}
        src={src}
        preload="none"
        onError={() => {
          setPlaying(false);
          onError?.();
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
      />
      <button
        type="button"
        aria-label={playing ? "Mettre en pause" : "Écouter l'enregistrement"}
        onClick={() => {
          const el = audio.current;
          if (!el) return;
          if (playing) el.pause();
          else void el.play();
          setPlaying(!playing);
        }}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ink text-white"
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[3px]" aria-hidden="true">
        {BARS.map((h, i) => (
          <span key={i} className={`w-[3px] rounded-full ${i < filled ? "bg-brand" : "bg-slate-300"}`} style={{ height: h }} />
        ))}
      </div>
      <span className="text-[13px] tabular-nums text-muted">{length === 0 && time === 0 ? "–:––" : fmt(playing || time > 0 ? time : length)}</span>
    </div>
  );
}
