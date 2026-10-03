import { getLesson } from "@/lib/api/learning";
import { getSavedLesson, saveLesson, saveProgram } from "@/lib/offline/db";
import { primePages } from "@/lib/offline/pages";
import type { LessonDetail, ProgramDetail } from "@/types/learning";

const SHELL_PAGES = ["/downloads"];

export async function downloadLesson(userId: string, id: string): Promise<LessonDetail> {
  const lesson = await getLesson(id);
  await saveLesson(userId, lesson);
  await primePages([`/lessons/${id}`, ...SHELL_PAGES]);
  return lesson;
}

/** Télécharge toutes les leçons accessibles d'un programme (les leçons verrouillées sont ignorées). */
export async function downloadProgram(
  userId: string,
  detail: ProgramDetail,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const ids = detail.courses.flatMap((c) => c.lessons.filter((l) => l.status !== "LOCKED").map((l) => l.lesson.id));
  let done = 0;
  for (const id of ids) {
    await downloadLesson(userId, id);
    onProgress?.(++done, ids.length);
  }
  await saveProgram(userId, detail);
  await primePages([`/programs/${detail.program.slug}`]);
  return ids.length;
}

/** Garde à jour une leçon déjà téléchargée quand on la rouvre avec du réseau. */
export async function refreshIfSaved(userId: string, lesson: LessonDetail): Promise<void> {
  if (await getSavedLesson(userId, lesson.lesson.id)) await saveLesson(userId, lesson);
}
