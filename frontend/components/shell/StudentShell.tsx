"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { STUDENT_TABS, hidesTabs, isActive, isFocusScreen } from "@/components/shell/nav";
import { buttonClass } from "@/components/ui/Button";
import { BellIcon, DownloadIcon, LogoutIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/features/auth/AuthProvider";
import { homeFor } from "@/features/auth/roles";
import { NOTIFICATIONS_CHANGED, myNotifications } from "@/lib/api/teacher";

function useUnread(enabled: boolean, pathname: string) {
  const [unread, setUnread] = useState(0);
  // Le compteur se rafraîchit à chaque navigation et quand une page signale un changement.
  useEffect(() => {
    if (!enabled) return;
    const refresh = () =>
      myNotifications()
        .then((n) => setUnread(n.unread))
        .catch(() => setUnread(0));
    void refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
  }, [enabled, pathname]);
  return unread;
}

function AvatarMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Le menu est « ouvert pour » une page : il se referme tout seul dès qu'on navigue.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpenAt(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = "flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-semibold text-ink hover:bg-canvas";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Mon compte"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
      >
        {user?.first_name?.[0]?.toUpperCase() ?? "?"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-lg bg-surface shadow-card ring-1 ring-line">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <Link role="menuitem" href="/downloads" className={item}>
            <DownloadIcon size={20} /> Mes leçons hors ligne
          </Link>
          <button
            role="menuitem"
            type="button"
            className={`${item} text-danger`}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogoutIcon size={20} /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

/** Écrans de liste : sur grand écran ils s'étalent sur deux colonnes ; les autres restent en colonne de lecture. */
const isWide = (pathname: string) => pathname === "/dashboard" || pathname === "/programs" || pathname === "/speaking";

function TopBar({ pathname }: { pathname: string }) {
  const { status, user } = useAuth();
  const student = user?.role === "STUDENT";
  const unread = useUnread(student, pathname);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className={`mx-auto flex h-14 w-full ${isWide(pathname) ? "max-w-3xl lg:max-w-5xl" : "max-w-3xl"} items-center justify-between gap-4 pl-5 pr-4`}>
        <Link href={user ? homeFor(user.role) : "/"} aria-label="Lingora, accueil" className="text-ink">
          <Logo size={24} />
        </Link>
        {/* Écran large : les quatre destinations passent dans la barre du haut. */}
        {student && (
          <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
            {STUDENT_TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={isActive(pathname, t) ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${isActive(pathname, t) ? "bg-brand-tint text-brand-strong" : "text-ink-2 hover:bg-canvas"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-1">
          {student && (
            <Link
              href="/notifications"
              aria-label={`Notifications (${unread} non lue(s))`}
              className="relative flex h-11 w-11 items-center justify-center text-ink"
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute right-[5px] top-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-ink ring-2 ring-white">
                  {unread}
                </span>
              )}
            </Link>
          )}
          {status === "authenticated" && <AvatarMenu />}
          {status === "anonymous" && (
            <Link href="/login" className={buttonClass("primary", "h-10 text-sm")}>
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomTabs({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-4">
        {STUDENT_TABS.map(({ icon: Icon, ...t }) => {
          const active = isActive(pathname, t);
          return (
            <li key={t.href} className="relative">
              {active && <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-[3px] bg-brand" />}
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-[3px] text-[11px] font-semibold ${active ? "text-ink" : "text-muted"}`}
              >
                <Icon fill={active ? "#e6f7f5" : "none"} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Coque élève : barre du haut + (sur mobile) barre d'onglets en bas, masquée dans les écrans à objectif unique. */
export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const tabs = user?.role === "STUDENT" && !hidesTabs(pathname);
  if (isFocusScreen(pathname)) return <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">{children}</div>;
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar pathname={pathname} />
      <main className={`mx-auto w-full ${isWide(pathname) ? "max-w-3xl lg:max-w-5xl" : "max-w-3xl"} flex-1 px-5 py-6 ${tabs ? "pb-[calc(6rem+var(--safe-bottom))] md:pb-8" : "pb-8"}`}>
        {children}
      </main>
      {tabs && <BottomTabs pathname={pathname} />}
    </div>
  );
}
