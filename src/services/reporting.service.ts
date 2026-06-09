// admin/src/services/reporting.service.ts
import { apiClient } from "./api";

// ==================== TYPES ====================

export interface FinanceDashboardResponse {
  generatedAt: string;
  fromDate: string;
  toDate: string;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
  collectionRate: number;
  totalVat: number;
  totalAdditionalCent: number;
  totalDiscounts: number;
  cancelledInvoiceCount: number;
  revenueBySource: RevenueBySource[];
  payments: DashboardPayments;
}

export interface RevenueBySource {
  sourceType: string;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingAmount: number;
}

export interface DashboardPayments {
  transactionCount: number;
  totalReceived: number;
  cashAmount: number;
  walletAmount: number;
  mobileMoneyAmount: number;
  bankTransferAmount: number;
  cardAmount: number;
  chequeAmount: number;
  failedCount: number;
  pendingCount: number;
}

export interface PaymentsReportResponse {
  generatedAt: string;
  fromDate: string;
  toDate: string;
  totalReceived: number;
  totalTransactions: number;
  byMethod: PaymentMethodBreakdown[];
  dailySeries: PaymentDailySeries[];
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentDailySeries {
  date: string;
  cash: number;
  wallet: number;
  mobileMoney: number;
  bankTransfer: number;
  card: number;
  cheque: number;
  total: number;
}

export interface AgingReportResponse {
  generatedAt: string;
  totalOutstanding: number;
  totalInvoices: number;
  current: AgingBucket;
  days1to30: AgingBucket;
  days31to60: AgingBucket;
  days61to90: AgingBucket;
  over90: AgingBucket;
}

export interface AgingBucket {
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface CashRegistersReportResponse {
  generatedAt: string;
  fromDate: string;
  toDate: string;
  totalCashIn: number;
  totalCashOut: number;
  netFlow: number;
  registers: CashRegisterReport[];
}

export interface CashRegisterReport {
  registerCode: string;
  registerName: string;
  sessionsCount: number;
  openingAmount: number;
  cashIn: number;
  cashOut: number;
  netFlow: number;
  totalVariance: number;
  movementsCount: number;
}

export interface CashFlowReportResponse {
  generatedAt: string;
  fromDate: string;
  toDate: string;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  byMovementType: CashFlowByType[];
  dailySeries: CashFlowDailySeries[];
}

export interface CashFlowByType {
  movementType: string;
  direction: string;
  count: number;
  totalAmount: number;
}

export interface CashFlowDailySeries {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
}

export interface OccupancyReportResponse {
  generatedAt: string;
  fromDate: string;
  toDate: string;
  periodDays: number;
  totalBookings: number;
  totalBookedMinutes: number;
  overallOccupancyRate: number;
  byResourceType: OccupancyByType[];
  byResource: OccupancyByResource[];
}

export interface OccupancyByType {
  typeCode: string;
  typeName: string;
  resourceCount: number;
  totalBookings: number;
  totalBookedMinutes: number;
  totalRevenue: number;
  occupancyRate: number;
}

export interface OccupancyByResource {
  resourceCode: string;
  resourceName: string;
  typeCode: string;
  typeName: string;
  bookingCount: number;
  bookedMinutes: number;
  availableMinutes: number;
  occupancyRate: number;
  revenue: number;
}

// ==================== TYPES ANALYTICS (NOUVEAUX - spec consolidée) ====================

export interface LiveKpiResponse {
  currentActiveBookings: number;
  currentOccupancy: number;
  totalCapacity: number;
  occupancyRate: number;
  todayBookings: number;
  todayRevenue: number;
  pendingCheckins: number;
  activeSessions: number;
  updatedAt: string;
}

export interface ComparisonRequest {
  fromDate: string;
  toDate: string;
  compareWithPrevious?: boolean;
  resourceTypeCode?: string;
  resourceGroupCode?: string;
}

export interface ComparisonResponse {
  current: {
    bookings: number;
    revenue: number;
    occupancyRate: number;
    averageBookingValue: number;
  };
  previous: {
    bookings: number;
    revenue: number;
    occupancyRate: number;
    averageBookingValue: number;
  };
  variance: {
    bookingsPercent: number;
    revenuePercent: number;
    occupancyRatePoints: number;
    averageBookingValuePercent: number;
  };
  periodLabel: string;
  previousPeriodLabel: string;
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TrendDataResponse {
  series: TrendDataPoint[];
  average: number;
  min: number;
  max: number;
  total: number;
}

export interface AnalyticsFilters {
  fromDate?: string;
  toDate?: string;
  resourceTypeCode?: string;
  resourceGroupCode?: string;
  ownerType?: string;
  interval?: "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
}

export interface ResourceUtilization {
  resourceCode: string;
  resourceName: string;
  resourceTypeCode: string;
  totalBookings: number;
  totalMinutesBooked: number;
  availableMinutes: number;
  utilizationRate: number;
  revenueGenerated: number;
}

export interface OwnerActivity {
  ownerType: string;
  ownerCode: string;
  ownerName: string;
  bookingCount: number;
  totalSpent: number;
  lastBookingAt?: string;
  preferredResourceType?: string;
}

// ==================== LABELS ====================

export const paymentMethodLabels: Record<string, string> = {
  CASH: "Espèces",
  WALLET: "Portefeuille",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement bancaire",
  CARD: "Carte bancaire",
  CHEQUE: "Chèque",
  CREDIT_NOTE: "Avoir",
  MANUAL_ADJUSTMENT: "Ajustement manuel",
};

export const movementTypeLabels: Record<string, string> = {
  PAYMENT: "Paiement",
  CASH_IN: "Apport caisse",
  TRANSFER_IN: "Transfert entrant",
  REFUND: "Remboursement",
  CASH_OUT: "Retrait caisse",
  SAFE_DEPOSIT: "Dépôt coffre",
  TRANSFER_OUT: "Transfert sortant",
  ADJUSTMENT: "Ajustement",
};

export const agingColors: Record<string, string> = {
  current: "bg-gray-100 text-gray-700",
  days1to30: "bg-yellow-100 text-yellow-700",
  days31to60: "bg-orange-100 text-orange-700",
  days61to90: "bg-red-100 text-red-700",
  over90: "bg-red-200 text-red-800",
};

export interface RealComparisonResponse {
  current: {
    financial: {
      invoicedAmount: number;
      paidAmount: number;
      outstandingAmount: number;
      invoiceCount: number;
    };
    booking: {
      bookingCount: number;
    };
    subscription: {
      activeSubscriptions: number;
    };
  };
  previous: {
    financial: {
      invoicedAmount: number;
      paidAmount: number;
      outstandingAmount: number;
      invoiceCount: number;
    };
    booking: {
      bookingCount: number;
    };
    subscription: {
      activeSubscriptions: number;
    };
  };
  revenue?: {
    current: number;
    previous: number;
    percentChange: number;
  };
  paid?: {
    current: number;
    previous: number;
    percentChange: number;
  };
  bookings?: {
    current: number;
    previous: number;
    percentChange: number;
  };
  activeSubscriptions?: {
    current: number;
    previous: number;
    percentChange: number;
  };
}

// Type pour un propriétaire (Owner) réel de l'API
export interface RealOwnerActivity {
  ownerType: string;
  ownerCode: string;
  ownerName: string;
  bookingCount: number;
  revenue: number; // Note: c'est 'revenue' pas 'totalSpent'
  confirmedCount?: number;
  completedCount?: number;
  cancelledCount?: number;
  bookedMinutes?: number;
  lastBookingAt?: string;
}
// ==================== SERVICE ====================

export const reportingService = {
  // ========== ANALYTICS (nouveaux endpoints - spec consolidée) ==========

  // KPIs temps réel
  getLiveKpis: async (): Promise<LiveKpiResponse> => {
    const response = await apiClient.get("/sni/api/v1/analytics/live");
    return response.data;
  },

  // Comparaison entre périodes
  getComparison: async (
    params: ComparisonRequest,
  ): Promise<ComparisonResponse> => {
    const response = await apiClient.get("/sni/api/v1/analytics/comparison", {
      params,
    });
    return response.data;
  },

  // Tendances des réservations
  getBookingTrends: async (
    params: AnalyticsFilters,
  ): Promise<TrendDataResponse> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/trends/bookings",
      { params },
    );
    return response.data;
  },

  // Tendances des revenus
  getRevenueTrends: async (
    params: AnalyticsFilters,
  ): Promise<TrendDataResponse> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/trends/revenue",
      { params },
    );
    return response.data;
  },

  // Tendance d'occupation
  getOccupancyTrends: async (
    params: AnalyticsFilters,
  ): Promise<TrendDataResponse> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/trends/occupancy",
      { params },
    );
    return response.data;
  },

  // Top ressources les plus utilisées
  getTopResources: async (
    params: AnalyticsFilters & { limit?: number },
  ): Promise<ResourceUtilization[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/analytics/top-resources",
      { params },
    );
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  // Propriétaires les plus actifs
  getTopOwners: async (
    params: AnalyticsFilters & { limit?: number },
  ): Promise<OwnerActivity[]> => {
    const response = await apiClient.get("/sni/api/v1/analytics/top-owners", {
      params,
    });
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  // Tableau de bord récapitulatif
  getDashboardSummary: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    summary: {
      totalBookings: number;
      totalRevenue: number;
      averageOccupancyRate: number;
      activeSubscriptions: number;
      pendingKyc: number;
      openAlerts: number;
    };
    recentBookings: Array<{
      bookingNumber: string;
      resourceName: string;
      ownerName: string;
      startedAt: string;
      status: string;
      amount: number;
    }>;
    alerts: Array<{
      alertCode: string;
      alertType: string;
      message: string;
      createdAt: string;
    }>;
    generatedAt: string;
  }> => {
    const response = await apiClient.get("/sni/api/v1/analytics/dashboard", {
      params,
    });
    return response.data;
  },

  // Export analytics
  exportAnalytics: async (
    params: AnalyticsFilters & { format: "JSON" | "CSV" | "PDF" },
  ): Promise<Blob> => {
    const response = await apiClient.get("/sni/api/v1/analytics/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  // ========== REPORTING (existants) ==========

  // Tableau de bord financier
  getFinanceDashboard: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<FinanceDashboardResponse> => {
    const response = await apiClient.get(
      "/sni/api/v1/reporting/finance/dashboard",
      { params },
    );
    return response.data;
  },

  // Répartition des paiements
  getPaymentsReport: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<PaymentsReportResponse> => {
    const response = await apiClient.get("/sni/api/v1/reporting/payments", {
      params,
    });
    return response.data;
  },

  // Vieillissement des factures
  getAgingReport: async (): Promise<AgingReportResponse> => {
    const response = await apiClient.get("/sni/api/v1/reporting/aging");
    return response.data;
  },

  // Rapport par caisse
  getCashRegistersReport: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<CashRegistersReportResponse> => {
    const response = await apiClient.get(
      "/sni/api/v1/reporting/cash-registers",
      { params },
    );
    return response.data;
  },

  // Flux de trésorerie
  getCashFlowReport: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<CashFlowReportResponse> => {
    const response = await apiClient.get("/sni/api/v1/reporting/cash-flow", {
      params,
    });
    return response.data;
  },

  // Taux d'occupation
  getOccupancyReport: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<OccupancyReportResponse> => {
    const response = await apiClient.get("/sni/api/v1/reporting/occupancy", {
      params,
    });
    return response.data;
  },
};
