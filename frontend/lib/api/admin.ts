import { apiAuth } from "@/lib/api/client";
import type { Role } from "@/types/api";
import type { AdminUser, Analytics, Roster, TeacherItem, UserPage, UserStatus } from "@/types/admin";

export const getAnalytics = () => apiAuth<Analytics>("/admin/analytics");

export function listUsers(p: { search?: string; role?: Role | ""; status?: UserStatus | ""; offset?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (p.search) q.set("search", p.search);
  if (p.role) q.set("role", p.role);
  if (p.status) q.set("status", p.status);
  q.set("limit", String(p.limit ?? 20));
  q.set("offset", String(p.offset ?? 0));
  return apiAuth<UserPage>(`/admin/users?${q}`);
}

export const createUser = (body: { email: string; first_name: string; last_name: string; role: Role; password: string }) =>
  apiAuth<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(body) });

export const updateUser = (id: string, body: { role?: Role; status?: "ACTIVE" | "SUSPENDED" }) =>
  apiAuth<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const resetPassword = (id: string, password: string) =>
  apiAuth<void>(`/admin/users/${id}/password`, { method: "POST", body: JSON.stringify({ password }) });

export const listTeachers = () => apiAuth<TeacherItem[]>("/admin/teachers");

export const getRoster = (teacherId: string, search = "") =>
  apiAuth<Roster>(`/admin/teachers/${teacherId}/roster${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const assignStudents = (teacherId: string, studentIds: string[]) =>
  apiAuth<{ added: number }>(`/admin/teachers/${teacherId}/students`, {
    method: "POST",
    body: JSON.stringify({ student_ids: studentIds }),
  });

export const unassignStudent = (teacherId: string, studentId: string) =>
  apiAuth<void>(`/admin/teachers/${teacherId}/students/${studentId}`, { method: "DELETE" });
