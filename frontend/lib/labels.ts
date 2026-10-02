import type { Cefr, PrimaryGoal } from "@/types/placement";

export const SKILL_LABEL: Record<string, string> = {
  GRAMMAR: "Grammaire",
  VOCABULARY: "Vocabulaire",
  READING: "Lecture",
  LISTENING: "Compréhension orale",
  WRITING: "Écriture",
  SPEAKING: "Expression orale",
  PRONUNCIATION: "Prononciation",
  FLUENCY: "Fluidité",
};

export const LEVEL_LABEL: Record<Cefr, string> = {
  A1: "Débutant",
  A2: "Élémentaire",
  B1: "Intermédiaire",
  B2: "Intermédiaire supérieur",
  C1: "Avancé",
  C2: "Maîtrise",
};

export const GOAL_LABEL: Record<PrimaryGoal, string> = {
  IMPROVE_SPEAKING: "Améliorer mon oral",
  PREPARE_INTERVIEW: "Préparer un entretien",
  ENGLISH_FOR_WORK: "L'anglais pour le travail",
  STUDY: "Mes études",
  TRAVEL: "Voyager",
  BUSINESS_ENGLISH: "Anglais des affaires",
  GENERAL_ENGLISH: "Anglais général",
};
