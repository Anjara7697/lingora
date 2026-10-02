"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./AuthProvider";
import { homeFor } from "./roles";

/**
 * Un utilisateur déjà connecté n'a rien à faire sur /login ou /register.
 * `enabled=false` pendant l'envoi du formulaire : la page décide elle-même de la destination.
 */
export function useGuestRedirect(enabled = true) {
  const { status, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (enabled && status === "authenticated") router.replace(homeFor(user?.role));
  }, [enabled, status, user, router]);
}
