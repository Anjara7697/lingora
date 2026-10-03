import { ApiError } from "@/lib/api/client";

export type FormNotice = { tone: "error" | "info"; title?: string; text: string; clock?: boolean };

/** Traduit une erreur d'appel en message de formulaire : réseau, trop de demandes (429) ou message du serveur. */
export function noticeFor(err: unknown, fallbackTitle = "Une erreur est survenue."): FormNotice {
  if (err instanceof ApiError) {
    if (err.status === 0) return { tone: "error", title: "Serveur injoignable.", text: "Vérifiez votre connexion puis réessayez." };
    if (err.status === 429) return { tone: "info", text: err.message, clock: true };
    return { tone: "error", text: err.message };
  }
  return { tone: "error", title: fallbackTitle, text: "Réessayez dans un instant." };
}
