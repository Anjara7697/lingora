import Link from "next/link";

import { LogoMark } from "@/components/ui/Logo";

/** Carte d'authentification : symbole Lingora au-dessus, formulaire dans une carte, lien secondaire dessous. */
export function AuthCard({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <Link href="/" aria-label="Lingora, accueil" className="flex justify-center">
        <LogoMark height={44} />
      </Link>
      <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card">{children}</div>
      {footer && <p className="text-center text-[15px] text-ink-2">{footer}</p>}
    </div>
  );
}

export const authLink = "font-semibold text-brand-strong hover:underline";
