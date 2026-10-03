import type { Role } from "@/types/api";

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
}

export interface UserPage {
  items: AdminUser[];
  total: number;
}

export interface TeacherItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_count: number;
}

export interface StudentItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Roster {
  teacher: TeacherItem;
  assigned: StudentItem[];
  available: StudentItem[];
}

export interface Analytics {
  generated_at: string;
  users: { students: number; teachers: number; new_7d: number; new_30d: number };
  activity: { active_7d: number; active_30d: number };
  north_star: { value: number; of_active_30d: number };
  funnel: { key: string; label: string; count: number }[];
  learning: { lessons_completed: number; exercises_7d: number };
  speaking: { attempts_30d: number; average_score_30d: number | null; ai_calls_30d: number };
  series: { date: string; new_students: number; exercises: number; speaking_attempts: number }[];
  definitions: Record<string, string>;
}
