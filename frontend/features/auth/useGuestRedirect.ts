"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./AuthProvider";

/** Un utilisateur déjà connecté n'a rien à faire sur /login ou /register. */
export function useGuestRedirect() {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);
}
