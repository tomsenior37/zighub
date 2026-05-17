import { useQuery } from "@tanstack/react-query";
import { getJson } from "../api/fetcher";
import { SELECTED_QUERY_KEY, type SelectedCoordinator } from "./useCoordinators";

export function useSelectedCoordinator() {
  return useQuery<SelectedCoordinator | null>({
    queryKey: SELECTED_QUERY_KEY,
    queryFn: () => getJson<SelectedCoordinator | null>("/api/coordinators/selected"),
  });
}
