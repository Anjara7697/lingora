import type { Role } from "@/types/api";

export const isStaff = (role?: Role | null) => role === "TEACHER" || role === "ADMIN";

/** Page d'accueil de chaque rôle après connexion. */
export function homeFor(role?: Role | null): string {
  if (role === "ADMIN") return "/admin";
  return role === "TEACHER" ? "/teacher" : "/dashboard";
}
