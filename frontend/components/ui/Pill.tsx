import type { ReactNode } from "react";

import { CheckIcon, ClockIcon, LockIcon } from "@/components/ui/icons";
import type { ProgressStatus } from "@/types/learning";

const base = "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold";

/** Niveau CEFR : « A2 », ou « B1 · Intermédiaire » avec le libellé. */
export function LevelPill({ level, label, tone = "brand" }: { level: string; label?: string; tone?: "brand" | "ink" | "solid" }) {
  const cls = { brand: "bg-brand-tint text-brand-strong", ink: "bg-ink-tint text-ink", solid: "bg-ink text-white" }[tone];
  return (
    <span className={`${base} ${cls}`}>
      {level}
      {label ? ` · ${label}` : ""}
    </span>
  );
}

const STATUS: Record<ProgressStatus, { label: string; cls: string; icon?: ReactNode }> = {
  COMPLETED: { label: "Terminée", cls: "bg-brand-strong text-white", icon: <CheckIcon size={14} strokeWidth={3} /> },
  IN_PROGRESS: { label: "En cours", cls: "bg-brand-tint text-brand-strong", icon: <ClockIcon size={14} strokeWidth={2.4} /> },
  AVAILABLE: { label: "Disponible", cls: "bg-surface text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1]" },
  LOCKED: { label: "Verrouillée", cls: "bg-slate-100 text-muted", icon: <LockIcon size={14} strokeWidth={2.4} /> },
};

/** Statut d'une leçon : l'icône et le libellé portent l'information, pas la couleur seule. */
export function StatusPill({ status }: { status: ProgressStatus }) {
  const s = STATUS[status];
  return (
    <span className={`${base} ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
