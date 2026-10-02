import type { TokenPair } from "@/types/api";

const KEY = "lingora.tokens";

export function loadTokens(): TokenPair | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenPair): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(tokens));
  } catch {
    /* stockage indisponible (navigation privée) : la session ne survivra pas au rechargement */
  }
}

export function clearTokens(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* rien à faire */
  }
}
