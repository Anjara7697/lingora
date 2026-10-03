"use client";

import { useEffect, useRef } from "react";

import { CrossIcon } from "@/components/ui/icons";

/** Panneau modal (formulaire court) : feuille en bas sur mobile, fenêtre centrée sur ordinateur. */
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-[rgba(11,21,48,0.55)]" />
      <div ref={box} className="relative flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[24px] bg-surface px-5 pb-7 pt-4 sm:rounded-[24px]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
          <button type="button" aria-label="Fermer" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-canvas">
            <CrossIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
