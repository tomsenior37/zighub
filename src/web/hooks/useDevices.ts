import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getJson } from "../api/fetcher";

export interface DeviceLocation {
  id: number;
  name: string;
}

export interface Device {
  z2m_id: string;
  friendly_name: string;
  location_id: number | null;
  model: string | null;
  manufacturer: string | null;
  role: "input" | "output" | "both";
  user_notes: string | null;
  created_at: string;
  last_seen_at: string | null;
  capabilities: Record<string, unknown>[] | null;
  online: boolean;
}

export interface DeviceGroup {
  location: DeviceLocation | null;
  devices: Device[];
}

export const DEVICES_QUERY_KEY = ["devices"] as const;

export function useDevices(): UseQueryResult<DeviceGroup[]> {
  return useQuery<DeviceGroup[]>({
    queryKey: DEVICES_QUERY_KEY,
    queryFn: () => getJson<DeviceGroup[]>("/api/devices"),
  });
}
