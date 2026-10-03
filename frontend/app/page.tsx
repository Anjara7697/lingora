import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-5 py-12 text-center">
      <Logo size={56} className="text-ink" />
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Learn. Speak. Grow.</h1>
      <p className="text-base leading-relaxed text-ink-2">
        Apprenez l&apos;anglais en le parlant : pratique orale, feedback et progression mesurable.
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/register" className={buttonClass("primary", "sm:min-w-52")}>
          Créer mon compte
        </Link>
        <Link href="/login" className={buttonClass("secondary", "sm:min-w-52")}>
          Se connecter
        </Link>
      </div>
    </main>
  );
}
