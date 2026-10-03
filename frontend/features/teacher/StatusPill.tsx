import type { ReactNode } from "react";

import { ClockIcon, MicIcon, PauseIcon, PlusIcon, TrendUpIcon } from "@/components/ui/icons";
import { STATUS_LABEL } from "@/lib/labels";
import type { StudentStatus } from "@/types/teacher";

const base = "inline-flex h-7 flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold";

const STYLE: Record<StudentStatus, { cls: string; icon: ReactNode }> = {
  NEW: { cls: "bg-ink-tint text-ink", icon: <PlusIcon size={14} strokeWidth={2.4} /> },
  ON_TRACK: { cls: "bg-brand-tint text-brand-strong", icon: <TrendUpIcon size={14} strokeWidth={2.4} /> },
  LOW_ACTIVITY: { cls: "bg-surface text-ink shadow-[inset_0_0_0_1.5px_#94a3b8]", icon: <ClockIcon size={14} strokeWidth={2.4} /> },
  SPEAKING_DIFFICULTY: { cls: "bg-ink text-white", icon: <MicIcon size={14} strokeWidth={2.4} /> },
  INACTIVE: { cls: "bg-slate-100 text-muted", icon: <PauseIcon size={14} strokeWidth={2.4} /> },
};

/** Statut d'un élève : forme, icône et libellé distincts, jamais la couleur seule. */
export function StudentStatusPill({ status }: { status: StudentStatus }) {
  const s = STYLE[status];
  return (
    <span className={`${base} ${s.cls}`}>
      {s.icon}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({ first, last, size = 40 }: { first: string; last: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex flex-none items-center justify-center rounded-full bg-ink-tint text-sm font-semibold text-ink"
      aria-hidden="true"
    >
      {(first[0] ?? "") + (last[0] ?? "")}
    </span>
  );
}
