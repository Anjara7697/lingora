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

export const STATUS_LABEL: Record<StudentStatus, { label: string; cls: string }> = {
  NEW: { label: "Nouveau", cls: "bg-sky-100 text-sky-800" },
  ON_TRACK: { label: "Progression normale", cls: "bg-green-100 text-green-800" },
  LOW_ACTIVITY: { label: "Faible activité", cls: "bg-amber-100 text-amber-900" },
  SPEAKING_DIFFICULTY: { label: "Difficulté à l'oral", cls: "bg-orange-100 text-orange-900" },
  INACTIVE: { label: "Inactif", cls: "bg-red-100 text-red-800" },
};
