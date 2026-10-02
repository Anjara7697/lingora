"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { Role } from "@/types/api";

import { useAuth } from "./AuthProvider";
import { homeFor } from "./roles";

/** Accès réservé à certains rôles : anonyme -> /login ; mauvais rôle -> sa propre page d'accueil. */
export function useRequireRole(roles: Role[]): boolean {
  const { status, user } = useAuth();
  const router = useRouter();
  const allowed = status === "authenticated" && !!user && roles.includes(user.role);
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    else if (status === "authenticated" && user && !roles.includes(user.role)) router.replace(homeFor(user.role));
  }, [status, user, roles, router]);
  return allowed;
}
