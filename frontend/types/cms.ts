import type { ActivityType } from "@/types/learning";

export type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type Difficulty = "BEGINNER" | "ELEMENTARY" | "INTERMEDIATE" | "UPPER_INTERMEDIATE" | "ADVANCED";

export interface CmsProgram {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  difficulty: Difficulty;
  duration_weeks: number | null;
  status: Status;
}

export interface CmsProgramItem {
  program: CmsProgram;
  course_count: number;
  lesson_count: number;
  enrolled_students: number;
}

export interface LessonBrief {
  id: string;
  title: string;
  slug: string;
  position: number;
  status: Status;
  activity_count: number;
}

export interface CmsCourse {
  id: string;
  program_id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: Difficulty;
  estimated_minutes: number | null;
  position: number;
  status: Status;
}

export interface CmsProgramDetail {
  program: CmsProgram;
  courses: { course: CmsCourse; lessons: LessonBrief[] }[];
  enrolled_students: number;
}

export interface CmsContent {
  id: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "EXTERNAL_LINK";
  title: string | null;
  body: string | null;
  url: string | null;
}

export type ActivityConfig = Record<string, unknown>;

export interface CmsActivity {
  id: string;
  type: ActivityType;
  title: string;
  instructions: string | null;
  position: number;
  points: number;
  difficulty: Difficulty | null;
  configuration: ActivityConfig | null;
  attempts: number;
}

export interface CmsLessonDetail {
  lesson: { id: string; course_id: string; title: string; slug: string; description: string | null; estimated_minutes: number | null; position: number; status: Status };
  program: { id: string; name: string };
  course: { id: string; title: string };
  contents: { position: number; content: CmsContent }[];
  activities: CmsActivity[];
}

export interface CmsScenario {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  context: string | null;
  difficulty: Difficulty;
  estimated_minutes: number | null;
  is_published: boolean;
}
