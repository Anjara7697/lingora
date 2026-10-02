import type { Cefr } from "@/types/placement";
import type { Scenario, SessionFeedback, Turn } from "@/types/speaking";

export type StudentStatus = "NEW" | "ON_TRACK" | "LOW_ACTIVITY" | "SPEAKING_DIFFICULTY" | "INACTIVE";

export interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  level: Cefr | null;
  progress: number | null;
  speaking_score: number | null;
  last_activity_at: string | null;
  status: StudentStatus;
}

export interface Dashboard {
  total_students: number;
  active_students: number;
  average_progress: number | null;
  status_counts: Record<StudentStatus, number>;
  needs_attention: StudentRow[];
}

export interface FeedbackItem {
  id: string;
  teacher_name: string;
  comment: string;
  score: string | null;
  speaking_session_id: string | null;
  lesson_id: string | null;
  created_at: string;
}

export interface StudentDetail {
  student: { id: string; first_name: string; last_name: string; email: string; created_at: string };
  status: StudentStatus;
  last_activity_at: string | null;
  current_level: Cefr | null;
  primary_goal: string | null;
  skills: { code: string; name: string; score: string; level: Cefr | null; last_assessed_at: string | null }[];
  enrollments: { program_name: string; program_slug: string; status: string; progress: string }[];
  placements: { attempt_id: string; completed_at: string | null; level: string | null; score: string | null }[];
  recent_attempts: {
    activity_title: string;
    lesson_title: string;
    is_correct: boolean | null;
    score: string | null;
    attempted_at: string;
  }[];
  speaking_sessions: {
    id: string;
    scenario_title: string;
    status: string;
    started_at: string;
    attempts: number;
    last_score: number | null;
  }[];
  feedback: FeedbackItem[];
}

export interface TeacherSessionDetail {
  session: { id: string; status: string };
  scenario: Scenario;
  turns: Turn[];
  feedback: SessionFeedback | null;
  student: { id: string; first_name: string; last_name: string };
  teacher_feedback: FeedbackItem[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}
