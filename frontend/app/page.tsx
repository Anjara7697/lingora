import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";
import { DownloadIcon, MicIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";

const point = "flex items-center gap-3 text-[15px]";
const dot = "flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand/20 text-brand";

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-ink text-white">
      <span aria-hidden className="absolute -right-[120px] -top-[90px] h-[380px] w-[380px] rounded-full bg-brand opacity-[0.16]" />
      <span aria-hidden className="absolute -left-[140px] bottom-[180px] h-[300px] w-[300px] rounded-full bg-brand opacity-[0.08]" />
      <div className="relative px-7 pt-8">
        <Logo variant="blanc" size={32} />
      </div>
      <div className="relative flex flex-1 flex-col justify-center gap-5 px-7 py-8">
        <h1 className="font-display text-[44px] font-bold leading-[1.04] tracking-[-0.03em]">
          Learn.
          <br />
          Speak.
          <br />
          <span className="text-brand">Grow.</span>
        </h1>
        <p className="text-[17px] leading-[1.55] text-slate-300">
          Apprenez l&apos;anglais en le parlant : pratique orale, feedback et progression mesurable.
        </p>
        <ul className="mt-1.5 flex flex-col gap-3">
          <li className={point}>
            <span className={dot}>
              <MicIcon size={20} strokeWidth={2} />
            </span>
            Parlez à voix haute, recevez un feedback
          </li>
          <li className={point}>
            <span className={dot}>
              <DownloadIcon size={20} strokeWidth={2} />
            </span>
            Leçons disponibles sans connexion
          </li>
        </ul>
      </div>
      <div className="relative flex flex-col gap-3 px-7 pb-10">
        <Link href="/register" className={buttonClass("brand")}>
          Créer mon compte
        </Link>
        <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-md font-semibold text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.4)]">
          Se connecter
        </Link>
      </div>
    </main>
  );
}
