import { apiClient } from "./api";

export const analyticsService = {
  getLiveKpis: async (): Promise<{
    currentActiveBookings: number;
    currentOccupancy: number;
    totalCapacity: number;
    occupancyRate: number;
    todayBookings: number;
    todayRevenue: number;
    pendingCheckins: number;
    activeSessions: number;
    updatedAt: string;
  }> => {
    const response = await apiClient.get("/sni/api/v1/analytics/live");
    return response.data;
  },

  getComparison: async (params: {
    fromDate: string;
    toDate: string;
    compareWithPrevious?: boolean;
    resourceTypeCode?: string;
    resourceGroupCode?: string;
  }): Promise<any> => {
    const response = await apiClient.get("/sni/api/v1/analytics/comparison", {
      params,
    });
    return response.data;
  },

  getBookingTrends: async (params: {
    fromDate?: string;
    toDate?: string;
    resourceTypeCode?: string;
    interval?: "DAY" | "WEEK" | "MONTH";
  }): Promise<{
    series: Array<{ timestamp: string; value: number }>;
    average: number;
    total: number;
  }> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/trends/bookings",
      { params },
    );
    return response.data;
  },

  getRevenueTrends: async (params: {
    fromDate?: string;
    toDate?: string;
    resourceTypeCode?: string;
    interval?: "DAY" | "WEEK" | "MONTH";
  }): Promise<{
    series: Array<{ timestamp: string; value: number }>;
    average: number;
    total: number;
  }> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/trends/revenue",
      { params },
    );
    return response.data;
  },

  getOccupancyTrends: async (params: {
    fromDate?: string;
    toDate?: string;
    resourceTypeCode?: string;
    interval?: "DAY" | "WEEK" | "MONTH";
  }): Promise<{
    series: Array<{ timestamp: string; value: number }>;
    average: number;
  }> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/trends/occupancy",
      { params },
    );
    return response.data;
  },

  getTopResources: async (params: {
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<
    Array<{
      resourceCode: string;
      resourceName: string;
      utilizationRate: number;
      revenueGenerated: number;
    }>
  > => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/top-resources",
      { params },
    );
    return response.data;
  },

  getOccupancyReport: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<any> => {
    const response = await apiClient.get("/sni/api/v1/reporting/occupancy", {
      params,
    });
    return response.data;
  },
};
