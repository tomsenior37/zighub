import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { ApiError, patchJson } from "../api/fetcher";
import { DEVICES_QUERY_KEY, type Device } from "./useDevices";

export interface UpdateDeviceInput {
  ieeeAddress: string;
  friendly_name?: string;
  location_id?: number | null;
}

export type UpdateDeviceResult = UseMutationResult<Device, ApiError, UpdateDeviceInput>;

export function useUpdateDevice(): UpdateDeviceResult {
  const qc = useQueryClient();
  return useMutation<Device, ApiError, UpdateDeviceInput>({
    mutationFn: async ({ ieeeAddress, ...patch }) => {
      return patchJson<Device>(`/api/devices/${encodeURIComponent(ieeeAddress)}`, patch);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
    },
  });
}
