import Image from "next/image";

const SRC = {
  couleur: "/brand/lingora-symbole-couleur.svg",
  blanc: "/brand/lingora-symbole-blanc.svg",
} as const;

/** Symbole Lingora (le « L » bleu et turquoise ; version blanche sur fond sombre). Ratio d'origine 1000 × 925. */
export function LogoMark({ variant = "couleur", height = 24 }: { variant?: keyof typeof SRC; height?: number }) {
  return (
    <Image
      src={SRC[variant]}
      alt=""
      width={Math.round((height * 1000) / 925)}
      height={height}
      unoptimized
      priority
      style={{ height, width: "auto" }}
    />
  );
}

/** Symbole + nom, pour les en-têtes. */
export function Logo({ variant = "couleur", size = 24, className = "" }: { variant?: keyof typeof SRC; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold ${className}`}>
      <LogoMark variant={variant} height={size} />
      <span style={{ fontSize: Math.round(size * 0.72) }}>Lingora</span>
    </span>
  );
}
