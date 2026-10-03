import { ApiError } from "@/lib/api/client";
import { submitActivity } from "@/lib/api/learning";
import { pendingAnswers, putResult, removeQueued } from "@/lib/offline/db";

export const SYNCED_EVENT = "lingora:synced";
export interface SyncReport {
  synced: number;
  dropped: number;
}

let running = false;

/** Envoie, dans l'ordre, les réponses données sans réseau ; la correction est conservée pour l'élève.
 *
 * Une réponse reste en attente tant que le réseau ou la session posent problème ; elle est abandonnée
 * seulement si le serveur la refuse définitivement (leçon retirée, inscription terminée…).
 */
export async function syncPending(userId: string): Promise<SyncReport> {
  const report: SyncReport = { synced: 0, dropped: 0 };
  if (running || (typeof navigator !== "undefined" && !navigator.onLine)) return report;
  running = true;
  try {
    for (const item of await pendingAnswers(userId)) {
      try {
        const result = await submitActivity(item.activityId, item.answer, item.durationSeconds);
        await putResult(userId, item.activityId, result);
        report.synced += 1;
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0;
        if (status === 0 || status === 401 || status === 429 || status >= 500) break; // on réessaiera plus tard
        report.dropped += 1;
      }
      if (item.seq !== undefined) await removeQueued(item.seq);
    }
  } finally {
    running = false;
  }
  if ((report.synced || report.dropped) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SyncReport>(SYNCED_EVENT, { detail: report }));
  }
  return report;
}
