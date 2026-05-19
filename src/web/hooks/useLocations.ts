import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ApiError, deleteJson, getJson, patchJson, postJson } from "../api/fetcher";

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

export function useCreateLocation(): UseMutationResult<Location, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<Location, ApiError, string>({
    mutationFn: (name) => postJson<Location>("/api/locations", { name }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    },
  });
}

export function useRenameLocation(): UseMutationResult<
  Location,
  ApiError,
  { id: number; name: string }
> {
  const qc = useQueryClient();
  return useMutation<Location, ApiError, { id: number; name: string }>({
    mutationFn: ({ id, name }) => patchJson<Location>(`/api/locations/${id.toString()}`, { name }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    },
  });
}

export function useDeleteLocation(): UseMutationResult<void, ApiError, number> {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: (id) => deleteJson(`/api/locations/${id.toString()}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    },
  });
}
