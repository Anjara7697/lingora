import { apiAuth } from "@/lib/api/client";
import type { Onboarding, PlacementResult, PlacementStart, PrimaryGoal } from "@/types/placement";

export const startPlacement = () => apiAuth<PlacementStart>("/placement/start", { method: "POST" });

export const savePlacementAnswer = (attemptId: string, questionId: string, answer: number) =>
  apiAuth<void>(`/placement/${attemptId}/answers/${questionId}`, {
    method: "PUT",
    body: JSON.stringify({ answer }),
  });

export const completePlacement = (attemptId: string) =>
  apiAuth<PlacementResult>(`/placement/${attemptId}/complete`, { method: "POST" });

export const latestPlacementResult = () => apiAuth<PlacementResult | null>("/placement/result");

export const getOnboarding = () => apiAuth<Onboarding | null>("/me/onboarding");

export const saveOnboarding = (primary_goal: PrimaryGoal, daily_minutes: number) =>
  apiAuth<Onboarding>("/me/onboarding", {
    method: "PUT",
    body: JSON.stringify({ primary_goal, daily_minutes }),
  });
