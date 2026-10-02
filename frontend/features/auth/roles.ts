import type { Role } from "@/types/api";

export const isStaff = (role?: Role | null) => role === "TEACHER" || role === "ADMIN";

/** Page d'accueil de chaque rôle après connexion. */
export const homeFor = (role?: Role | null) => (isStaff(role) ? "/teacher" : "/dashboard");
