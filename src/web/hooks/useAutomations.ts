import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { ApiError, getJson, postJson } from "../api/fetcher";

export interface Automation {
  id: number;
  name: string;
  primary_location_id: number | null;
  source_yaml: string;
  state: "draft" | "active" | "disabled";
  generation_method: "manual" | "visual" | "llm";
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  run_count: number;
}

export interface AutomationRun {
  id: number;
  automation_id: number;
  started_at: string;
  duration_ms: number;
  ok: boolean;
  error: string | null;
  trigger_summary: Record<string, unknown>;
}

export const AUTOMATIONS_QUERY_KEY = ["automations"] as const;

export function useAutomations(): UseQueryResult<Automation[]> {
  return useQuery<Automation[]>({
    queryKey: AUTOMATIONS_QUERY_KEY,
    queryFn: () => getJson<Automation[]>("/api/automations"),
  });
}

export function useAutomationRuns(automationId: number | null) {
  return useQuery<AutomationRun[]>({
    queryKey: ["automation-runs", automationId],
    queryFn: () =>
      getJson<AutomationRun[]>(`/api/automations/${(automationId ?? 0).toString()}/runs`),
    enabled: automationId !== null,
  });
}

export interface CreateAutomationInput {
  name: string;
  description?: string;
  source_yaml: string;
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation<Automation, ApiError, CreateAutomationInput>({
    mutationFn: (input) => postJson<Automation>("/api/automations", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

async function patchYaml(id: number, source_yaml: string): Promise<Automation> {
  const res = await fetch(`/api/automations/${id.toString()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_yaml }),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      res.status,
      body,
      `PUT /api/automations/${id.toString()} ${res.status.toString()}`,
    );
  }
  return (await res.json()) as Automation;
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation<Automation, ApiError, { id: number; source_yaml: string }>({
    mutationFn: ({ id, source_yaml }) => patchYaml(id, source_yaml),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

function makeTransition(suffix: string) {
  return async (id: number): Promise<Automation> => {
    return postJson<Automation>(`/api/automations/${id.toString()}/${suffix}`, {});
  };
}

export function usePromote() {
  const qc = useQueryClient();
  return useMutation<Automation, ApiError, number>({
    mutationFn: makeTransition("promote"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

export function useDisable() {
  const qc = useQueryClient();
  return useMutation<Automation, ApiError, number>({
    mutationFn: makeTransition("disable"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

export function useEnable() {
  const qc = useQueryClient();
  return useMutation<Automation, ApiError, number>({
    mutationFn: makeTransition("enable"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

async function deleteAutomation(id: number): Promise<void> {
  const res = await fetch(`/api/automations/${id.toString()}`, { method: "DELETE" });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      res.status,
      body,
      `DELETE /api/automations/${id.toString()} ${res.status.toString()}`,
    );
  }
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: deleteAutomation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}
