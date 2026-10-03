/** Stockage hors ligne (IndexedDB) : leçons téléchargées, réponses en attente et corrections reçues.
 *
 * Toutes les fonctions échouent « en douceur » (valeur vide) quand IndexedDB est indisponible
 * (navigation privée, stockage bloqué) : l'application reste utilisable, sans le mode hors ligne.
 * Chaque enregistrement porte l'identifiant de son propriétaire : un autre compte sur le même appareil n'y accède pas.
 */
import type { LessonDetail, ProgramDetail, SubmitResult } from "@/types/learning";

const DB_NAME = "lingora-offline";
type StoreName = "lessons" | "programs" | "queue" | "results";

export interface SavedLesson {
  id: string;
  userId: string;
  savedAt: number;
  lesson: LessonDetail;
}
export interface SavedProgram {
  slug: string;
  userId: string;
  savedAt: number;
  detail: ProgramDetail;
}
export interface QueuedAnswer {
  seq?: number;
  userId: string;
  activityId: string;
  answer: unknown;
  durationSeconds: number;
  answeredAt: number;
}
export interface StoredResult {
  activityId: string;
  userId: string;
  receivedAt: number;
  result: SubmitResult;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponible"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("lessons", { keyPath: "id" });
      db.createObjectStore("programs", { keyPath: "slug" });
      db.createObjectStore("queue", { keyPath: "seq", autoIncrement: true });
      db.createObjectStore("results", { keyPath: "activityId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const offlineSupported = () => typeof indexedDB !== "undefined";

// ---------- leçons et programmes ----------

export const saveLesson = (userId: string, lesson: LessonDetail) =>
  safe(false, async () => {
    await run("lessons", "readwrite", (s) => s.put({ id: lesson.lesson.id, userId, savedAt: Date.now(), lesson } satisfies SavedLesson));
    return true;
  });

export const getSavedLesson = (userId: string, id: string) =>
  safe<SavedLesson | null>(null, async () => {
    const rec = await run<SavedLesson | undefined>("lessons", "readonly", (s) => s.get(id));
    return rec && rec.userId === userId ? rec : null;
  });

export const listSavedLessons = (userId: string) =>
  safe<SavedLesson[]>([], async () => {
    const all = await run<SavedLesson[]>("lessons", "readonly", (s) => s.getAll());
    return all.filter((r) => r.userId === userId).sort((a, b) => b.savedAt - a.savedAt);
  });

export const removeSavedLesson = (id: string) =>
  safe(undefined, () => run("lessons", "readwrite", (s) => s.delete(id)));

export const saveProgram = (userId: string, detail: ProgramDetail) =>
  safe(false, async () => {
    await run("programs", "readwrite", (s) =>
      s.put({ slug: detail.program.slug, userId, savedAt: Date.now(), detail } satisfies SavedProgram),
    );
    return true;
  });

export const getSavedProgram = (userId: string, slug: string) =>
  safe<SavedProgram | null>(null, async () => {
    const rec = await run<SavedProgram | undefined>("programs", "readonly", (s) => s.get(slug));
    return rec && rec.userId === userId ? rec : null;
  });

// ---------- réponses en attente ----------

export const enqueueAnswer = (a: Omit<QueuedAnswer, "seq">) =>
  safe(false, async () => {
    await run("queue", "readwrite", (s) => s.add(a));
    return true;
  });

export const pendingAnswers = (userId: string) =>
  safe<QueuedAnswer[]>([], async () => {
    const all = await run<QueuedAnswer[]>("queue", "readonly", (s) => s.getAll());
    return all.filter((a) => a.userId === userId);
  });

export const allPendingAnswers = () => safe<QueuedAnswer[]>([], () => run("queue", "readonly", (s) => s.getAll()));

export const removeQueued = (seq: number) => safe(undefined, () => run("queue", "readwrite", (s) => s.delete(seq)));

// ---------- corrections reçues après synchronisation ----------

export const putResult = (userId: string, activityId: string, result: SubmitResult) =>
  safe(undefined, () =>
    run("results", "readwrite", (s) => s.put({ activityId, userId, receivedAt: Date.now(), result } satisfies StoredResult)),
  );

export const getStoredResult = (userId: string, activityId: string) =>
  safe<SubmitResult | null>(null, async () => {
    const rec = await run<StoredResult | undefined>("results", "readonly", (s) => s.get(activityId));
    return rec && rec.userId === userId ? rec.result : null;
  });

export const deleteStoredResult = (activityId: string) =>
  safe(undefined, () => run("results", "readwrite", (s) => s.delete(activityId)));

// ---------- nettoyage ----------

/** Déconnexion : tout ce qui est stocké sur l'appareil disparaît (appareil partagé). */
export const clearOfflineData = () =>
  safe(undefined, async () => {
    for (const store of ["lessons", "programs", "queue", "results"] as const) {
      await run(store, "readwrite", (s) => s.clear());
    }
  });

/** Connexion d'un autre compte : on supprime ce qui appartenait au précédent. */
export const purgeOtherUsers = (userId: string) =>
  safe(undefined, async () => {
    const lessons = await run<SavedLesson[]>("lessons", "readonly", (s) => s.getAll());
    for (const l of lessons) if (l.userId !== userId) await removeSavedLesson(l.id);
    const programs = await run<SavedProgram[]>("programs", "readonly", (s) => s.getAll());
    for (const p of programs) if (p.userId !== userId) await run("programs", "readwrite", (s) => s.delete(p.slug));
    for (const q of await allPendingAnswers()) if (q.userId !== userId && q.seq !== undefined) await removeQueued(q.seq);
  });
