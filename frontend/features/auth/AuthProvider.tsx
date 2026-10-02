"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiAuth, apiPublic } from "@/lib/api/client";
import { clearTokens, loadTokens, saveTokens } from "@/lib/auth/storage";
import type { AuthResult, User } from "@/types/api";

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ status: Status; user: User | null }>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      let next: { status: Status; user: User | null } = { status: "anonymous", user: null };
      if (loadTokens()) {
        try {
          next = { status: "authenticated", user: await apiAuth<User>("/me") };
        } catch {
          clearTokens();
        }
      }
      if (!cancelled) setState(next);
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback((result: AuthResult) => {
    saveTokens(result.tokens);
    setState({ status: "authenticated", user: result.user });
    return result.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: async (email, password) =>
        finish(
          await apiPublic<AuthResult>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          }),
        ),
      register: async (input) =>
        finish(
          await apiPublic<AuthResult>("/auth/register", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
      logout: () => {
        clearTokens();
        setState({ status: "anonymous", user: null });
      },
    }),
    [state, finish],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
