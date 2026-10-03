import Link from "next/link";

import { ChevronLeftIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/ui/Logo";

interface Props {
  back?: { href: string; label: string };
  icon?: React.ReactNode;
  title: string;
  lead?: React.ReactNode;
  tone?: "ink" | "brand";
  children?: React.ReactNode;
}

/** Écran d'authentification plein format (sans carte) : retour, pictogramme, titre, texte d'explication, puis le contenu. */
export function AuthScreen({ back, icon, title, lead, tone = "ink", children }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      {back ? (
        <Link href={back.href} className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-[15px] font-semibold text-ink">
          <ChevronLeftIcon size={22} strokeWidth={2.2} /> {back.label}
        </Link>
      ) : (
        <Link href="/" aria-label="Lingora, accueil" className="mt-2 w-fit">
          <LogoMark height={40} />
        </Link>
      )}
      {icon && (
        <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${tone === "brand" ? "bg-brand-tint text-brand-strong" : "bg-ink-tint text-ink"}`}>
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-ink">{title}</h1>
        {lead && <p className="text-base leading-[1.55] text-ink-2">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
