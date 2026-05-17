import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, postJson } from "../api/fetcher";

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  pnpId?: string;
}

export interface KnownCoordinator {
  vendorId: string;
  productId: string;
  displayName: string;
  family: string;
}

export interface DetectedCoordinator extends SerialPortInfo {
  match: KnownCoordinator | null;
  confidence: "high" | "medium" | "low";
}

export interface SelectedCoordinator {
  path: string;
  selectedAt: number;
}

export const PORTS_QUERY_KEY = ["coordinator-ports"] as const;
export const DETECT_QUERY_KEY = ["coordinator-detect"] as const;
export const SELECTED_QUERY_KEY = ["coordinator-selected"] as const;

export function usePorts() {
  return useQuery<SerialPortInfo[]>({
    queryKey: PORTS_QUERY_KEY,
    queryFn: () => getJson<SerialPortInfo[]>("/api/coordinators/ports"),
  });
}

export function useDetectedCoordinators() {
  return useQuery<DetectedCoordinator[]>({
    queryKey: DETECT_QUERY_KEY,
    queryFn: () => getJson<DetectedCoordinator[]>("/api/coordinators/detect"),
  });
}

export function useSelectCoordinator() {
  const qc = useQueryClient();
  return useMutation<SelectedCoordinator, Error, string>({
    mutationFn: (path: string) =>
      postJson<SelectedCoordinator>("/api/coordinators/select", { path }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SELECTED_QUERY_KEY });
    },
  });
}
