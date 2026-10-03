"use client";

import { useState } from "react";

import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Notice as UiNotice } from "@/components/ui/Notice";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon } from "@/components/ui/icons";
import { Tag } from "@/features/admin/ui";
import type { Difficulty, Status } from "@/types/cms";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Débutant",
  ELEMENTARY: "Élémentaire",
  INTERMEDIATE: "Intermédiaire",
  UPPER_INTERMEDIATE: "Intermédiaire sup.",
  ADVANCED: "Avancé",
};

const STATUS: Record<Status, { label: string; tone: "outline" | "brand" | "muted" }> = {
  DRAFT: { label: "Brouillon", tone: "outline" },
  PUBLISHED: { label: "Publié", tone: "brand" },
  ARCHIVED: { label: "Archivé", tone: "muted" },
};

/** Statut de contenu : le libellé (et l'icône pour « Publié ») porte l'information, pas la couleur. */
export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <Tag tone={s.tone}>
      {status === "PUBLISHED" && <CheckIcon size={14} strokeWidth={3} />}
      {s.label}
    </Tag>
  );
}

export function Notice({ kind, messages, title }: { kind: "error" | "success"; messages: string[]; title?: string }) {
  if (!messages.length) return null;
  return (
    <UiNotice tone={kind} title={title} className="mb-4">
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul className="list-disc pl-5">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </UiNotice>
  );
}

export const inputCls =
  "w-full rounded-md bg-surface px-3.5 py-3 text-base text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] outline-none placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5] aria-[invalid=true]:shadow-[inset_0_0_0_2px_#172554]";
export const smallBtn =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-surface px-3 text-sm font-semibold text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60";
export const dangerBtn = `${smallBtn} !text-danger`;

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

/** Boutons ↑ ↓ pour réordonner une liste (sans glisser-déposer, utilisable au doigt) ; grisés en début et en fin. */
export function MoveButtons({ index, length, onMove }: { index: number; length: number; onMove: (from: number, to: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      <button type="button" className={`${smallBtn} w-10 px-0`} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Monter">
        <ArrowUpIcon size={18} />
      </button>
      <button type="button" className={`${smallBtn} w-10 px-0`} disabled={index === length - 1} onClick={() => onMove(index, index + 1)} aria-label="Descendre">
        <ArrowDownIcon size={18} />
      </button>
    </span>
  );
}

export const moved = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

interface Ask {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  tone: "danger" | "neutral";
  run: () => Promise<unknown> | void;
}

/** Fenêtre de confirmation commune : rouge pour archiver/supprimer, bleu nuit pour une action réversible (dépublier). */
export function useConfirm() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const element = (
    <ConfirmSheet
      open={ask !== null}
      tone={ask?.tone}
      busy={busy}
      title={ask?.title ?? ""}
      confirmLabel={ask?.confirmLabel ?? ""}
      cancelLabel="Annuler"
      onCancel={() => setAsk(null)}
      onConfirm={async () => {
        if (!ask) return;
        setBusy(true);
        try {
          await ask.run();
        } finally {
          setBusy(false);
          setAsk(null);
        }
      }}
    >
      {ask?.body}
    </ConfirmSheet>
  );
  return { confirm: setAsk, element };
}
