import type { Cefr, PrimaryGoal } from "@/types/placement";
import type { StudentStatus } from "@/types/teacher";

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

export const STATUS_LABEL: Record<StudentStatus, string> = {
  NEW: "Nouveau",
  ON_TRACK: "En bonne voie",
  LOW_ACTIVITY: "Faible activité",
  SPEAKING_DIFFICULTY: "Difficulté à l'oral",
  INACTIVE: "Inactif",
};
