import { ApiError, apiAuth } from "@/lib/api/client";
import type {
  ActivityConfig,
  CmsActivity,
  CmsContent,
  CmsCourse,
  CmsLessonDetail,
  CmsProgram,
  CmsProgramDetail,
  CmsProgramItem,
  CmsScenario,
  Difficulty,
} from "@/types/cms";
import type { ActivityType } from "@/types/learning";

const json = (method: string, body?: unknown) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const base = "/cms";

/** Messages lisibles d'une erreur API : le détail champ par champ s'il existe, sinon le message général. */
export function errorMessages(e: unknown): string[] {
  if (e instanceof ApiError && e.body.details?.length) return e.body.details.map((d) => d.message);
  return [e instanceof Error ? e.message : "Une erreur est survenue."];
}

// programmes
export const listPrograms = () => apiAuth<CmsProgramItem[]>(`${base}/programs`);
export const createProgram = (b: { name: string; difficulty: Difficulty; description?: string; duration_weeks?: number | null }) =>
  apiAuth<CmsProgram>(`${base}/programs`, json("POST", b));
export const getProgram = (id: string) => apiAuth<CmsProgramDetail>(`${base}/programs/${id}`);
export const updateProgram = (id: string, b: Partial<CmsProgram>) => apiAuth<CmsProgram>(`${base}/programs/${id}`, json("PATCH", b));
export const setPublished = (kind: "programs" | "courses" | "lessons" | "scenarios", id: string, published: boolean) =>
  apiAuth<unknown>(`${base}/${kind}/${id}/${published ? "publish" : "unpublish"}`, json("POST"));
export const archive = (kind: "programs" | "courses" | "lessons" | "activities", id: string) =>
  apiAuth<void>(`${base}/${kind}/${id}`, json("DELETE"));

// cours & leçons
export const createCourse = (programId: string, b: { title: string; difficulty: Difficulty; description?: string }) =>
  apiAuth<CmsCourse>(`${base}/programs/${programId}/courses`, json("POST", b));
export const updateCourse = (id: string, b: Partial<CmsCourse>) => apiAuth<CmsCourse>(`${base}/courses/${id}`, json("PATCH", b));
export const createLesson = (courseId: string, b: { title: string; description?: string; estimated_minutes?: number | null }) =>
  apiAuth<{ id: string }>(`${base}/courses/${courseId}/lessons`, json("POST", b));
export const getLesson = (id: string) => apiAuth<CmsLessonDetail>(`${base}/lessons/${id}`);
export const updateLesson = (id: string, b: { title?: string; description?: string | null; estimated_minutes?: number | null }) =>
  apiAuth<unknown>(`${base}/lessons/${id}`, json("PATCH", b));
export const reorder = (kind: "programs/%/courses" | "courses/%/lessons" | "lessons/%/contents" | "lessons/%/activities", parentId: string, ids: string[]) =>
  apiAuth<void>(`${base}/${kind.replace("%", parentId)}/reorder`, json("POST", { ids }));

// contenus & exercices
export const addContent = (lessonId: string, b: { type: CmsContent["type"]; title?: string; body?: string; url?: string }) =>
  apiAuth<unknown>(`${base}/lessons/${lessonId}/contents`, json("POST", b));
export const updateContent = (id: string, b: { title?: string; body?: string; url?: string }) =>
  apiAuth<unknown>(`${base}/contents/${id}`, json("PATCH", b));
export const deleteContent = (id: string) => apiAuth<void>(`${base}/contents/${id}`, json("DELETE"));

export interface ActivityPayload {
  type: ActivityType;
  title: string;
  instructions?: string | null;
  points: number;
  configuration: ActivityConfig;
}
export const createActivity = (lessonId: string, b: ActivityPayload) =>
  apiAuth<CmsActivity>(`${base}/lessons/${lessonId}/activities`, json("POST", b));
export const updateActivity = (id: string, b: Partial<ActivityPayload>) =>
  apiAuth<CmsActivity>(`${base}/activities/${id}`, json("PATCH", b));

// situations d'oral
export const listScenarios = () => apiAuth<CmsScenario[]>(`${base}/scenarios`);
export const createScenario = (b: { title: string; description?: string; context: string; difficulty: Difficulty; estimated_minutes?: number | null }) =>
  apiAuth<CmsScenario>(`${base}/scenarios`, json("POST", b));
export const updateScenario = (id: string, b: Partial<CmsScenario>) => apiAuth<CmsScenario>(`${base}/scenarios/${id}`, json("PATCH", b));
