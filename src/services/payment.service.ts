import { apiClient } from './api';

// ==================== TYPES ====================
export type PaymentIntentStatus = 
  | 'PENDING' | 'PROCESSING' | 'AUTHORIZED' | 'SUCCEEDED' 
  | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' 
  | 'PARTIALLY_REFUNDED' | 'REVERSED';

export type PaymentMethod = 'CASH' | 'WALLET';

export type CashSessionStatus = 'OPEN' | 'CLOSING_REVIEW' | 'CLOSED';

export type CashMovementType = 
  | 'PAYMENT' | 'REFUND' | 'CASH_IN' | 'CASH_OUT' 
  | 'SAFE_DEPOSIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' 
  | 'ADJUSTMENT' | 'OPENING_FLOAT' | 'CLOSING_COUNT';

export interface PaymentIntent {
  intentNumber: string;
  customerType: string;
  customerCode: string;
  // Champs enrichis MD
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerRegistered?: boolean;
  resolvedSourceType?: string;
  resolvedSourceCode?: string;
  resolvedSourceLabel?: string;
  resolvedSourceRegistered?: boolean;
  amount: number;
  currency: string;
  purpose: string;
  sourceType: string;
  sourceCode: string;
  status: PaymentIntentStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  metadataJson?: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  transactionNumber: string;
  intentNumber: string;
  paymentMethod: string;
  provider?: string;
  providerReference?: string;
  customerName?: string;
  paidAmount: number;
  allocatedAmount: number;
  advanceAmount: number;
  paidAt: string;
  receivedBy: string;
  allocations?: any[];
}

export interface CashMetricsOverview {
  totalRevenue: number;
  totalCashIn: number;
  totalCashOut: number;
  netCash: number;
  openSessions: number;
  transactionCount: number;
}

export interface PaymentTransaction {
  transactionNumber: string;
  intentNumber: string;
  amount: number;
  method: PaymentMethod;
  status: string;
  providerReference?: string;
  processedAt: string;
  processedBy: string;
}

export interface CashRegister {
  registerCode: string;
  name: string;
  locationCode: string;
  businessEntityCode: string;
  deviceCode?: string;
  cashControlEnabled: boolean;
  maxCashAmount?: number;
  active: boolean;
}

export interface CashSession {
  sessionNumber: string;
  registerCode: string;
  status: CashSessionStatus;
  openedBy: string;
  closedBy?: string;
  openingAmount: number;
  totalPayments: number | null;
  totalRefunds: number | null;
  totalCashIn: number;
  totalCashOut: number | null;
  totalAdjustments: number;
  expectedClosingAmount: number | null;
  countedClosingAmount?: number;
  varianceAmount?: number | null;
  openedAt: string;
  closedAt?: string;
}

export interface CashMovement {
  movementNumber: string;
  registerCode: string;
  registerName?: string;
  sessionNumber: string;
  sessionStatus?: string;
  sessionOpenedBy?: string;
  sessionOpenedAt?: string;
  movementType: CashMovementType;
  amount: number;
  referenceType?: string;
  referenceCode?: string;
  reason?: string;
  // Champs enrichis MD
  relatedTransactionNumber?: string;
  relatedIntentNumber?: string;
  relatedReceiptNumber?: string;
  relatedCustomerName?: string;
  relatedSourceLabel?: string;
  businessEntityCode?: string;
  deviceCode?: string;
  createdBy: string;
  createdAt: string;
}

export const paymentService = {
  // Payment Intents
  getPaymentIntents: async (params?: {
    status?: string;
    customerType?: string;
    customerCode?: string;
    sourceType?: string;
    sourceCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ content: PaymentIntent[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/payments/intents', { params });
    if (Array.isArray(response.data?.data)) {
      return { content: response.data.data, totalElements: response.data.pageable?.totalElements ?? response.data.data.length, totalPages: response.data.pageable?.totalPages ?? 1 };
    }
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getPaymentIntent: async (intentNumber: string): Promise<PaymentIntent> => {
    const response = await apiClient.get(`/sni/api/v1/payments/intents/${intentNumber}`);
    return response.data;
  },

  // Cash Registers
  getCashRegisters: async (params?: { active?: boolean; locationCode?: string; businessEntityCode?: string; searchText?: string; page?: number; size?: number }): Promise<{ content: CashRegister[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/cash-registers', { params });
    if (Array.isArray(response.data?.data)) {
      return { content: response.data.data, totalElements: response.data.pageable?.totalElements ?? response.data.data.length, totalPages: response.data.pageable?.totalPages ?? 1 };
    }
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  createCashRegister: async (data: {
    name: string;
    locationCode: string;
    businessEntityCode: string;
    deviceCode?: string;
    cashControlEnabled?: boolean;
    maxCashAmount?: number;
  }): Promise<CashRegister> => {
    const response = await apiClient.post('/sni/api/v1/cash-registers', data);
    return response.data;
  },

  updateCashRegister: async (registerCode: string, data: {
    name?: string;
    locationCode?: string;
    businessEntityCode?: string;
    deviceCode?: string;
    cashControlEnabled?: boolean;
    maxCashAmount?: number;
  }): Promise<CashRegister> => {
    const response = await apiClient.put(`/sni/api/v1/cash-registers/${registerCode}`, data);
    return response.data;
  },

  activateCashRegister: async (registerCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/cash-registers/${registerCode}/activate`);
  },

  deactivateCashRegister: async (registerCode: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/cash-registers/${registerCode}/deactivate`);
  },

  // Cash Sessions
  getCashSessions: async (params?: { registerCode?: string; status?: string; page?: number; size?: number }): Promise<{ content: CashSession[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/cash-registers/sessions', { params });
    if (Array.isArray(response.data?.data)) {
      return { content: response.data.data, totalElements: response.data.pageable?.totalElements ?? response.data.data.length, totalPages: response.data.pageable?.totalPages ?? 1 };
    }
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  getCashSession: async (sessionNumber: string): Promise<CashSession> => {
    const response = await apiClient.get(`/sni/api/v1/cash-registers/sessions/${sessionNumber}`);
    return response.data;
  },

  getCashSessionSummary: async (sessionNumber: string): Promise<CashSession> => {
    const response = await apiClient.get(`/sni/api/v1/cash-registers/sessions/${sessionNumber}/summary`);
    return response.data;
  },

  openCashSession: async (data: { registerCode: string; openedBy: string; openingAmount?: number }): Promise<CashSession> => {
    const response = await apiClient.post('/sni/api/v1/cash-registers/sessions', data);
    return response.data;
  },

  closeCashSession: async (sessionNumber: string, data: { closedBy: string; countedClosingAmount: number; varianceReason?: string }): Promise<CashSession> => {
    const response = await apiClient.patch(`/sni/api/v1/cash-registers/sessions/${sessionNumber}/close`, data);
    return response.data;
  },

  approveVariance: async (sessionNumber: string, data: { reviewedBy: string; note?: string }): Promise<CashSession> => {
    const response = await apiClient.patch(`/sni/api/v1/cash-registers/sessions/${sessionNumber}/approve-variance`, data);
    return response.data;
  },

  // Cash Movements
  getCashMovements: async (params?: { registerCode?: string; sessionNumber?: string; movementType?: string; referenceType?: string; referenceCode?: string; createdBy?: string; fromDate?: string; toDate?: string; searchText?: string; page?: number; size?: number }): Promise<{ content: CashMovement[]; totalElements: number; totalPages: number }> => {
    const response = await apiClient.get('/sni/api/v1/cash-registers/movements', { params });
    if (Array.isArray(response.data?.data)) {
      return { content: response.data.data, totalElements: response.data.pageable?.totalElements ?? response.data.data.length, totalPages: response.data.pageable?.totalPages ?? 1 };
    }
    if (response.data?.content !== undefined) return response.data;
    if (Array.isArray(response.data)) return { content: response.data, totalElements: response.data.length, totalPages: 1 };
    return { content: [], totalElements: 0, totalPages: 0 };
  },

  createCashMovement: async (data: {
    sessionNumber: string;
    movementType: string;
    amount: number;
    referenceType?: string;
    referenceCode?: string;
    reason?: string;
    createdBy: string;
  }): Promise<CashMovement> => {
    const response = await apiClient.post(`/sni/api/v1/cash-registers/sessions/${data.sessionNumber}/movements`, data);
    return response.data;
  },


  createPaymentIntent: async (data: {
    customerType: string;
    customerCode: string;
    amount: number;
    currency: string;
    purpose: string;
    sourceType: string;
    sourceCode?: string;
    description?: string;
    idempotencyKey?: string;
    expiresAt?: string;
    metadataJson?: string;
    createdBy: string;
  }): Promise<PaymentIntent> => {
    const response = await apiClient.post('/sni/api/v1/payments/intents', data);
    return response.data;
  },

  // Creer une intention depuis une facture
  createPaymentIntentFromBilling: async (data: {
    documentNumber: string;
    amount?: number;
    idempotencyKey?: string;
    expiresAt?: string;
    metadataJson?: string;
  }): Promise<PaymentIntent> => {
    const response = await apiClient.post('/sni/api/v1/payments/intents/from-billing-document', data);
    return response.data;
  },

  // Creer une intention depuis plusieurs factures (meme client + meme devise)
  createPaymentIntentFromBillings: async (data: {
    documentNumbers: string[];
    idempotencyKey?: string;
    expiresAt?: string;
    metadataJson?: string;
  }): Promise<PaymentIntent> => {
    const response = await apiClient.post('/sni/api/v1/payments/intents/from-billing-documents', data);
    return response.data;
  },

  // Payer en cash
  payCash: async (intentNumber: string, data: {
    receivedBy: string;
    cashSessionNumber?: string;
    providerReference?: string;
    metadataJson?: string;
  }): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(`/sni/api/v1/payments/intents/${intentNumber}/cash`, data);
    return response.data;
  },

  // Payer avec wallet
  payWallet: async (intentNumber: string, data: {
    walletNumber: string;
    createdBy: string;
    metadataJson?: string;
  }): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(`/sni/api/v1/payments/intents/${intentNumber}/wallet`, data);
    return response.data;
  },

  // Providers Mobile Money
  getMobileMoneyProviders: async (): Promise<Array<{ code: string; displayName: string; countryCode: string; currency: string }>> => {
    const response = await apiClient.get('/sni/api/v1/payments/mobile-money/providers');
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  // Initier un dépôt Mobile Money
  initiateMobileMoneyDeposit: async (data: {
    intentNumber: string;
    phoneNumber: string;
    correspondent: string;
    amount?: number;
    createdBy?: string;
    metadataJson?: string;
  }): Promise<any> => {
    const response = await apiClient.post('/sni/api/v1/payments/mobile-money/deposits', data);
    return response.data;
  },

  // Récupérer un dépôt Mobile Money
  getMobileMoneyDeposit: async (depositId: string): Promise<any> => {
    const response = await apiClient.get(`/sni/api/v1/payments/mobile-money/deposits/${depositId}`);
    return response.data;
  },

  // Test PawaPay
  testPawaPay: async (phoneNumber: string): Promise<any> => {
    const response = await apiClient.post(`/sni/api/v1/payments/mobile-money/pawaypay/test/${phoneNumber}`);
    return response.data;
  },

  // Lister les transactions d'une intention
  getTransactions: async (intentNumber: string): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get(`/sni/api/v1/payments/intents/${intentNumber}/transactions`);
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.content)) return response.data.content;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },

  // Rembourser une transaction
  refundTransaction: async (transactionNumber: string, data: {
    amount: number;
    reason: string;
    processedBy: string;
  }): Promise<PaymentTransaction> => {
    const response = await apiClient.post(`/sni/api/v1/payments/transactions/${transactionNumber}/refund`, data);
    return response.data;
  },

  // Reverser/annuler une transaction
  reverseTransaction: async (transactionNumber: string, data: {
    amount: number;
    reason: string;
    processedBy: string;
  }): Promise<PaymentTransaction> => {
    const response = await apiClient.post(`/sni/api/v1/payments/transactions/${transactionNumber}/reverse`, data);
    return response.data;
  },

  // Reconciliation
  createReconciliationBatch: async (data: {
    provider: string;
    createdBy: string;
  }): Promise<{ batchNumber: string; status: string }> => {
    const response = await apiClient.post('/sni/api/v1/payments/reconciliation-batches', data);
    return response.data;
  },

  completeReconciliationBatch: async (batchNumber: string): Promise<void> => {
    await apiClient.patch(`/sni/api/v1/payments/reconciliation-batches/${batchNumber}/complete`);
  },

  // Demande de fermeture de session (alternative a closeCashSession)
  requestSessionClosing: async (sessionNumber: string, data: {
    closedBy: string;
    countedClosingAmount: number | null;
    varianceReason?: string;
  }): Promise<CashSession> => {
    const response = await apiClient.post(`/sni/api/v1/cash-registers/sessions/${sessionNumber}/closing-request`, data);
    return response.data;
  },

  // Récupérer les documents payables d'un client (dettes)
  getPayableDocuments: async (params?: {
    customerType?: string;
    customerCode?: string;
    documentType?: string;
    lineSourceType?: string;
    lineSourceCode?: string;
    searchText?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get('/sni/api/v1/payments/payable-documents', { params });
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    if (Array.isArray(response.data?.content)) return response.data.content;
    return [];
  },

  // Aperçu recouvrement global
  getRecovery: async (customerType: string, customerCode: string): Promise<any> => {
    const response = await apiClient.get(`/sni/api/v1/payments/recovery/${customerType}/${customerCode}`);
    return response.data;
  },

  // Créer intention de recouvrement global
  createRecoveryIntent: async (data: {
    customerType: string;
    customerCode: string;
    currency: string;
    expiresAt?: string;
    metadataJson?: string;
  }): Promise<PaymentIntent> => {
    const response = await apiClient.post('/sni/api/v1/payments/intents/recovery', data);
    return response.data;
  },

  // Récupérer un reçu par transactionNumber
  getReceipt: async (transactionNumber: string): Promise<PaymentReceipt> => {
    const response = await apiClient.get(`/sni/api/v1/payments/transactions/${transactionNumber}/receipt`);
    return response.data;
  },

  // Télécharger un reçu PDF
  getReceiptPdf: async (transactionNumber: string): Promise<Blob> => {
    const response = await apiClient.get(`/sni/api/v1/payments/transactions/${transactionNumber}/receipt/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Métriques globales caisse
  getCashMetricsOverview: async (params?: {
    registerCode?: string;
    businessEntityCode?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CashMetricsOverview> => {
    const response = await apiClient.get('/sni/api/v1/cash-registers/metrics/overview', { params });
    return response.data;
  },

  // Métriques par caisse
  getCashMetricsRegisters: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get('/sni/api/v1/cash-registers/metrics/registers', { params });
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    return [];
  },
};