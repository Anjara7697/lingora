export type ProgressStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export interface Program {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string;
  duration_weeks: number | null;
}

export interface ProgramListItem {
  program: Program;
  course_count: number;
  lesson_count: number;
}

export interface LessonSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  position: number;
  estimated_minutes: number | null;
}

export interface Enrollment {
  id: string;
  program_id: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  progress_percentage: string;
}

export interface ProgramDetail {
  program: Program;
  courses: {
    course: { id: string; title: string; description: string | null; estimated_minutes: number | null };
    lessons: { lesson: LessonSummary; status: ProgressStatus }[];
  }[];
  enrollment: Enrollment | null;
}

export interface EnrollmentItem {
  enrollment: Enrollment;
  program: Program;
}

export interface NextStep {
  enrollment: Enrollment;
  program: Program;
  lesson: LessonSummary | null;
  course: { id: string; title: string } | null;
}

export type ActivityType =
  | "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "MATCHING" | "ORDERING" | "TRANSLATION"
  | "LISTENING" | "READING" | "WRITING" | "SPEAKING" | "OPEN_QUESTION";

export interface ActivityConfig {
  question?: string;
  prompt?: string;
  example?: string;
  options?: string[];
  items?: string[];
  lefts?: string[];
  rights?: string[];
}

export interface ActivityItem {
  activity: {
    id: string;
    type: ActivityType;
    title: string;
    instructions: string | null;
    position: number;
    points: number;
  };
  config: ActivityConfig;
  graded: boolean;
  mastered: boolean;
  attempts: number;
}

export interface LessonProgress {
  status: ProgressStatus;
  progress_percentage: string;
}

export interface LessonDetail {
  lesson: LessonSummary;
  course: { id: string; title: string };
  program: { id: string; name: string; slug: string };
  contents: { id: string; type: string; title: string | null; body: string | null; url: string | null }[];
  activities: ActivityItem[];
  progress: LessonProgress | null;
  next_lesson: { id: string; title: string } | null;
}

export interface SubmitResult {
  graded: boolean;
  is_correct: boolean | null;
  score: string | null;
  points: number;
  correct_answer: unknown;
  explanation: string | null;
  lesson_progress: LessonProgress;
  lesson_completed: boolean;
}
