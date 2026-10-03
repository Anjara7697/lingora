import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#0f1a42]",
  secondary: "bg-surface text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] hover:bg-canvas",
  ghost: "bg-transparent text-brand-strong hover:bg-brand-tint",
  danger: "bg-danger text-white hover:bg-[#912018]",
};

export const buttonClass = (variant: Variant = "primary", extra = "") =>
  `inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 font-semibold transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none ${VARIANT[variant]} ${extra}`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Bouton de 48 px de haut (cible tactile confortable). */
export function Button({ variant = "primary", className = "", type = "button", ...props }: Props) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
