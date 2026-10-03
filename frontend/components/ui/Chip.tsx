/** Pastille de filtre : bleu nuit quand elle est active, contour gris sinon. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${active ? "bg-ink text-white" : "bg-surface text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1]"}`}
    >
      {children}
    </button>
  );
}
