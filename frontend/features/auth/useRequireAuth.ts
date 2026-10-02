"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./AuthProvider";

/** Redirige vers /login si personne n'est connecté. Retourne true quand l'accès est confirmé. */
export function useRequireAuth(): boolean {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);
  return status === "authenticated";
}
