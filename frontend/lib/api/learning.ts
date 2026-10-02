import { apiAuth, apiPublic } from "@/lib/api/client";
import { loadTokens } from "@/lib/auth/storage";
import type {
  EnrollmentItem,
  Enrollment,
  LessonDetail,
  NextStep,
  ProgramDetail,
  ProgramListItem,
  SubmitResult,
} from "@/types/learning";

export const listPrograms = () => apiPublic<ProgramListItem[]>("/programs");

/** Détail public ; enrichi (progression, inscription) si l'utilisateur est connecté. */
export const getProgram = (slug: string) =>
  loadTokens() ? apiAuth<ProgramDetail>(`/programs/${slug}`) : apiPublic<ProgramDetail>(`/programs/${slug}`);

export const enroll = (programId: string) =>
  apiAuth<Enrollment>(`/programs/${programId}/enroll`, { method: "POST" });

export const myEnrollments = () => apiAuth<EnrollmentItem[]>("/me/enrollments");
export const nextStep = () => apiAuth<NextStep | null>("/me/next");
export const getLesson = (id: string) => apiAuth<LessonDetail>(`/lessons/${id}`);

export const submitActivity = (id: string, answer: unknown, durationSeconds?: number) =>
  apiAuth<SubmitResult>(`/activities/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ answer, duration_seconds: durationSeconds }),
  });
