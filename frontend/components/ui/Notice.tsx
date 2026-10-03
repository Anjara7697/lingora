import type { ReactNode } from "react";

import { AlertIcon, CheckIcon, InfoIcon, OfflineIcon } from "@/components/ui/icons";

type Tone = "success" | "info" | "offline" | "error";

const TONE: Record<Tone, { cls: string; icon: ReactNode; role: "status" | "alert" }> = {
  success: { cls: "bg-brand-tint text-brand-strong", icon: <CheckIcon size={20} strokeWidth={2.2} />, role: "status" },
  info: { cls: "bg-ink-tint text-ink", icon: <InfoIcon size={20} strokeWidth={2} />, role: "status" },
  offline: { cls: "bg-ink text-white", icon: <OfflineIcon size={20} strokeWidth={2} />, role: "status" },
  error: { cls: "bg-danger-tint text-danger", icon: <AlertIcon size={20} strokeWidth={2} />, role: "alert" },
};

/** Message d'état : icône + titre court en gras + détail. Ne repose jamais sur la couleur seule. */
export function Notice({ tone, title, children, className = "" }: { tone: Tone; title?: string; children?: ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <div role={t.role} className={`flex gap-2.5 rounded-md px-3.5 py-3 text-sm leading-[1.45] ${t.cls} ${className}`}>
      <span className="mt-px flex-none">{t.icon}</span>
      <div>
        {title && <b className="font-semibold">{title} </b>}
        {children}
      </div>
    </div>
  );
}
