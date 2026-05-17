import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../api/fetcher";
import { SETUP_STATE_QUERY_KEY } from "./useFirstRun";

export function useCompleteSetup() {
  const qc = useQueryClient();
  return useMutation<{ firstRunComplete: boolean }, Error, void>({
    mutationFn: () =>
      postJson<{ firstRunComplete: boolean }>("/api/setup-state", {
        firstRunComplete: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SETUP_STATE_QUERY_KEY });
    },
  });
}
