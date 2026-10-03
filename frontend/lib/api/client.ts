import { clearTokens, loadTokens, saveTokens } from "@/lib/auth/storage";
import type { ApiErrorBody, Envelope, TokenPair } from "@/types/api";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(body.message);
  }

  /** Message du serveur pour un champ de formulaire donné, s'il existe. */
  fieldError(field: string): string | undefined {
    return this.body.details?.find((d) => d.field === field)?.message;
  }
}

async function request(path: string, init: RequestInit, token?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  // JSON par défaut ; pour FormData (upload) le navigateur fixe lui-même le Content-Type multipart.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
    });
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* réponse non JSON */
  }
  if (!res.ok || !body || body.error) {
    throw new ApiError(
      res.status,
      body?.error ?? { code: "UNKNOWN_ERROR", message: "Une erreur est survenue." },
    );
  }
  return body.data as T;
}

let refreshing: Promise<TokenPair | null> | null = null;

async function refreshTokens(): Promise<TokenPair | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  refreshing ??= (async () => {
    try {
      const res = await request("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });
      const fresh = await parse<TokenPair>(res);
      saveTokens(fresh);
      return fresh;
    } catch (e) {
      // Une coupure réseau n'est pas une session expirée : on garde les jetons pour la reconnexion.
      if (!(e instanceof ApiError && e.status === 0)) clearTokens();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Appel API public (sans jeton). */
export async function apiPublic<T>(path: string, init: RequestInit = {}): Promise<T> {
  return parse<T>(await request(path, init));
}

/** Appel API authentifié ; rafraîchit le jeton une fois sur 401. */
export async function apiAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init, loadTokens()?.access_token);
  if (res.status === 401) {
    const fresh = await refreshTokens();
    if (fresh) res = await request(path, init, fresh.access_token);
  }
  return parse<T>(res);
}
