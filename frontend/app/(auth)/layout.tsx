import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Link href="/" aria-label="Lingora, accueil" className="flex justify-center text-ink">
        <Logo size={40} />
      </Link>
      <div className="rounded-xl bg-surface p-6 shadow-card">{children}</div>
    </main>
  );
}
