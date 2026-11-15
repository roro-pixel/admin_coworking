import { apiClient } from "./api";

// ==================== Helpers ====================
export interface PaginatedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  size?: number;
}

function normalizePaginated<T>(data: any): PaginatedResult<T> {
  if (data?.content !== undefined) {
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements:
        data.totalElements ??
        data.pageable?.totalElements ??
        data.content?.length ??
        0,
      totalPages: data.totalPages ?? data.pageable?.totalPages ?? 1,
      page: data.number ?? data.pageable?.pageNumber ?? data.page,
      size: data.size ?? data.pageable?.pageSize,
    };
  }

  if (Array.isArray(data?.data)) {
    return {
      content: data.data,
      totalElements:
        data.pageable?.totalElements ?? data.totalElements ?? data.data.length,
      totalPages: data.pageable?.totalPages ?? data.totalPages ?? 1,
      page: data.pageable?.page,
      size: data.pageable?.size,
    };
  }

  if (Array.isArray(data)) {
    return { content: data, totalElements: data.length, totalPages: 1 };
  }

  return { content: [], totalElements: 0, totalPages: 0 };
}

function normalizeArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// ==================== Enums / unions ====================
export type PaymentIntentStatus =
  | "PENDING"
  | "PROCESSING"
  | "AUTHORIZED"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "REVERSED";

export type PaymentMethod = "CASH" | "WALLET" | "MOBILE_MONEY";

export type CashSessionStatus = "OPEN" | "CLOSING_REVIEW" | "CLOSED";

export type CashMovementType =
  | "PAYMENT"
  | "REFUND"
  | "CASH_IN"
  | "CASH_OUT"
  | "SAFE_DEPOSIT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "OPENING_FLOAT"
  | "CLOSING_COUNT";

export type CashRequestType =
  | "JUSTIFICATIF"
  | "REMISE_DE_FONDS"
  | "CASH_ADVANCE"
  | "EXPENSE_REIMBURSEMENT";
export type CashRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTED"
  | "CANCELLED";
export type CashAnomalySeverity = "LOW" | "MEDIUM" | "HIGH";
export type CashAnomalyReviewStatus =
  | "PENDING"
  | "ACKNOWLEDGED"
  | "FALSE_POSITIVE"
  | "ESCALATED"
  | "RESOLVED";

// ==================== Payment types ====================
export interface PaymentIntent {
  intentNumber: string;
  customerType: string;
  customerCode: string;
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
  sourceCode?: string;
  status: PaymentIntentStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  metadataJson?: string;
}

export interface PayableDocument {
  documentNumber: string;
  documentType: string;
  status: string;
  customerType?: string;
  customerCode?: string;
  customerName?: string;
  currency?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue: number;
  dueDate?: string;
  issueDate?: string;
}

export interface RecoveryOverview {
  customerType: string;
  customerCode: string;
  currency: string;
  openDocumentAmount: number;
  pendingBillableAmount: number;
  totalPayableAmount: number;
  documents: PayableDocument[];
  pendingBillableItems: Array<{
    billableNumber: string;
    sourceType: string;
    sourceCode?: string;
    amount: number;
    currency: string;
    status: string;
  }>;
  paymentIntent: PaymentIntent | null;
}

export interface PaymentTransaction {
  transactionNumber: string;
  intentNumber: string;
  amount: number;
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  status: string;
  provider?: string;
  providerReference?: string;
  processedAt?: string;
  processedBy?: string;
  createdAt?: string;
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

export interface MobileMoneyProvider {
  code: string;
  displayName: string;
  countryCode: string;
  currency: string;
}

export interface MobileMoneyDeposit {
  depositId: string;
  clientReferenceId?: string;
  customerMessage?: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  intentNumber: string;
  transactionNumber?: string;
  transaction?: PaymentTransaction;
}

// ==================== Cash register types ====================
export interface CashRegister {
  registerCode: string;
  name: string;
  locationCode: string;
  businessEntityCode: string;
  deviceCode?: string;
  cashControlEnabled: boolean;
  maxCashAmount?: number;
  managerEmail?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashSession {
  sessionNumber: string;
  registerCode: string;
  status: CashSessionStatus;
  openedBy: string;
  /** "SYSTEM" pour une clôture automatique (fin de mois, seuil d'une caisse automatique). */
  closedBy?: string;
  openingAmount: number;
  totalPayments: number | null;
  totalRefunds: number | null;
  totalCashIn: number;
  totalCashOut: number | null;
  totalAdjustments: number;
  expectedClosingAmount: number | null;
  /** Vides pour une clôture par le système d'une caisse tenue à la main. */
  countedClosingAmount?: number | null;
  varianceAmount?: number | null;
  varianceReason?: string;
  openedAt: string;
  closedAt?: string;
}

export interface CashMovementAttachment {
  fileName: string;
  contentType: string;
  storagePath: string;
  label?: string;
  uploadedBy?: string;
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
  documentType?: string;
  documentNumber?: string;
  flowCategory?: string;
  referenceType?: string;
  referenceCode?: string;
  counterpartyType?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  reason?: string;
  status?: "PENDING" | "CONFIRMED" | "REVERSED" | "CANCELLED";
  runningBalance?: number;
  riskScore?: number;
  requiresSignature?: boolean;
  signedBy?: string;
  signedAt?: string;
  printedAt?: string;
  attachments?: CashMovementAttachment[];
  relatedMovementNumber?: string;
  relatedTransactionNumber?: string;
  relatedIntentNumber?: string;
  relatedReceiptNumber?: string;
  relatedCustomerName?: string;
  relatedSourceLabel?: string;
  businessEntityCode?: string;
  deviceCode?: string;
  deviceIp?: string;
  subCategory?: string;
  tags?: string;
  createdBy: string;
  createdAt: string;
}

export interface CashRequest {
  requestNumber: string;
  registerCode?: string;
  sessionNumber: string;
  requestType: CashRequestType;
  status: CashRequestStatus;
  amount: number;
  currency: string;
  reason: string;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  generatedMovementNumber?: string;
  attachments?: CashMovementAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CashMetricsOverview {
  currency: string;
  registerCount: number;
  activeRegisterCount: number;
  openSessionCount: number;
  closingReviewSessionCount: number;
  closedSessionCount: number;
  movementCount: number;
  openingFloatAmount: number;
  totalPayments: number;
  totalRefunds: number;
  totalCashIn: number;
  totalCashOut: number;
  totalAdjustments: number;
  netCashPosition: number;
  pendingVarianceAmount: number;
}

export interface CashSessionStatistics {
  sessionNumber: string;
  registerCode: string;
  openedBy: string;
  durationMinutes: number;
  movementCount: number;
  transactionsPerHour: number;
  totalInflow: number;
  totalOutflow: number;
  inOutRatio: number | null;
  idleMinutes: number;
  averageMovementAmount: number;
  varianceAmount?: number | null;
  variancePercentage?: number | null;
}

export interface CashierStatistics {
  cashierCode: string;
  sessionCount: number;
  closedSessionCount: number;
  reviewSessionCount: number;
  reviewFrequencyPercentage: number;
  averageVarianceAmount: number;
  varianceStandardDeviation: number;
  varianceTrend: "IMPROVING" | "STABLE" | "DEGRADING";
  averageSessionDurationMinutes: number;
  riskScore: number;
}

export interface CashRegisterStatistics {
  registerCode: string;
  registerName: string;
  sessionCount: number;
  movementCount: number;
  averageSessionDurationMinutes: number;
  averageVarianceAmount: number;
  peakHours?: Array<{
    hourOfDay: number;
    movementCount: number;
    totalAmount: number;
  }>;
  periodOverPeriodChangePercentage?: number | null;
}

export interface CashAnomalyFlag {
  flagNumber: string;
  sessionNumber: string;
  registerCode?: string;
  cashierCode?: string;
  anomalyType: string;
  severity: CashAnomalySeverity;
  reviewStatus?: CashAnomalyReviewStatus;
  description?: string;
  score?: number;
  createdAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface CancellationPolicyRule {
  id: number;
  hoursBeforeStart: number;
  refundPercentage: number;
  ruleOrder: number;
  active: boolean;
}

// ==================== Payloads ====================
export interface CreatePaymentIntentPayload {
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
  createdBy?: string;
}

export interface CreatePaymentIntentFromBillingPayload {
  documentNumber: string;
  amount?: number;
  idempotencyKey?: string;
  expiresAt?: string;
  metadataJson?: string;
}

export interface CreatePaymentIntentFromBillingsPayload {
  documentNumbers: string[];
  idempotencyKey?: string;
  expiresAt?: string;
  metadataJson?: string;
}

export interface CreateRecoveryIntentPayload {
  customerType: string;
  customerCode: string;
  currency: string;
  expiresAt?: string;
  metadataJson?: string;
}

export interface PayCashPayload {
  receivedBy: string;
  cashSessionNumber?: string;
  providerReference?: string;
  metadataJson?: string;
}

export interface PayWalletPayload {
  walletNumber: string;
  createdBy: string;
  metadataJson?: string;
}

export interface InitiateMobileMoneyDepositPayload {
  intentNumber: string;
  phoneNumber: string;
  correspondent: string;
  amount?: number;
  createdBy?: string;
  metadataJson?: string;
}

export interface CreateCashRegisterPayload {
  name: string;
  locationCode: string;
  businessEntityCode: string;
  deviceCode?: string;
  cashControlEnabled?: boolean;
  maxCashAmount?: number;
  managerEmail?: string;
}

export type UpdateCashRegisterPayload = Partial<CreateCashRegisterPayload>;

export interface CreateCashMovementPayload {
  sessionNumber: string;
  movementType: Exclude<
    CashMovementType,
    "PAYMENT" | "OPENING_FLOAT" | "CLOSING_COUNT"
  >;
  amount: number;
  documentType?: string;
  documentNumber?: string;
  flowCategory?: string;
  referenceType?: string;
  referenceCode?: string;
  counterpartyType?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  reason?: string;
  createdBy: string;
  metadataJson?: string;
  relatedMovementNumber?: string;
  batchId?: string;
  exchangeRate?: number;
  channel?: "MANUAL" | "AUTO_PAYMENT" | "IMPORT" | "API" | "POS";
  deviceCode?: string;
  deviceIp?: string;
  subCategory?: string;
  tags?: string;
}

export interface CreateVoucherPayload {
  amount: number;
  documentNumber?: string;
  flowCategory?: string;
  referenceType?: string;
  referenceCode?: string;
  counterpartyType?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  reason: string;
  createdBy: string;
  metadataJson?: string;
}

export interface CreateCashRequestPayload {
  requestType: CashRequestType;
  amount: number;
  currency: string;
  reason: string;
  requestedBy: string;
  attachments?: CashMovementAttachment[];
}

export interface ReviewCashRequestPayload {
  reviewedBy: string;
  note?: string;
}

export interface RefundOrReversePayload {
  amount?: number;
  reason: string;
  processedBy: string;
}

// ==================== Service ====================
export const paymentService = {
  // Payment Intents
  getPaymentIntents: async (params?: {
    status?: PaymentIntentStatus | string;
    customerType?: string;
    customerCode?: string;
    sourceType?: string;
    sourceCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<PaymentIntent>> => {
    const response = await apiClient.get("/sni/api/v1/payments/intents", {
      params,
    });
    return normalizePaginated<PaymentIntent>(response.data);
  },

  getPaymentIntent: async (intentNumber: string): Promise<PaymentIntent> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/intents/${intentNumber}`,
    );
    return response.data;
  },

  createPaymentIntent: async (
    data: CreatePaymentIntentPayload,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post("/sni/api/v1/payments/intents", data);
    return response.data;
  },

  createPaymentIntentFromBilling: async (
    data: CreatePaymentIntentFromBillingPayload,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      "/sni/api/v1/payments/intents/from-billing-document",
      data,
    );
    return response.data;
  },

  createPaymentIntentFromBillings: async (
    data: CreatePaymentIntentFromBillingsPayload,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      "/sni/api/v1/payments/intents/from-billing-documents",
      data,
    );
    return response.data;
  },

  createRecoveryIntent: async (
    data: CreateRecoveryIntentPayload,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      "/sni/api/v1/payments/intents/recovery",
      data,
    );
    return response.data;
  },

  getTransactions: async (
    intentNumber: string,
  ): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/intents/${intentNumber}/transactions`,
    );
    return normalizeArray<PaymentTransaction>(response.data);
  },

  payCash: async (
    intentNumber: string,
    data: PayCashPayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(
      `/sni/api/v1/payments/intents/${intentNumber}/cash`,
      data,
    );
    return response.data;
  },

  payWallet: async (
    intentNumber: string,
    data: PayWalletPayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(
      `/sni/api/v1/payments/intents/${intentNumber}/wallet`,
      data,
    );
    return response.data;
  },

  // Mobile Money
  getMobileMoneyProviders: async (): Promise<MobileMoneyProvider[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/payments/mobile-money/providers",
    );
    return normalizeArray<MobileMoneyProvider>(response.data);
  },

  initiateMobileMoneyDeposit: async (
    data: InitiateMobileMoneyDepositPayload,
  ): Promise<MobileMoneyDeposit> => {
    const response = await apiClient.post(
      "/sni/api/v1/payments/mobile-money/deposits",
      data,
    );
    return response.data;
  },

  getMobileMoneyDeposit: async (
    depositId: string,
  ): Promise<MobileMoneyDeposit> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/mobile-money/deposits/${depositId}`,
    );
    return response.data;
  },

  testPawaPay: async (phoneNumber: string): Promise<MobileMoneyDeposit> => {
    const response = await apiClient.post(
      `/sni/api/v1/payments/mobile-money/pawaypay/test/${phoneNumber}`,
    );
    return response.data;
  },

  // Recovery / payable documents
  getRecovery: async (
    customerType: string,
    customerCode: string,
    params?: { currency?: string },
  ): Promise<RecoveryOverview> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/recovery/${customerType}/${customerCode}`,
      { params },
    );
    return response.data;
  },

  getPayableDocuments: async (params?: {
    customerType?: string;
    customerCode?: string;
    documentType?: string;
    lineSourceType?: string;
    lineSourceCode?: string;
    searchText?: string;
  }): Promise<PayableDocument[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/payments/payable-documents",
      { params },
    );
    return normalizeArray<PayableDocument>(response.data);
  },

  // Receipts
  getReceipt: async (transactionNumber: string): Promise<PaymentReceipt> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/transactions/${transactionNumber}/receipt`,
    );
    return response.data;
  },

  /** PDF d'administration : l'original puis son duplicata « DUPLICATA » dans un même fichier. */
  getReceiptPdf: async (transactionNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/transactions/${transactionNumber}/receipt/pdf`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },

  getReceiptByNumber: async (
    receiptNumber: string,
  ): Promise<PaymentReceipt> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/receipts/${receiptNumber}`,
    );
    return response.data;
  },

  /** Même contenu que getReceiptPdf : original puis duplicata. */
  getReceiptPdfByNumber: async (receiptNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/receipts/${receiptNumber}/pdf`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },

  // Refunds / reversals
  refundTransaction: async (
    transactionNumber: string,
    data: RefundOrReversePayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.post(
      `/sni/api/v1/payments/transactions/${transactionNumber}/refund`,
      data,
    );
    return response.data;
  },

  reverseTransaction: async (
    transactionNumber: string,
    data: RefundOrReversePayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.post(
      `/sni/api/v1/payments/transactions/${transactionNumber}/reverse`,
      data,
    );
    return response.data;
  },

  getTransactionRefunds: async (
    transactionNumber: string,
  ): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/payments/transactions/${transactionNumber}/refunds`,
    );
    return normalizeArray<PaymentTransaction>(response.data);
  },

  // Reconciliation
  createReconciliationBatch: async (data: {
    provider: string;
    createdBy: string;
  }): Promise<{ batchNumber: string; status: string }> => {
    const response = await apiClient.post(
      "/sni/api/v1/payments/reconciliation-batches",
      data,
    );
    return response.data;
  },

  completeReconciliationBatch: async (batchNumber: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/payments/reconciliation-batches/${batchNumber}/complete`,
    );
  },

  // Cash Registers
  getCashRegisters: async (params?: {
    active?: boolean;
    locationCode?: string;
    businessEntityCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashRegister>> => {
    const response = await apiClient.get("/sni/api/v1/cash-registers", {
      params,
    });
    return normalizePaginated<CashRegister>(response.data);
  },

  createCashRegister: async (
    data: CreateCashRegisterPayload,
  ): Promise<CashRegister> => {
    const response = await apiClient.post("/sni/api/v1/cash-registers", data);
    return response.data;
  },

  // Pas d'endpoint backend de modification de caisse : cet appel lève une erreur.
  updateCashRegister: async (
    _registerCode: string,
    _data: UpdateCashRegisterPayload,
  ): Promise<CashRegister> => {
    throw new Error(
      "updateCashRegister: aucun endpoint backend pour modifier une caisse. " +
        "A demander au backend (voir payment-billing-wallet-phases-2-5-frontend-api.md §1.1).",
    );
  },

  activateCashRegister: async (registerCode: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/cash-registers/${registerCode}/activate`,
    );
  },

  deactivateCashRegister: async (registerCode: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/cash-registers/${registerCode}/deactivate`,
    );
  },

  // Cash Sessions
  getCashSessions: async (params?: {
    registerCode?: string;
    status?: CashSessionStatus | string;
    openedBy?: string;
    closedBy?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashSession>> => {
    const response = await apiClient.get(
      "/sni/api/v1/cash-registers/sessions",
      { params },
    );
    return normalizePaginated<CashSession>(response.data);
  },

  // Détail brut d'une session (si 404, utiliser getCashSessionSummary).
  getCashSession: async (sessionNumber: string): Promise<CashSession> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}`,
    );
    return response.data;
  },

  getCashSessionSummary: async (
    sessionNumber: string,
  ): Promise<CashSession> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/summary`,
    );
    return response.data;
  },

  openCashSession: async (data: {
    registerCode: string;
    openedBy: string;
    openingAmount?: number;
  }): Promise<CashSession> => {
    const response = await apiClient.post(
      "/sni/api/v1/cash-registers/sessions",
      data,
    );
    return response.data;
  },

  requestSessionClosing: async (
    sessionNumber: string,
    data: {
      closedBy: string;
      countedClosingAmount: number | null;
      varianceReason?: string;
    },
  ): Promise<CashSession> => {
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/closing-request`,
      data,
    );
    return response.data;
  },

  closeCashSession: async (
    sessionNumber: string,
    data: {
      closedBy: string;
      countedClosingAmount: number;
      varianceReason?: string;
    },
  ): Promise<CashSession> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/close`,
      data,
    );
    return response.data;
  },

  approveVariance: async (
    sessionNumber: string,
    data: { reviewedBy: string; note?: string },
  ): Promise<CashSession> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/approve-variance`,
      data,
    );
    return response.data;
  },

  getClosingReportPdf: async (sessionNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/closing-report`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },

  // Cash Movements
  getCashMovements: async (params?: {
    registerCode?: string;
    sessionNumber?: string;
    movementType?: CashMovementType | string;
    documentType?: string;
    documentNumber?: string;
    flowCategory?: string;
    referenceType?: string;
    referenceCode?: string;
    counterpartyCode?: string;
    counterpartyName?: string;
    createdBy?: string;
    fromDate?: string;
    toDate?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashMovement>> => {
    const response = await apiClient.get(
      "/sni/api/v1/cash-registers/movements",
      { params },
    );
    return normalizePaginated<CashMovement>(response.data);
  },

  createCashMovement: async (
    data: CreateCashMovementPayload,
  ): Promise<CashMovement> => {
    const { sessionNumber, ...payload } = data;
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/movements`,
      payload,
    );
    return response.data;
  },

  createEntryVoucher: async (
    sessionNumber: string,
    data: CreateVoucherPayload,
  ): Promise<CashMovement> => {
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/entry-vouchers`,
      data,
    );
    return response.data;
  },

  createExitVoucher: async (
    sessionNumber: string,
    data: CreateVoucherPayload,
  ): Promise<CashMovement> => {
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/exit-vouchers`,
      data,
    );
    return response.data;
  },

  addCashMovementAttachment: async (
    movementNumber: string,
    data: CashMovementAttachment,
  ): Promise<CashMovement> => {
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/movements/${movementNumber}/attachments`,
      data,
    );
    return response.data;
  },

  signCashMovement: async (
    movementNumber: string,
    signedBy: string,
  ): Promise<CashMovement> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/movements/${movementNumber}/sign`,
      undefined,
      {
        params: { signedBy },
      },
    );
    return response.data;
  },

  printCashMovement: async (movementNumber: string): Promise<CashMovement> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/movements/${movementNumber}/print`,
    );
    return response.data;
  },

  getCashMovementDocumentPdf: async (movementNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/movements/${movementNumber}/document`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },

  // Cash Requests
  createCashRequest: async (
    sessionNumber: string,
    data: CreateCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/sessions/${sessionNumber}/requests`,
      data,
    );
    return response.data;
  },

  getCashRequests: async (params?: {
    registerCode?: string;
    sessionNumber?: string;
    requestType?: CashRequestType | string;
    status?: CashRequestStatus | string;
    requestedBy?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashRequest>> => {
    const response = await apiClient.get(
      "/sni/api/v1/cash-registers/requests",
      { params },
    );
    return normalizePaginated<CashRequest>(response.data);
  },

  getCashRequest: async (requestNumber: string): Promise<CashRequest> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/requests/${requestNumber}`,
    );
    return response.data;
  },

  approveCashRequest: async (
    requestNumber: string,
    data: ReviewCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/requests/${requestNumber}/approve`,
      data,
    );
    return response.data;
  },

  rejectCashRequest: async (
    requestNumber: string,
    data: ReviewCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/requests/${requestNumber}/reject`,
      data,
    );
    return response.data;
  },

  getCashRequestDocumentPdf: async (requestNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/requests/${requestNumber}/document`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },

  // Cash metrics / statistics
  getCashMetricsOverview: async (params?: {
    registerCode?: string;
    businessEntityCode?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CashMetricsOverview> => {
    const response = await apiClient.get(
      "/sni/api/v1/cash-registers/metrics/overview",
      { params },
    );
    return response.data;
  },

  getCashMetricsRegisters: async (params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<CashRegisterStatistics[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/cash-registers/metrics/registers",
      { params },
    );
    return normalizeArray<CashRegisterStatistics>(response.data);
  },

  getCashSessionStatistics: async (
    sessionNumber: string,
  ): Promise<CashSessionStatistics> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/statistics/sessions/${sessionNumber}`,
    );
    return response.data;
  },

  getCashierStatistics: async (
    cashierCode: string,
  ): Promise<CashierStatistics> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/statistics/cashiers/${cashierCode}`,
    );
    return response.data;
  },

  getCashRegisterStatistics: async (
    registerCode: string,
    params?: { fromDate?: string; toDate?: string },
  ): Promise<CashRegisterStatistics> => {
    const response = await apiClient.get(
      `/sni/api/v1/cash-registers/statistics/registers/${registerCode}`,
      { params },
    );
    return response.data;
  },

  // Cash anomalies
  analyzeCashSession: async (sessionNumber: string): Promise<any> => {
    const response = await apiClient.post(
      `/sni/api/v1/cash-registers/anomalies/sessions/${sessionNumber}/analyze`,
    );
    return response.data;
  },

  getCashAnomalies: async (params?: {
    registerCode?: string;
    sessionNumber?: string;
    cashierCode?: string;
    severity?: CashAnomalySeverity | string;
    reviewStatus?: CashAnomalyReviewStatus | string;
    anomalyType?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashAnomalyFlag>> => {
    const response = await apiClient.get(
      "/sni/api/v1/cash-registers/anomalies",
      { params },
    );
    return normalizePaginated<CashAnomalyFlag>(response.data);
  },

  reviewCashAnomaly: async (
    flagNumber: string,
    data: {
      reviewedBy: string;
      status?: CashAnomalyReviewStatus | string;
      note?: string;
    },
  ): Promise<CashAnomalyFlag> => {
    const response = await apiClient.patch(
      `/sni/api/v1/cash-registers/anomalies/${flagNumber}/review`,
      data,
    );
    return response.data;
  },

  // Politique d'annulation des réservations (module réservation).
  getBookingCancellationPolicy: async (): Promise<CancellationPolicyRule[]> => {
    const response = await apiClient.get(
      "/sni/api/v1/bookings/cancellation-policy",
    );
    return normalizeArray<CancellationPolicyRule>(response.data);
  },
};