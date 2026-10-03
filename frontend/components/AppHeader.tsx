"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { homeFor, isStaff } from "@/features/auth/roles";
import { NOTIFICATIONS_CHANGED, myNotifications } from "@/lib/api/teacher";

const link = "whitespace-nowrap text-zinc-700 hover:text-indigo-600";

export function AppHeader() {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const student = user?.role === "STUDENT";

  // Le compteur se rafraîchit à chaque navigation et quand une page signale un changement.
  useEffect(() => {
    if (!student) return;
    const refresh = () =>
      myNotifications()
        .then((n) => setUnread(n.unread))
        .catch(() => setUnread(0));
    void refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
  }, [student, pathname]);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
        <Link href={user ? homeFor(user.role) : "/"} className="text-lg font-bold text-zinc-900">
          Lingora
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
          {user?.role === "ADMIN" ? (
            <>
              <Link href="/admin" className={link}>
                Statistiques
              </Link>
              <Link href="/admin/users" className={link}>
                Utilisateurs
              </Link>
              <Link href="/admin/teachers" className={link}>
                Enseignants
              </Link>
              <Link href="/teacher" className={link}>
                Élèves
              </Link>
            </>
          ) : isStaff(user?.role) ? (
            <Link href="/teacher" className={link}>
              Mes élèves
            </Link>
          ) : (
            <>
              {user && (
                <Link href="/dashboard" className={link}>
                  Tableau de bord
                </Link>
              )}
              <Link href="/programs" className={link}>
                Programmes
              </Link>
              <Link href="/speaking" className={link}>
                Speaking
              </Link>
            </>
          )}
          {student && (
            <Link href="/notifications" className={link} aria-label={`Notifications (${unread} non lue(s))`}>
              🔔
              {unread > 0 && (
                <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{unread}</span>
              )}
            </Link>
          )}
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
