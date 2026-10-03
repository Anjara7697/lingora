import type { TokenPair, User } from "@/types/api";

const KEY = "lingora.tokens";
const USER_KEY = "lingora.user";

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
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* rien à faire */
  }
}

/** Dernier profil connu : permet de rester connecté quand l'application s'ouvre sans réseau. */
export function loadCachedUser(): User | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveCachedUser(user: User | null): void {
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    /* stockage indisponible */
  }
}
