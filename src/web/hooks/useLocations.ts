import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getJson } from "../api/fetcher";

export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export const LOCATIONS_QUERY_KEY = ["locations"] as const;

export function useLocations(): UseQueryResult<Location[]> {
  return useQuery<Location[]>({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: () => getJson<Location[]>("/api/locations"),
  });
}
