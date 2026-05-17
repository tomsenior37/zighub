import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, postJson } from "../api/fetcher";

export interface NetworkInfo {
  panId: number;
  channel: number;
  extendedPanId: string;
  networkKeyHash: string;
  createdAt: number;
}

export interface CreateNetworkInput {
  channel?: number;
  panId?: number;
}

export const NETWORK_QUERY_KEY = ["network"] as const;

export function useNetworkInfo() {
  return useQuery<NetworkInfo | null>({
    queryKey: NETWORK_QUERY_KEY,
    queryFn: () => getJson<NetworkInfo | null>("/api/network"),
  });
}

export function useCreateNetwork() {
  const qc = useQueryClient();
  return useMutation<NetworkInfo, Error, CreateNetworkInput>({
    mutationFn: (input) => postJson<NetworkInfo>("/api/network/create", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NETWORK_QUERY_KEY });
    },
  });
}
