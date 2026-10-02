export interface Scenario {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  context: string | null;
  difficulty: string;
  estimated_minutes: number | null;
}

export interface Issue {
  kind: "ERROR" | "SUGGESTION" | "STYLE";
  original: string | null;
  suggestion: string | null;
  explanation: string;
}

export interface Dimension {
  score: number | null;
  issues: Issue[];
  note: string | null;
}

export interface Analysis {
  grammar: Dimension;
  vocabulary: Dimension;
  fluency: Dimension;
  relevance: Dimension;
  pronunciation: Dimension;
  strengths: string[];
  tips: string[];
}

export interface Turn {
  id: string;
  sequence_number: number;
  transcript: string | null;
  transcript_simulated: boolean;
  audio_url: string | null;
  overall_score: number | null;
  analysis: Analysis | null;
  created_at: string;
}

export interface SessionFeedback {
  overall_score: string | null;
  strengths: string[];
  improvements: Issue[];
  recommendations: string[];
  first_attempt_score: number | null;
  last_attempt_score: number | null;
  attempts: number;
}

export interface SessionDetail {
  session: { id: string; scenario_id: string; status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED" };
  scenario: Scenario;
  turns: Turn[];
  feedback: SessionFeedback | null;
  attempts_left_today: number;
}
