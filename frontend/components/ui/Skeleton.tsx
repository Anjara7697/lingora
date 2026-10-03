/** Bloc de chargement : gris #E2E8F0, sans animation si l'utilisateur réduit les mouvements. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-line motion-reduce:animate-none ${className}`} />;
}
