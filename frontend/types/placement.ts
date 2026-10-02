export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface PlacementQuestion {
  id: string;
  position: number;
  type: string;
  config: { question: string; options: string[] };
}

export interface PlacementStart {
  attempt_id: string;
  assessment: { id: string; name: string; description: string | null; instructions: string | null };
  questions: PlacementQuestion[];
  answers: Record<string, number>;
}

export interface SkillResult {
  code: string;
  name: string;
  score: string;
  level: Cefr | null;
  confidence: string | null;
}

export interface PlacementResult {
  attempt_id: string;
  completed_at: string | null;
  overall_level: Cefr;
  overall_score: string | null;
  skills: SkillResult[];
  strongest: string | null;
  weakest: string | null;
  recommended_program_slug: string | null;
}

export type PrimaryGoal =
  | "IMPROVE_SPEAKING" | "PREPARE_INTERVIEW" | "ENGLISH_FOR_WORK" | "STUDY"
  | "TRAVEL" | "BUSINESS_ENGLISH" | "GENERAL_ENGLISH";

export interface Onboarding {
  primary_goal: PrimaryGoal;
  daily_minutes: number | null;
}
