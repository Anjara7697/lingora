import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";
import { DownloadIcon, OfflineIcon, RefreshIcon } from "@/components/ui/icons";

export const metadata = { title: "Hors ligne – Lingora" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-tint text-ink">
        <OfflineIcon size={30} />
      </span>
      <h1 className="font-display text-[26px] font-bold leading-tight text-ink">Vous êtes hors ligne</h1>
      <p className="text-base leading-[1.55] text-ink-2">
        Lingora a besoin d&apos;Internet pour cette page et pour analyser votre voix. Vos leçons téléchargées restent accessibles.
      </p>
      <div className="mt-2 flex w-full flex-col gap-2.5">
        <Link href="/" className={buttonClass("primary")}>
          <RefreshIcon size={18} strokeWidth={2} /> Réessayer
        </Link>
        <Link href="/downloads" className={buttonClass("secondary")}>
          <DownloadIcon size={20} /> Mes leçons hors ligne
        </Link>
      </div>
    </main>
  );
}
