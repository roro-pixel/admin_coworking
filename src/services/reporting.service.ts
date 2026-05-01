// admin/src/services/reporting.service.ts
import { apiClient } from './api';

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


// ==================== LABELS ====================

export const paymentMethodLabels: Record<string, string> = {
  CASH: 'Espèces',
  WALLET: 'Portefeuille',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  CARD: 'Carte bancaire',
  CHEQUE: 'Chèque',
  CREDIT_NOTE: 'Avoir',
  MANUAL_ADJUSTMENT: 'Ajustement manuel',
};

export const movementTypeLabels: Record<string, string> = {
  PAYMENT: 'Paiement',
  CASH_IN: 'Apport caisse',
  TRANSFER_IN: 'Transfert entrant',
  REFUND: 'Remboursement',
  CASH_OUT: 'Retrait caisse',
  SAFE_DEPOSIT: 'Dépôt coffre',
  TRANSFER_OUT: 'Transfert sortant',
  ADJUSTMENT: 'Ajustement',
};

export const agingColors: Record<string, string> = {
  current: 'bg-gray-100 text-gray-700',
  days1to30: 'bg-yellow-100 text-yellow-700',
  days31to60: 'bg-orange-100 text-orange-700',
  days61to90: 'bg-red-100 text-red-700',
  over90: 'bg-red-200 text-red-800',
};


// ==================== SERVICE ====================

export const reportingService = {
  // Tableau de bord financier
  getFinanceDashboard: async (params?: { from?: string; to?: string }): Promise<FinanceDashboardResponse> => {
    const response = await apiClient.get('/sni/api/v1/reports/finance/dashboard', { params });
    return response.data;
  },

  // Répartition des paiements
  getPaymentsReport: async (params?: { from?: string; to?: string }): Promise<PaymentsReportResponse> => {
    const response = await apiClient.get('/sni/api/v1/reports/finance/payments', { params });
    return response.data;
  },

  // Vieillissement des factures
  getAgingReport: async (): Promise<AgingReportResponse> => {
    const response = await apiClient.get('/sni/api/v1/reports/finance/aging');
    return response.data;
  },

  // Rapport par caisse
  getCashRegistersReport: async (params?: { from?: string; to?: string }): Promise<CashRegistersReportResponse> => {
    const response = await apiClient.get('/sni/api/v1/reports/finance/cash-registers', { params });
    return response.data;
  },

  // Flux de trésorerie
  getCashFlowReport: async (params?: { from?: string; to?: string }): Promise<CashFlowReportResponse> => {
    const response = await apiClient.get('/sni/api/v1/reports/finance/cash-flow', { params });
    return response.data;
  },

  // Taux d'occupation
  getOccupancyReport: async (params?: { from?: string; to?: string }): Promise<OccupancyReportResponse> => {
    const response = await apiClient.get('/sni/api/v1/reports/occupancy', { params });
    return response.data;
  },
};