import type { Difficulty, Status } from "@/types/cms";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Débutant",
  ELEMENTARY: "Élémentaire",
  INTERMEDIATE: "Intermédiaire",
  UPPER_INTERMEDIATE: "Intermédiaire sup.",
  ADVANCED: "Avancé",
};

const STATUS: Record<Status, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-zinc-100 text-zinc-700" },
  PUBLISHED: { label: "Publié", cls: "bg-green-100 text-green-800" },
  ARCHIVED: { label: "Archivé", cls: "bg-red-100 text-red-800" },
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[status].cls}`}>{STATUS[status].label}</span>;
}

export function Notice({ kind, messages }: { kind: "error" | "success"; messages: string[] }) {
  if (!messages.length) return null;
  const cls = kind === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`mb-3 rounded-lg px-3 py-2 text-sm ${cls}`}>
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc pl-5">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const inputCls = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base";
export const smallBtn = "rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-sm hover:bg-zinc-50 disabled:opacity-40";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-zinc-800">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

/** Boutons ↑ ↓ pour réordonner une liste (sans glisser-déposer, utilisable au doigt). */
export function MoveButtons({ index, length, onMove }: { index: number; length: number; onMove: (from: number, to: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      <button className={smallBtn} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Monter">
        ↑
      </button>
      <button className={smallBtn} disabled={index === length - 1} onClick={() => onMove(index, index + 1)} aria-label="Descendre">
        ↓
      </button>
    </span>
  );
}

export const moved = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};
