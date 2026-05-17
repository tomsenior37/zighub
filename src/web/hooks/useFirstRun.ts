import { useQuery } from "@tanstack/react-query";
import { getJson } from "../api/fetcher";

export const SETUP_STATE_QUERY_KEY = ["setup-state"] as const;

interface SetupState {
  firstRunComplete: boolean;
}

export function useSetupState() {
  return useQuery<SetupState>({
    queryKey: SETUP_STATE_QUERY_KEY,
    queryFn: () => getJson<SetupState>("/api/setup-state"),
    staleTime: 60_000,
  });
}

export async function fetchIsFirstRun(): Promise<boolean> {
  try {
    const state = await getJson<SetupState>("/api/setup-state");
    return !state.firstRunComplete;
  } catch {
    return true;
  }
}

export function isFirstRun(): boolean {
  return true;
}

export function useFirstRun(): boolean {
  const { data } = useSetupState();
  return data ? !data.firstRunComplete : true;
}
