"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/AuthProvider";

const SOON = [
  { title: "Test de niveau", text: "Découvrez votre niveau d'anglais (A1 → C2)." },
  { title: "Mon parcours", text: "Cours, leçons et exercices adaptés à votre objectif." },
  { title: "Speaking Lab", text: "Pratiquez l'oral et recevez un feedback." },
  { title: "Ma progression", text: "Suivez l'évolution de chaque compétence." },
];

export default function DashboardPage() {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">Chargement…</main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bonjour {user.first_name} 👋</h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Déconnexion
        </button>
      </header>

      <p className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        Bienvenue sur Lingora ! Votre compte est prêt. Les fonctionnalités ci-dessous arrivent bientôt.
      </p>

      <section className="grid gap-3 sm:grid-cols-2">
        {SOON.map((item) => (
          <article key={item.title} className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="font-semibold text-zinc-900">{item.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{item.text}</p>
            <span className="mt-3 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              Bientôt
            </span>
          </article>
        ))}
      </section>
    </main>
  );
}
