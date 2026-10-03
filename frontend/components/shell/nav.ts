import type { ComponentType } from "react";

import { BookIcon, HomeIcon, type IconProps, MicIcon, StarIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  /** Préfixes de chemin qui rendent l'entrée active (par défaut : le lien lui-même et ses sous-pages). */
  match?: string[];
  exact?: boolean;
}

export const isActive = (pathname: string, item: NavItem) =>
  item.exact
    ? pathname === item.href
    : (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const STUDENT_TABS: (NavItem & { icon: ComponentType<IconProps> })[] = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/programs", label: "Programmes", icon: BookIcon, match: ["/programs", "/lessons"] },
  { href: "/speaking", label: "Speaking", icon: MicIcon },
  { href: "/billing", label: "Premium", icon: StarIcon },
];

/** Écrans à objectif unique : la barre d'onglets disparaît pour ne garder qu'une chose à l'écran. */
export const hidesTabs = (pathname: string) =>
  pathname.startsWith("/lessons/") ||
  /^\/speaking\/[^/]+/.test(pathname) ||
  pathname === "/placement" ||
  pathname === "/onboarding";

/** Leçon et session d'oral : plein écran, sans barre du haut — la page affiche son propre en-tête avec retour. */
export const isFocusScreen = (pathname: string) => pathname.startsWith("/lessons/") || /^\/speaking\/[^/]+/.test(pathname);

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/admin", label: "Statistiques", exact: true },
      { href: "/admin/payments", label: "Paiements" },
    ],
  },
  {
    title: "Personnes",
    items: [
      { href: "/admin/users", label: "Utilisateurs" },
      { href: "/admin/teachers", label: "Enseignants" },
      { href: "/teacher", label: "Élèves" },
    ],
  },
  { title: "Contenu", items: [{ href: "/admin/content", label: "Programmes & exercices" }] },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/teacher", label: "Mes élèves" },
      { href: "/admin/content", label: "Contenu" },
    ],
  },
];
