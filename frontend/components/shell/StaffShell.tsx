"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ADMIN_NAV, type NavGroup, TEACHER_NAV, isActive } from "@/components/shell/nav";
import { CrossIcon, LogoutIcon, MenuIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/features/auth/AuthProvider";

function SidebarContent({ groups, role, onNavigate }: { groups: NavGroup[]; role: string; onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-1 bg-ink px-3.5 py-5 text-slate-300">
      <div className={`flex items-center gap-2.5 px-2 pb-4 ${onNavigate ? "pr-10" : ""}`}>
        <Logo variant="blanc" size={26} className="text-white" />
        <span className="ml-auto text-[11px] font-semibold text-brand">{role}</span>
      </div>
      <nav aria-label="Navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {groups.map((g, i) => (
          <div key={g.title ?? i} className="flex flex-col gap-1">
            {g.title && (
              <p className="px-2.5 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{g.title}</p>
            )}
            {g.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold ${active ? "bg-brand/15 text-white shadow-[inset_3px_0_0_#14b8a6]" : "hover:bg-white/5"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 pt-3">
        <p className="truncate px-2.5 text-sm font-semibold text-white">
          {user?.first_name} {user?.last_name}
        </p>
        <p className="mb-2 truncate px-2.5 text-xs text-slate-400">{user?.email}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-semibold hover:bg-white/5"
        >
          <LogoutIcon size={18} /> Déconnexion
        </button>
      </div>
    </div>
  );
}

/** Coque enseignant / admin : barre latérale fixe de 248 px dès 1024 px, sinon tiroir ouvert depuis l'en-tête. */
export function StaffShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null); // tiroir « ouvert pour » une page : se referme à la navigation
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const admin = user?.role === "ADMIN";
  const groups = admin ? ADMIN_NAV : TEACHER_NAV;
  const role = admin ? "ADMIN" : "ENSEIGNANT";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] lg:block">
        <SidebarContent groups={groups} role={role} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface pl-2 pr-5 lg:hidden">
        <button type="button" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center text-ink">
          <MenuIcon />
        </button>
        <Logo size={24} className="text-ink" />
        <span className="text-[11px] font-semibold text-brand-strong">{role}</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-card">
            <SidebarContent groups={groups} role={role} onNavigate={() => setOpen(false)} />
            <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center text-white">
              <CrossIcon size={20} />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-4xl px-5 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
