import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, postJson } from "../api/fetcher";

export interface PermitJoinStatus {
  active: boolean;
  remainingSec: number;
}

export const PERMIT_JOIN_QUERY_KEY = ["network", "permit-join"] as const;

export function usePermitJoinStatus(opts: { enabled: boolean; intervalMs?: number }) {
  return useQuery<PermitJoinStatus>({
    queryKey: PERMIT_JOIN_QUERY_KEY,
    queryFn: () => getJson<PermitJoinStatus>("/api/network/permit-join"),
    enabled: opts.enabled,
    refetchInterval: opts.enabled ? (opts.intervalMs ?? 1000) : false,
    refetchOnWindowFocus: false,
  });
}

export function useStartPermitJoin() {
  const qc = useQueryClient();
  return useMutation<PermitJoinStatus, Error, number>({
    mutationFn: (durationSec: number) =>
      postJson<PermitJoinStatus>("/api/network/permit-join", { durationSec }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PERMIT_JOIN_QUERY_KEY });
    },
  });
}
