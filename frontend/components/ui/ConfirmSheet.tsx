"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";

/** Feuille de confirmation (bas d'écran) avant une action difficile à annuler. */
export function ConfirmSheet({
  open,
  title,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fermer" onClick={onCancel} className="absolute inset-0 bg-[rgba(11,21,48,0.55)]" />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-3.5 rounded-t-[24px] bg-surface px-5 pb-7 pt-3">
        <span aria-hidden className="h-1 w-10 self-center rounded-full bg-slate-300" />
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        <p className="text-[15px] leading-[1.55] text-ink-2">{children}</p>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="h-12 rounded-md bg-surface font-semibold text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1]"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
