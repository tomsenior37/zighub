import { useQuery } from "@tanstack/react-query";
import { getJson } from "../api/fetcher";

export interface ZigbeeStatus {
  running: boolean;
  coordinatorPath?: string;
  panId?: number;
  channel?: number;
  adapterMode: "mock" | "herdsman";
  adapterReason: string;
  mockMode: boolean;
}

export const ZIGBEE_STATUS_QUERY_KEY = ["zigbee-status"] as const;

export function useZigbeeStatus() {
  return useQuery<ZigbeeStatus>({
    queryKey: ZIGBEE_STATUS_QUERY_KEY,
    queryFn: () => getJson<ZigbeeStatus>("/api/zigbee/status"),
    staleTime: 10_000,
  });
}
