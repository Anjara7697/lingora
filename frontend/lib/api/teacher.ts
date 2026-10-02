import { apiAuth } from "@/lib/api/client";
import type {
  AppNotification,
  Dashboard,
  FeedbackItem,
  StudentDetail,
  StudentRow,
  StudentStatus,
  TeacherSessionDetail,
} from "@/types/teacher";

export const getDashboard = () => apiAuth<Dashboard>("/teacher/dashboard");

export function listStudents(search: string, status: StudentStatus | null) {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  if (status) q.set("status", status);
  const qs = q.toString();
  return apiAuth<StudentRow[]>(`/teacher/students${qs ? `?${qs}` : ""}`);
}

export const getStudent = (id: string) => apiAuth<StudentDetail>(`/teacher/students/${id}`);

export const getStudentSession = (studentId: string, sessionId: string) =>
  apiAuth<TeacherSessionDetail>(`/teacher/students/${studentId}/speaking/${sessionId}`);

export const sendFeedback = (
  studentId: string,
  body: { comment: string; score?: number | null; speaking_session_id?: string | null },
) =>
  apiAuth<FeedbackItem>(`/teacher/students/${studentId}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// ----- côté élève -----
export async function myNotifications() {
  // l'enveloppe porte aussi meta.unread ; on le recalcule côté client pour garder un seul type de retour
  const items = await apiAuth<AppNotification[]>("/me/notifications");
  return { items, unread: items.filter((n) => !n.read_at).length };
}

/** Événement navigateur : une page a modifié les notifications, l'en-tête doit recompter. */
export const NOTIFICATIONS_CHANGED = "lingora:notifications-changed";

export const markNotificationRead = (id: string) =>
  apiAuth<void>(`/me/notifications/${id}/read`, { method: "POST" }).then(() =>
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)),
  );

export const markAllNotificationsRead = () =>
  apiAuth<void>("/me/notifications/read-all", { method: "POST" }).then(() =>
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)),
  );
