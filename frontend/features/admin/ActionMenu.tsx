"use client";

import { useEffect, useRef, useState } from "react";

import { MoreIcon } from "@/components/ui/icons";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  tone?: "danger";
  current?: boolean;
  disabled?: boolean;
  /** Explique pourquoi l'action est désactivée (infobulle). */
  reason?: string;
  heading?: string;
}

/** Menu « ⋯ » d'une ligne : fermé par Échap ou un clic à l'extérieur. */
export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-canvas"
      >
        <MoreIcon size={20} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-64 rounded-lg bg-surface py-1.5 shadow-[0_8px_24px_rgba(11,21,48,0.18)]">
          {actions.map((a, i) => (
            <div key={a.label}>
              {a.heading && (
                <p className={`px-4 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wide text-muted ${i > 0 ? "mt-1 border-t border-line" : ""}`}>{a.heading}</p>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={a.disabled}
                title={a.disabled ? a.reason : undefined}
                onClick={() => {
                  setOpen(false);
                  a.onSelect();
                }}
                className={`flex h-11 w-full items-center justify-between px-4 text-left text-[15px] font-semibold hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent ${a.tone === "danger" ? "text-danger" : "text-ink"}`}
              >
                {a.label}
                {a.current && <span aria-label="actuel" className="h-2 w-2 rounded-full bg-brand" />}
              </button>
              {a.disabled && a.reason && <p className="px-4 pb-1 text-xs text-muted">{a.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
