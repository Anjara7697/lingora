"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { OfflineIcon, RefreshIcon } from "@/components/ui/icons";

/** Écran vide : pictogramme, titre, explication et (éventuellement) une action. */
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand-strong">{icon}</span>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      {children && <p className="max-w-xs text-[15px] leading-[1.55] text-ink-2">{children}</p>}
      {action && <div className="mt-2 flex w-full max-w-xs flex-col gap-1">{action}</div>}
    </div>
  );
}

/** Erreur de chargement : message clair et bouton « Réessayer » qui relance l'appel. */
export function ErrorState({
  title = "Chargement impossible",
  offline = false,
  onRetry,
  children,
}: {
  title?: string;
  offline?: boolean;
  onRetry: () => void;
  children?: ReactNode;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-tint text-ink">
        <OfflineIcon size={28} />
      </span>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="max-w-xs text-[15px] leading-[1.55] text-ink-2">
        {children ?? (offline ? "Vous êtes hors ligne. Vérifiez votre connexion." : "Le serveur ne répond pas. Vérifiez votre connexion.")}
      </p>
      <Button variant="secondary" onClick={onRetry} className="mt-1">
        <RefreshIcon size={18} strokeWidth={2} /> Réessayer
      </Button>
    </div>
  );
}
