import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/** Pagination « Précédent · 1–20 sur 424 · Suivant ». */
export function Pager({ offset, page, total, onChange }: { offset: number; page: number; total: number; onChange: (offset: number) => void }) {
  if (total <= page) return null;
  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Pagination">
      <Button variant="secondary" className="h-10 px-4" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - page))}>
        Précédent
      </Button>
      <span className="text-[13px] tabular-nums text-muted">
        {offset + 1}–{Math.min(offset + page, total)} sur {total}
      </span>
      <Button variant="secondary" className="h-10 px-4" disabled={offset + page >= total} onClick={() => onChange(offset + page)}>
        Suivant
      </Button>
    </nav>
  );
}

export function ListSkeleton({ rows = 5, className = "h-14" }: { rows?: number; className?: string }) {
  return (
    <div className="grid gap-2" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

const pill = "inline-flex h-7 flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold";

/** Pastille neutre : le sens passe par le libellé et la forme, pas par une couleur. */
export function Tag({ tone = "tint", children }: { tone?: "tint" | "solid" | "brand" | "outline" | "muted"; children: React.ReactNode }) {
  const cls = {
    tint: "bg-ink-tint text-ink",
    solid: "bg-ink text-white",
    brand: "bg-brand-tint text-brand-strong",
    outline: "bg-surface text-ink shadow-[inset_0_0_0_1.5px_#94a3b8]",
    muted: "bg-slate-100 text-muted",
  }[tone];
  return <span className={`${pill} ${cls}`}>{children}</span>;
}

export const money = (amount: string | number, currency: string) =>
  `${Number(amount).toLocaleString("fr-FR")} ${currency === "MGA" ? "Ar" : currency}`;
