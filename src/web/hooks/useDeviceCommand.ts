import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { ApiError, postJson } from "../api/fetcher";

export interface DeviceCommandInput {
  ieeeAddress: string;
  payload: Record<string, unknown>;
}

export interface DeviceCommandResult {
  accepted: boolean;
  result?: unknown;
}

export type SendDeviceCommandResult = UseMutationResult<
  DeviceCommandResult,
  ApiError,
  DeviceCommandInput
>;

export function useDeviceCommand(): SendDeviceCommandResult {
  return useMutation<DeviceCommandResult, ApiError, DeviceCommandInput>({
    mutationFn: ({ ieeeAddress, payload }) =>
      postJson<DeviceCommandResult>(
        `/api/devices/${encodeURIComponent(ieeeAddress)}/command`,
        payload,
      ),
  });
}
