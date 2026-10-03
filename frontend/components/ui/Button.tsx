import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#0f1a42]",
  secondary: "bg-surface text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] hover:bg-canvas",
  ghost: "bg-transparent text-brand-strong hover:bg-brand-tint",
  danger: "bg-danger text-white hover:bg-[#912018]",
  brand: "bg-brand text-ink hover:bg-[#10a597]",
};

export const buttonClass = (variant: Variant = "primary", extra = "") =>
  `inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 font-semibold transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none ${VARIANT[variant]} ${extra}`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Envoi en cours : affiche un indicateur et bloque le bouton (évite le double envoi). */
  loading?: boolean;
}

/** Bouton de 48 px de haut (cible tactile confortable). */
export function Button({ variant = "primary", loading = false, className = "", type = "button", disabled, children, ...props }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, className)} ${loading ? "disabled:bg-ink disabled:text-white disabled:opacity-85" : ""}`}
      {...props}
    >
      {loading && <span aria-hidden="true" className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/35 border-t-white motion-reduce:animate-none" />}
      {children}
    </button>
  );
}
