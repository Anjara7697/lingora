import { BASE_URL, apiAuth, apiPublic } from "@/lib/api/client";
import type { Scenario, SessionDetail, Turn } from "@/types/speaking";

export const listScenarios = () => apiPublic<Scenario[]>("/speaking/scenarios");

export const createSession = (scenarioId: string) =>
  apiAuth<{ id: string }>("/speaking/sessions", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId }),
  });

export const getSession = (id: string) => apiAuth<SessionDetail>(`/speaking/sessions/${id}`);

export function submitTurn(sessionId: string, audio: Blob, durationSeconds: number, transcript: string) {
  const form = new FormData();
  form.append("audio", audio, "recording");
  form.append("duration_seconds", String(durationSeconds));
  form.append("transcript", transcript);
  return apiAuth<Turn>(`/speaking/sessions/${sessionId}/turns`, { method: "POST", body: form });
}

export const completeSession = (id: string) =>
  apiAuth<SessionDetail>(`/speaking/sessions/${id}/complete`, { method: "POST" });

/** Les URLs audio renvoyées par l'API sont relatives et signées (5 min). */
export const mediaUrl = (path: string | null) => (path ? `${BASE_URL}${path}` : undefined);
