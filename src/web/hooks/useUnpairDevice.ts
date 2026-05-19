import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { ApiError, deleteJson } from "../api/fetcher";
import { DEVICES_QUERY_KEY } from "./useDevices";

export type UnpairDeviceResult = UseMutationResult<void, ApiError, string>;

export function useUnpairDevice(): UnpairDeviceResult {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (ieeeAddress) => deleteJson(`/api/devices/${encodeURIComponent(ieeeAddress)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
    },
  });
}
