import { apiClient } from "./api";

export interface PurgeDataResponse {
  message?: string;
  deletedRecords?: number;
  status?: string;
  [key: string]: unknown;
}

export type OneTimeTokenStatus = "VALID" | "USED" | "EXPIRED";

/** Code à usage unique envoyé par e-mail. */
export interface OneTimeTokenView {
  token: string;
  email: string;
  userId?: string | number;
  firstname?: string;
  lastname?: string;
  createdAt: string;
  expiredAt: string;
  used: boolean;
  expired: boolean;
  status: OneTimeTokenStatus | string;
}

export interface OneTimeTokensPage {
  content: OneTimeTokenView[];
  totalElements: number;
  totalPages: number;
}

export const adminMaintenanceService = {
  /** Liste paginée des codes à usage unique (ADMIN, SUPER_ADMIN). */
  getOneTimeTokens: async (params?: {
    email?: string;
    used?: boolean;
    page?: number;
    size?: number;
  }): Promise<OneTimeTokensPage> => {
    const data = (
      await apiClient.get("/sni/api/v1/admin/one-time-tokens", { params })
    ).data;
    if (Array.isArray(data?.data)) {
      return {
        content: data.data,
        totalElements: data.pageable?.totalElements ?? data.data.length,
        totalPages: data.pageable?.totalPages ?? 1,
      };
    }
    if (Array.isArray(data?.content)) {
      return {
        content: data.content,
        totalElements: data.totalElements ?? data.content.length,
        totalPages: data.totalPages ?? 1,
      };
    }
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1 };
    }
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  /** Lance la purge des données (confirm=true requis). */
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