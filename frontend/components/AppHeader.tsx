"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/AuthProvider";

export function AppHeader() {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="text-lg font-bold text-zinc-900">
          Lingora
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {user && (
            <Link href="/dashboard" className="whitespace-nowrap text-zinc-700 hover:text-indigo-600">
              Tableau de bord
            </Link>
          )}
          <Link href="/programs" className="text-zinc-700 hover:text-indigo-600">
            Programmes
          </Link>
          {status === "authenticated" ? (
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
            >
              Déconnexion
            </button>
          ) : (
            status === "anonymous" && (
              <Link href="/login" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700">
                Se connecter
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
