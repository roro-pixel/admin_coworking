import { apiClient } from "./api";

export interface PurgeDataResponse {
  message?: string;
  deletedRecords?: number;
  status?: string;
  [key: string]: unknown;
}

export const adminMaintenanceService = {
  purgeData: async (): Promise<PurgeDataResponse> =>
    (
      await apiClient.delete(
        "/sni/api/v1/admin/maintenance/purge-data",
        {
          params: { confirm: true },
        },
      )
    ).data,
};