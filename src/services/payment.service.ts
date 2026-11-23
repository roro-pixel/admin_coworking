import { apiClient } from "./api";

const API = "/sni/api/v1";

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

/**
 * Champs d'acteur : l'auteur de l'action est le compte connecté (jeton), le backend ne lit pas ces champs.
 * Ils restent acceptés dans les payloads (anciens écrans) mais ne partent jamais vers l'API.
 */
const ACTOR_KEYS = [
  "receivedBy",
  "createdBy",
  "openedBy",
  "closedBy",
  "requestedBy",
  "reviewedBy",
  "processedBy",
];

function stripActors<T extends object>(data: T): Omit<T, never> {
  const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  ACTOR_KEYS.forEach((k) => delete copy[k]);
  return copy as T;
}

const newIdemKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** En-tête conseillé sur les encaissements, remboursements et opérations qui engagent de l'argent. */
const idem = (key?: string) => ({
  headers: { "Idempotency-Key": key ?? newIdemKey() },
});

// ==================== Enums / unions ====================
/** Statuts réels de l'intention (FAILED et AUTHORIZED n'existent plus). */
export type PaymentIntentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "REVERSED";

export type PaymentMethod =
  | "CASH"
  | "WALLET"
  | "MOBILE_MONEY"
  | "MOBILE_MONEY_OFFLINE"
  | "BANK_TRANSFER"
  | "CARD"
  | "CHEQUE"
  | "MANUAL_ADJUSTMENT"
  | "CREDIT_NOTE";

/** Moyens saisissables à la main au guichet (PATCH .../offline). */
export type OfflinePaymentMethod =
  | "CHEQUE"
  | "BANK_TRANSFER"
  | "MOBILE_MONEY_OFFLINE";

export type OfflineMobileOperator = "MTN_MOMO" | "AIRTEL_MONEY";

export type PaymentTransactionStatus =
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED"
  | "REVERSED";

export type PaymentChannel = "SELF_SERVICE" | "BACK_OFFICE" | "SYSTEM";

export type CashSessionStatus =
  | "OPENING"
  | "OPEN"
  | "PAUSED"
  | "SUSPENDED"
  | "COUNTING"
  | "CLOSING_REVIEW"
  | "RECOUNT"
  | "CLOSED"
  | "CANCELLED";

export type CashMovementType =
  | "OPENING_FLOAT"
  | "PAYMENT"
  | "REFUND"
  | "CASH_IN"
  | "CASH_OUT"
  | "SAFE_DEPOSIT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "CLOSING_COUNT"
  | "EXCHANGE"
  | "VARIANCE";

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
export type CashAnomalyStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "DISMISSED"
  | "ESCALATED"
  | "RESOLVED";
/** Ancien nom, conservé pour les écrans existants. */
export type CashAnomalyReviewStatus = CashAnomalyStatus;
export type CashAnomalyType =
  | "VARIANCE_OUTLIER"
  | "ROUND_NUMBER_PATTERN"
  | "EXCESSIVE_REFUNDS"
  | "EXCESSIVE_ADJUSTMENTS"
  | "OFF_HOURS_SESSION"
  | "THRESHOLD_STRUCTURING"
  | "NEAR_MAX_CASH_RECURRENCE"
  | "OPENING_VARIANCE"
  | "LONG_SESSION"
  | "LONG_PAUSES"
  | "REPEATED_REVERSALS"
  | "DETENTION_CAP_EXCEEDED"
  | "UNKNOWN_DEVICE"
  | "DAMAGED_NOTES"
  | "TRANSFER_VARIANCE";

export type CashDeclarationStatus =
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export type MobileMoneyResolveAction = "SYNC" | "MARK_SUCCEEDED" | "MARK_FAILED";

// ==================== Payment types ====================
export interface PaymentIntent {
  intentNumber: string;
  customerType: string;
  customerCode: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddressJson?: string;
  customerRegistered?: boolean;
  resolvedSourceType?: string;
  resolvedSourceCode?: string;
  resolvedSourceLabel?: string;
  resolvedSourceRegistered?: boolean;
  /** Total à payer. */
  amount: number;
  /** Encaissé. */
  paidAmount?: number;
  /** En attente d'un opérateur (dépôt mobile money en cours). */
  processingAmount?: number;
  /** amount - paidAmount. */
  remainingAmount?: number;
  /** remainingAmount - processingAmount : ce qu'on peut encaisser maintenant. */
  payableAmount?: number;
  currency: string;
  purpose: string;
  sourceType: string;
  sourceCode?: string;
  status: PaymentIntentStatus;
  paymentLinkToken?: string;
  paymentLinkExpiresAt?: string;
  idempotencyKey?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  metadataJson?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  relaunchCount?: number;
  lastRelaunchedAt?: string;
  lastRelaunchedBy?: string;
  /** Calculés par le serveur : afficher « Relancer » / « Annuler l'intention ». */
  relaunchable?: boolean;
  cancellable?: boolean;
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
  title?: string;
}

export interface PendingBillableItem {
  billableNumber: string;
  sourceType: string;
  sourceCode?: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RecoveryOverview {
  customerType: string;
  customerCode: string;
  currency: string;
  openDocumentAmount: number;
  pendingBillableAmount: number;
  totalPayableAmount: number;
  documents: PayableDocument[];
  pendingBillableItems: PendingBillableItem[];
  paymentIntent: PaymentIntent | null;
}

export interface PaymentTransaction {
  transactionNumber: string;
  intentNumber: string;
  amount: number;
  currency?: string;
  /** Ancien nom, certains écrans le lisent encore. */
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  status: PaymentTransactionStatus | string;
  provider?: string;
  providerReference?: string;
  receiptNumber?: string;
  paidAt?: string;
  processedAt?: string;
  processedBy?: string;
  receivedBy?: string;
  failureReason?: string;
  metadataJson?: string;
  channel?: PaymentChannel | null;
  /** À afficher tel quel plutôt que de traduire paymentMethod. */
  paymentMethodLabel?: string;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  cashSessionNumber?: string;
  bankName?: string;
  payerName?: string;
  payerPhone?: string;
  createdAt?: string;
}

export interface PaymentReceiptAllocation {
  documentNumber: string;
  documentType?: string;
  title?: string;
  documentTotalAmount?: number;
  allocatedAmount: number;
  remainingBalanceDue?: number;
  currency?: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  receiptIssuedAt?: string;
  transactionNumber: string;
  intentNumber: string;
  paymentMethod: PaymentMethod | string;
  transactionStatus?: PaymentTransactionStatus | string;
  provider?: string;
  providerReference?: string;
  depositId?: string;
  payerPhone?: string;
  operatorReference?: string;
  purpose?: string;
  sourceType?: string;
  sourceCode?: string;
  customerType?: string;
  customerCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paidAmount: number;
  allocatedAmount: number;
  advanceAmount: number;
  currency?: string;
  paidAt: string;
  receivedBy: string;
  allocations?: PaymentReceiptAllocation[];
  paymentMethodLabel?: string;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  bankName?: string;
  payerName?: string;
}

export interface CashChangePreview {
  currency: string;
  amountDue: number;
  tenderedAmount: number;
  appliedAmount: number;
  changeAmount: number;
  remainingAfter: number;
}

export interface PaymentLink {
  intentNumber: string;
  checkoutUrl: string;
  token: string;
  expiresAt?: string;
  emailedTo?: string;
}

export interface CashPaymentDeclaration {
  declarationNumber: string;
  documentNumber?: string;
  bookingNumber?: string;
  customerType?: string;
  customerCode?: string;
  customerName?: string;
  amount: number;
  currency: string;
  status: CashDeclarationStatus;
  note?: string;
  declaredAt?: string;
  declaredBy?: string;
  expiresAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  confirmedAmount?: number;
  cashSessionNumber?: string;
  transactionNumber?: string;
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
  confirmationNote?: string;
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
  /** Phrase à afficher au payeur. */
  customerMessage?: string;
  payer?: {
    type?: string;
    accountDetails?: { phoneNumber?: string; provider?: string };
  };
  provider: string;
  amount: number;
  currency: string;
  /** Statut technique : CREATED, PROCESSING, SUBMITTED_UNCONFIRMED, SUCCEEDED, FAILED, UNRESOLVED. */
  status: string;
  /** Phase d'affichage : WAITING_FOR_PAYER, CONFIRMING, COMPLETED, FAILED, UNRESOLVED. */
  phase?: string;
  providerMessage?: string;
  failureReason?: string;
  failureCode?: string;
  userMessage?: string;
  retryable?: boolean;
  nextStatusCheckAt?: string;
  intentNumber: string;
  transactionNumber?: string;
  customerType?: string;
  customerCode?: string;
  callbackUrl?: string;
  requestPayloadJson?: string;
  providerResponseJson?: string;
  lastStatusCheckedAt?: string;
  completedAt?: string;
  failedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  transaction?: PaymentTransaction;
}

export interface MobileMoneyCallback {
  id: string;
  kind?: string;
  referenceId?: string;
  reportedStatus?: string;
  signaturePresent?: boolean;
  verifiedVia?: string;
  /** PROCESSED, DEFERRED, IGNORED, FAILED. */
  outcome?: string;
  detail?: string;
  remoteAddress?: string;
  receivedAt?: string;
  processedAt?: string;
}

export interface MobileMoneyProviderView {
  available: boolean;
  found?: boolean;
  status?: string;
  amount?: number;
  currency?: string;
  providerTransactionId?: string;
  failureCode?: string;
  failureMessage?: string;
  error?: string;
}

export interface MobileMoneyDiscrepancy {
  severity?: string;
  code: string;
  message: string;
  suggestedAction?: string;
}

export interface MobileMoneyOperationDetail {
  deposit: MobileMoneyDeposit;
  intentStatus?: string;
  transactionStatus?: string;
  provider?: MobileMoneyProviderView;
  discrepancies?: MobileMoneyDiscrepancy[];
  callbacks?: MobileMoneyCallback[];
}

export interface MobileMoneyStatusTotal {
  status: string;
  currency: string;
  count: number;
  amount: number;
}

export interface MobileMoneyReconciliationLine {
  deposit: MobileMoneyDeposit;
  provider?: MobileMoneyProviderView;
  discrepancies: MobileMoneyDiscrepancy[];
}

export interface MobileMoneyReconciliation {
  from?: string;
  to?: string;
  checked: number;
  truncated: boolean;
  discrepancies: MobileMoneyReconciliationLine[];
}

export interface MobileMoneyTestDeposit {
  deposit?: MobileMoneyDeposit;
  intent?: PaymentIntent;
  providers?: MobileMoneyProvider[];
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

/** Paiements non espèces rattachés à une session : hors totalPayments et hors solde attendu. */
export interface NonCashPaymentTotal {
  paymentMethod: PaymentMethod | string;
  provider?: string;
  label: string;
  count: number;
  amount: number;
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
  nonCashPayments?: NonCashPaymentTotal[];
}

export interface CashMovementAccounting {
  journalCode?: string;
  status?: string;
  entryNumber?: string;
  note?: string;
  vatAmount?: number;
  vatCode?: string;
  supplierCode?: string;
  beneficiaryName?: string;
  beneficiaryIdNumber?: string;
  beneficiaryPhone?: string;
  requestNumber?: string;
}

export interface CashMovementAttachment {
  id?: string;
  uploadedAt?: string;
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
  flowDirection?: "IN" | "OUT" | "ADJUSTMENT";
  amountCurrency?: string;
  currency?: string;
  exchangeRate?: number;
  channel?: string;
  natureCode?: string;
  transferOrderNumber?: string;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
  reversalReason?: string;
  cancelReason?: string;
  accounting?: CashMovementAccounting;
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
  executedMovementNumber?: string;
  executedAt?: string;
  requestedAt?: string;
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

/** Ligne de GET /cash-registers/metrics/registers (CashRegisterMetricsResponse). */
export interface CashRegisterMetrics {
  registerCode: string;
  registerName: string;
  businessEntityCode?: string;
  deviceCode?: string;
  openSessionCount: number;
  closingReviewSessionCount: number;
  movementCount: number;
  totalPayments: number;
  totalRefunds: number;
  totalCashIn: number;
  totalCashOut: number;
  totalAdjustments: number;
  netCashPosition: number;
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

/** CashAnomalyFlagResponse : pas de cashierCode, la date est detectedAt, le statut `status`. */
export interface CashAnomalyFlag {
  flagNumber: string;
  sessionNumber: string;
  movementNumber?: string;
  registerCode?: string;
  anomalyType: CashAnomalyType | string;
  severity: CashAnomalySeverity;
  score?: number;
  description?: string;
  detectedAt?: string;
  status?: CashAnomalyStatus;
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
  purpose?: string;
  sourceType?: string;
  sourceCode?: string;
  idempotencyKey?: string;
  expiresAt?: string;
  metadataJson?: string;
  /** @deprecated le champ n'existe pas côté API : passer le motif dans metadataJson. */
  description?: string;
  /** @deprecated l'auteur vient du jeton. */
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
  amount?: number;
  idempotencyKey?: string;
  expiresAt?: string;
  metadataJson?: string;
}

export interface CreateRecoveryIntentPayload {
  customerType: string;
  customerCode: string;
  currency?: string;
  expiresAt?: string;
  metadataJson?: string;
}

export interface PayCashPayload {
  /** Obligatoire : session OPEN d'une caisse tenue au guichet. */
  cashSessionNumber: string;
  /** Absent : le reste payable. */
  amount?: number;
  providerReference?: string;
  metadataJson?: string;
  /** Montant remis par le client : le serveur calcule la monnaie à rendre. */
  tenderedAmount?: number;
  /** @deprecated l'auteur vient du jeton. */
  receivedBy?: string;
}

export interface PayOfflinePayload {
  paymentMethod: OfflinePaymentMethod;
  amount?: number;
  /** N° de chèque, référence du virement ou identifiant de transaction chez l'opérateur (≤ 120). */
  reference?: string;
  bankName?: string;
  payerName?: string;
  payerPhone?: string;
  operator?: OfflineMobileOperator;
  cashSessionNumber?: string;
  metadataJson?: string;
  /** @deprecated l'auteur vient du jeton. */
  receivedBy?: string;
}

export interface PayWalletPayload {
  walletNumber: string;
  amount?: number;
  metadataJson?: string;
  /** @deprecated l'auteur vient du jeton. */
  createdBy?: string;
}

export interface InitiateMobileMoneyDepositPayload {
  /** Inutile sur le PATCH de l'intention ; obligatoire sur POST /mobile-money/deposits. */
  intentNumber?: string;
  phoneNumber: string;
  correspondent: string;
  /** Entier de XAF, absent : tout le reste payable. */
  amount?: number;
  metadataJson?: string;
  /** @deprecated l'auteur vient du jeton. */
  createdBy?: string;
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

export interface UpdateCashRegisterPayload extends Partial<CreateCashRegisterPayload> {
  parentRegisterCode?: string;
  acceptedMethods?: PaymentMethod[];
  acceptedCurrencies?: string[];
  capBehavior?: "ALERT" | "BLOCK";
  maxOutPerOperation?: number;
  maxOutPerDay?: number;
  standardFloat?: number;
  alertRecipients?: string[];
  treasuryAccountNumber?: string;
  defaultJournalCode?: string;
  effectiveAt?: string;
  reason?: string;
}

export interface CreateCashMovementPayload {
  sessionNumber: string;
  movementType: Exclude<
    CashMovementType,
    "PAYMENT" | "OPENING_FLOAT" | "CLOSING_COUNT" | "EXCHANGE" | "VARIANCE"
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
  createdBy?: string;
  metadataJson?: string;
  relatedMovementNumber?: string;
  batchId?: string;
  exchangeRate?: number;
  channel?: "MANUAL" | "AUTO_PAYMENT" | "IMPORT" | "API" | "POS";
  deviceCode?: string;
  deviceIp?: string;
  subCategory?: string;
  tags?: string;
  direction?: "IN" | "OUT" | "ADJUSTMENT";
  natureCode?: string;
  journalCode?: string;
  vatAmount?: number;
  vatCode?: string;
  supplierCode?: string;
  beneficiaryName?: string;
  beneficiaryIdNumber?: string;
  beneficiaryPhone?: string;
  requestNumber?: string;
}

export interface CreateVoucherPayload {
  amount: number;
  documentType?: string;
  natureCode?: string;
  documentNumber?: string;
  flowCategory?: string;
  referenceType?: string;
  referenceCode?: string;
  counterpartyType?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  reason: string;
  createdBy?: string;
  metadataJson?: string;
}

export interface CreateCashRequestPayload {
  requestType: CashRequestType;
  amount: number;
  currency: string;
  reason: string;
  requestedBy?: string;
  attachments?: CashMovementAttachment[];
}

export interface ReviewCashRequestPayload {
  reviewedBy?: string;
  note?: string;
}

export interface RefundOrReversePayload {
  /** Absent : tout le reste remboursable. */
  amount?: number;
  reason: string;
  /** Obligatoire pour rembourser un paiement en espèces (sortie REFUND dans cette session). */
  cashSessionNumber?: string;
  /** @deprecated l'auteur vient du jeton. */
  processedBy?: string;
}

// ==================== Service ====================
export const paymentService = {
  // ---------- Payment intents ----------
  getPaymentIntents: async (params?: {
    status?: PaymentIntentStatus | string;
    customerType?: string;
    customerCode?: string;
    sourceType?: string;
    sourceCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
    /** Ignoré par le backend (page construite sans tri). */
    sort?: string;
  }): Promise<PaginatedResult<PaymentIntent>> => {
    const { sort: _sort, ...query } = params ?? {};
    const response = await apiClient.get(`${API}/payments/intents`, {
      params: query,
    });
    return normalizePaginated<PaymentIntent>(response.data);
  },

  getPaymentIntent: async (intentNumber: string): Promise<PaymentIntent> => {
    const response = await apiClient.get(
      `${API}/payments/intents/${intentNumber}`,
    );
    return response.data;
  },

  /** Intention vue par son jeton de lien de paiement. */
  getPaymentLinkIntent: async (token: string): Promise<PaymentIntent> => {
    const response = await apiClient.get(`${API}/payment-links/${token}`);
    return response.data;
  },

  createPaymentIntent: async (
    data: CreatePaymentIntentPayload,
  ): Promise<PaymentIntent> => {
    const { description, createdBy: _createdBy, ...rest } = data;
    const payload = { ...rest } as CreatePaymentIntentPayload;
    if (description && !payload.metadataJson) {
      payload.metadataJson = JSON.stringify({ description });
    }
    const response = await apiClient.post(`${API}/payments/intents`, payload);
    return response.data;
  },

  createPaymentIntentFromBilling: async (
    data: CreatePaymentIntentFromBillingPayload,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      `${API}/payments/intents/from-billing-document`,
      data,
    );
    return response.data;
  },

  createPaymentIntentFromBillings: async (
    data: CreatePaymentIntentFromBillingsPayload,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      `${API}/payments/intents/from-billing-documents`,
      data,
    );
    return response.data;
  },

  /** Confirme le recouvrement : peut émettre une facture « Recouvrement » et renvoyer une intention existante. */
  createRecoveryIntent: async (
    data: CreateRecoveryIntentPayload,
  ): Promise<RecoveryOverview> => {
    const response = await apiClient.post(
      `${API}/payments/intents/recovery`,
      data,
    );
    return response.data;
  },

  cancelPaymentIntent: async (
    intentNumber: string,
    reason?: string,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      `${API}/payments/intents/${intentNumber}/cancel`,
      reason?.trim() ? { reason: reason.trim() } : undefined,
    );
    return response.data;
  },

  relaunchPaymentIntent: async (
    intentNumber: string,
    expiresAt?: string,
  ): Promise<PaymentIntent> => {
    const response = await apiClient.post(
      `${API}/payments/intents/${intentNumber}/relaunch`,
      expiresAt ? { expiresAt } : undefined,
    );
    return response.data;
  },

  createPaymentLink: async (
    intentNumber: string,
    expiresInMinutes?: number,
  ): Promise<PaymentLink> => {
    const response = await apiClient.post(
      `${API}/payments/intents/${intentNumber}/link`,
      expiresInMinutes ? { expiresInMinutes } : undefined,
    );
    return response.data;
  },

  getTransactions: async (
    intentNumber: string,
  ): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get(
      `${API}/payments/intents/${intentNumber}/transactions`,
    );
    return normalizeArray<PaymentTransaction>(response.data);
  },

  // ---------- Encaissement au guichet ----------
  /** Aperçu serveur (sans effet) de la monnaie à rendre, à espacer d'environ 300 ms. */
  previewIntentCashChange: async (
    intentNumber: string,
    tenderedAmount: number,
    amount?: number,
  ): Promise<CashChangePreview> => {
    const response = await apiClient.get(
      `${API}/payments/intents/${intentNumber}/cash-change`,
      { params: { tenderedAmount, amount } },
    );
    return response.data;
  },

  previewDocumentCashChange: async (
    documentNumber: string,
    tenderedAmount: number,
    amount?: number,
  ): Promise<CashChangePreview> => {
    const response = await apiClient.get(
      `${API}/payments/billing-documents/${documentNumber}/cash-change`,
      { params: { tenderedAmount, amount } },
    );
    return response.data;
  },

  payCash: async (
    intentNumber: string,
    data: PayCashPayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(
      `${API}/payments/intents/${intentNumber}/cash`,
      stripActors(data),
      idem(),
    );
    return response.data;
  },

  /** Chèque, virement, mobile money hors plateforme (MTN MoMo Pay, Airtel Money). */
  payOffline: async (
    intentNumber: string,
    data: PayOfflinePayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(
      `${API}/payments/intents/${intentNumber}/offline`,
      stripActors(data),
      idem(),
    );
    return response.data;
  },

  payWallet: async (
    intentNumber: string,
    data: PayWalletPayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.patch(
      `${API}/payments/intents/${intentNumber}/wallet`,
      stripActors(data),
      idem(),
    );
    return response.data;
  },

  // ---------- Mobile money (plateforme, PawaPay) ----------
  getMobileMoneyProviders: async (): Promise<MobileMoneyProvider[]> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/providers`,
    );
    return normalizeArray<MobileMoneyProvider>(response.data);
  },

  /** PATCH de l'intention : le numéro d'intention du corps est inutile. */
  initiateMobileMoneyOnIntent: async (
    intentNumber: string,
    data: InitiateMobileMoneyDepositPayload,
  ): Promise<MobileMoneyDeposit> => {
    const { intentNumber: _n, ...rest } = data;
    const response = await apiClient.patch(
      `${API}/payments/intents/${intentNumber}/mobile-money`,
      stripActors(rest),
      idem(),
    );
    return response.data;
  },

  /** Variante équivalente : intentNumber est alors obligatoire dans le corps. */
  initiateMobileMoneyDeposit: async (
    data: InitiateMobileMoneyDepositPayload,
  ): Promise<MobileMoneyDeposit> => {
    const response = await apiClient.post(
      `${API}/payments/mobile-money/deposits`,
      stripActors(data),
      idem(),
    );
    return response.data;
  },

  getMobileMoneyDeposits: async (params?: {
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<MobileMoneyDeposit>> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/deposits`,
      { params },
    );
    return normalizePaginated<MobileMoneyDeposit>(response.data);
  },

  getMobileMoneyDeposit: async (
    depositId: string,
  ): Promise<MobileMoneyDeposit> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/deposits/${depositId}`,
    );
    return response.data;
  },

  /** Relit le statut chez PawaPay (bouton « Relire »). */
  recheckMobileMoneyDeposit: async (
    depositId: string,
  ): Promise<MobileMoneyDeposit> => {
    const response = await apiClient.post(
      `${API}/payments/mobile-money/deposits/${depositId}/recheck`,
    );
    return response.data;
  },

  getMobileMoneyCallbacks: async (params?: {
    outcome?: "PROCESSED" | "DEFERRED" | "IGNORED" | "FAILED" | string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<MobileMoneyCallback>> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/callbacks`,
      { params },
    );
    return normalizePaginated<MobileMoneyCallback>(response.data);
  },

  /** Essai réel sur un vrai téléphone (ADMIN, développement uniquement). */
  testPawaPay: async (
    phoneNumber: string,
    params?: { operator?: string; amount?: number },
  ): Promise<MobileMoneyTestDeposit> => {
    const response = await apiClient.post(
      `${API}/payments/mobile-money/pawaypay/test/${phoneNumber}`,
      undefined,
      { params },
    );
    return response.data;
  },

  // ---------- Supervision et rapprochement mobile money ----------
  getMobileMoneyOperations: async (params?: {
    from?: string;
    to?: string;
    status?: string;
    provider?: string;
    customerCode?: string;
    phone?: string;
    reference?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResult<MobileMoneyDeposit>> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/operations`,
      { params },
    );
    return normalizePaginated<MobileMoneyDeposit>(response.data);
  },

  getMobileMoneyOperationsSummary: async (params?: {
    from?: string;
    to?: string;
  }): Promise<MobileMoneyStatusTotal[]> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/operations/summary`,
      { params },
    );
    return normalizeArray<MobileMoneyStatusTotal>(response.data);
  },

  getMobileMoneyReconciliation: async (params?: {
    from?: string;
    to?: string;
  }): Promise<MobileMoneyReconciliation> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/operations/reconciliation`,
      { params },
    );
    return response.data;
  },

  getMobileMoneyOperation: async (
    depositId: string,
  ): Promise<MobileMoneyOperationDetail> => {
    const response = await apiClient.get(
      `${API}/payments/mobile-money/operations/${depositId}`,
    );
    return response.data;
  },

  /** SYNC : PAYMENT:PROCESS. MARK_SUCCEEDED / MARK_FAILED : réservés ADMIN et SUPER_ADMIN, motif ≥ 10 caractères. */
  resolveMobileMoneyOperation: async (
    depositId: string,
    data: {
      action: MobileMoneyResolveAction;
      reason?: string;
      providerTransactionId?: string;
    },
  ): Promise<MobileMoneyOperationDetail> => {
    const response = await apiClient.post(
      `${API}/payments/mobile-money/operations/${depositId}/resolve`,
      data,
    );
    return response.data;
  },

  // ---------- Recouvrement / documents payables ----------
  getRecovery: async (
    customerType: string,
    customerCode: string,
    params?: { currency?: string },
  ): Promise<RecoveryOverview> => {
    const response = await apiClient.get(
      `${API}/payments/recovery/${customerType}/${customerCode}`,
      { params },
    );
    return response.data;
  },

  /** Page de documents payables (20 par défaut) : à paginer côté écran. */
  getPayableDocuments: async (params?: {
    customerType?: string;
    customerCode?: string;
    documentType?: string;
    lineSourceType?: string;
    lineSourceCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResult<PayableDocument>> => {
    const response = await apiClient.get(`${API}/payments/payable-documents`, {
      params,
    });
    return normalizePaginated<PayableDocument>(response.data);
  },

  // ---------- Reçus ----------
  getReceipt: async (transactionNumber: string): Promise<PaymentReceipt> => {
    const response = await apiClient.get(
      `${API}/payments/transactions/${transactionNumber}/receipt`,
    );
    return response.data;
  },

  /** PDF d'administration : l'original puis son duplicata « DUPLICATA » dans un même fichier. */
  getReceiptPdf: async (transactionNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `${API}/payments/transactions/${transactionNumber}/receipt/pdf`,
      { responseType: "blob" },
    );
    return response.data;
  },

  getReceiptByNumber: async (
    receiptNumber: string,
  ): Promise<PaymentReceipt> => {
    const response = await apiClient.get(
      `${API}/payments/receipts/${receiptNumber}`,
    );
    return response.data;
  },

  /** Même contenu que getReceiptPdf : original puis duplicata. */
  getReceiptPdfByNumber: async (receiptNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `${API}/payments/receipts/${receiptNumber}/pdf`,
      { responseType: "blob" },
    );
    return response.data;
  },

  // ---------- Remboursements / extournes ----------
  refundTransaction: async (
    transactionNumber: string,
    data: RefundOrReversePayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.post(
      `${API}/payments/transactions/${transactionNumber}/refund`,
      stripActors(data),
      idem(),
    );
    return response.data;
  },

  reverseTransaction: async (
    transactionNumber: string,
    data: RefundOrReversePayload,
  ): Promise<PaymentTransaction> => {
    const response = await apiClient.post(
      `${API}/payments/transactions/${transactionNumber}/reverse`,
      stripActors(data),
      idem(),
    );
    return response.data;
  },

  getTransactionRefunds: async (
    transactionNumber: string,
  ): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get(
      `${API}/payments/transactions/${transactionNumber}/refunds`,
    );
    return normalizeArray<PaymentTransaction>(response.data);
  },

  // ---------- Déclarations de paiement en espèces ----------
  getCashDeclarations: async (params?: {
    status?: CashDeclarationStatus | string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashPaymentDeclaration>> => {
    const response = await apiClient.get(`${API}/payments/cash-declarations`, {
      params,
    });
    return normalizePaginated<CashPaymentDeclaration>(response.data);
  },

  getCashDeclaration: async (
    declarationNumber: string,
  ): Promise<CashPaymentDeclaration> => {
    const response = await apiClient.get(
      `${API}/payments/cash-declarations/${declarationNumber}`,
    );
    return response.data;
  },

  confirmCashDeclaration: async (
    declarationNumber: string,
    data: { cashSessionNumber: string; amount?: number; note?: string },
  ): Promise<CashPaymentDeclaration> => {
    const response = await apiClient.post(
      `${API}/payments/cash-declarations/${declarationNumber}/confirm`,
      data,
    );
    return response.data;
  },

  cancelCashDeclaration: async (
    declarationNumber: string,
    reason?: string,
  ): Promise<CashPaymentDeclaration> => {
    const response = await apiClient.post(
      `${API}/payments/cash-declarations/${declarationNumber}/cancel`,
      reason?.trim() ? { reason: reason.trim() } : undefined,
    );
    return response.data;
  },

  // ---------- Cash Registers ----------
  getCashRegisters: async (params?: {
    active?: boolean;
    locationCode?: string;
    businessEntityCode?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashRegister>> => {
    const response = await apiClient.get(`${API}/cash-registers`, { params });
    return normalizePaginated<CashRegister>(response.data);
  },

  createCashRegister: async (
    data: CreateCashRegisterPayload,
  ): Promise<CashRegister> => {
    const response = await apiClient.post(`${API}/cash-registers`, data);
    return response.data;
  },

  /** PATCH /cash-registers/{registerCode} (CASH_REGISTER:MANAGE). */
  updateCashRegister: async (
    registerCode: string,
    data: UpdateCashRegisterPayload,
  ): Promise<CashRegister> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/${registerCode}`,
      data,
    );
    return response.data;
  },

  activateCashRegister: async (registerCode: string): Promise<void> => {
    await apiClient.patch(`${API}/cash-registers/${registerCode}/activate`);
  },

  deactivateCashRegister: async (registerCode: string): Promise<void> => {
    await apiClient.patch(`${API}/cash-registers/${registerCode}/deactivate`);
  },

  // ---------- Cash Sessions ----------
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
    const response = await apiClient.get(`${API}/cash-registers/sessions`, {
      params,
    });
    return normalizePaginated<CashSession>(response.data);
  },

  /** GET /sessions/{n} n'existe pas : le détail d'une session passe par /summary. */
  getCashSession: async (sessionNumber: string): Promise<CashSession> => {
    const response = await apiClient.get(
      `${API}/cash-registers/sessions/${sessionNumber}/summary`,
    );
    return response.data;
  },

  getCashSessionSummary: async (
    sessionNumber: string,
  ): Promise<CashSession> => {
    const response = await apiClient.get(
      `${API}/cash-registers/sessions/${sessionNumber}/summary`,
    );
    return response.data;
  },

  openCashSession: async (data: {
    registerCode: string;
    openedBy?: string;
    openingAmount?: number;
  }): Promise<CashSession> => {
    const response = await apiClient.post(
      `${API}/cash-registers/sessions`,
      stripActors(data),
    );
    return response.data;
  },

  requestSessionClosing: async (
    sessionNumber: string,
    data: {
      closedBy?: string;
      countedClosingAmount: number | null;
      varianceReason?: string;
    },
  ): Promise<CashSession> => {
    const response = await apiClient.post(
      `${API}/cash-registers/sessions/${sessionNumber}/closing-request`,
      stripActors(data),
    );
    return response.data;
  },

  closeCashSession: async (
    sessionNumber: string,
    data: {
      closedBy?: string;
      countedClosingAmount: number;
      varianceReason?: string;
    },
  ): Promise<CashSession> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/sessions/${sessionNumber}/close`,
      stripActors(data),
    );
    return response.data;
  },

  approveVariance: async (
    sessionNumber: string,
    data: { reviewedBy?: string; note?: string },
  ): Promise<CashSession> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/sessions/${sessionNumber}/approve-variance`,
      stripActors(data),
    );
    return response.data;
  },

  getClosingReportPdf: async (sessionNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `${API}/cash-registers/sessions/${sessionNumber}/closing-report`,
      { responseType: "blob" },
    );
    return response.data;
  },

  // ---------- Cash Movements ----------
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
    const response = await apiClient.get(`${API}/cash-registers/movements`, {
      params,
    });
    return normalizePaginated<CashMovement>(response.data);
  },

  createCashMovement: async (
    data: CreateCashMovementPayload,
  ): Promise<CashMovement> => {
    const { sessionNumber, ...payload } = data;
    const response = await apiClient.post(
      `${API}/cash-registers/sessions/${sessionNumber}/movements`,
      stripActors(payload),
    );
    return response.data;
  },

  /** Bons d'entrée ou de sortie d'une session (même filtres que les mouvements, sans type). */
  getSessionVouchers: async (
    kind: "ENTRY" | "EXIT",
    sessionNumber: string,
    params?: {
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
    },
  ): Promise<PaginatedResult<CashMovement>> => {
    const response = await apiClient.get(
      `${API}/cash-registers/sessions/${sessionNumber}/${kind === "ENTRY" ? "entry" : "exit"}-vouchers`,
      { params },
    );
    return normalizePaginated<CashMovement>(response.data);
  },

  createEntryVoucher: async (
    sessionNumber: string,
    data: CreateVoucherPayload,
  ): Promise<CashMovement> => {
    const response = await apiClient.post(
      `${API}/cash-registers/sessions/${sessionNumber}/entry-vouchers`,
      stripActors(data),
    );
    return response.data;
  },

  createExitVoucher: async (
    sessionNumber: string,
    data: CreateVoucherPayload,
  ): Promise<CashMovement> => {
    const response = await apiClient.post(
      `${API}/cash-registers/sessions/${sessionNumber}/exit-vouchers`,
      stripActors(data),
    );
    return response.data;
  },

  addCashMovementAttachment: async (
    movementNumber: string,
    data: CashMovementAttachment,
  ): Promise<CashMovement> => {
    const response = await apiClient.post(
      `${API}/cash-registers/movements/${movementNumber}/attachments`,
      data,
    );
    return response.data;
  },

  signCashMovement: async (
    movementNumber: string,
    signedBy: string,
  ): Promise<CashMovement> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/movements/${movementNumber}/sign`,
      undefined,
      { params: { signedBy } },
    );
    return response.data;
  },

  printCashMovement: async (movementNumber: string): Promise<CashMovement> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/movements/${movementNumber}/print`,
    );
    return response.data;
  },

  getCashMovementDocumentPdf: async (movementNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `${API}/cash-registers/movements/${movementNumber}/document`,
      { responseType: "blob" },
    );
    return response.data;
  },

  // ---------- Cash Requests ----------
  createCashRequest: async (
    sessionNumber: string,
    data: CreateCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.post(
      `${API}/cash-registers/sessions/${sessionNumber}/requests`,
      stripActors(data),
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
    const response = await apiClient.get(`${API}/cash-registers/requests`, {
      params,
    });
    return normalizePaginated<CashRequest>(response.data);
  },

  getCashRequest: async (requestNumber: string): Promise<CashRequest> => {
    const response = await apiClient.get(
      `${API}/cash-registers/requests/${requestNumber}`,
    );
    return response.data;
  },

  approveCashRequest: async (
    requestNumber: string,
    data: ReviewCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/requests/${requestNumber}/approve`,
      stripActors(data),
    );
    return response.data;
  },

  rejectCashRequest: async (
    requestNumber: string,
    data: ReviewCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/requests/${requestNumber}/reject`,
      stripActors(data),
    );
    return response.data;
  },

  /** Annulation par le demandeur ou un caissier (CASH_MOVEMENT:CREATE). Le corps est facultatif. */
  cancelCashRequest: async (
    requestNumber: string,
    data?: ReviewCashRequestPayload,
  ): Promise<CashRequest> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/requests/${requestNumber}/cancel`,
      data ? stripActors(data) : undefined,
    );
    return response.data;
  },

  getCashRequestDocumentPdf: async (requestNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `${API}/cash-registers/requests/${requestNumber}/document`,
      { responseType: "blob" },
    );
    return response.data;
  },

  // ---------- Cash metrics / statistics ----------
  /** fromDate et toDate sont des instants ISO 8601 (pas de simples dates). */
  getCashMetricsOverview: async (params?: {
    registerCode?: string;
    businessEntityCode?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CashMetricsOverview> => {
    const response = await apiClient.get(
      `${API}/cash-registers/metrics/overview`,
      { params },
    );
    return response.data;
  },

  getCashMetricsRegisters: async (params?: {
    businessEntityCode?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<CashRegisterMetrics[]> => {
    const response = await apiClient.get(
      `${API}/cash-registers/metrics/registers`,
      { params },
    );
    return normalizeArray<CashRegisterMetrics>(response.data);
  },

  getCashSessionStatistics: async (
    sessionNumber: string,
  ): Promise<CashSessionStatistics> => {
    const response = await apiClient.get(
      `${API}/cash-registers/statistics/sessions/${sessionNumber}`,
    );
    return response.data;
  },

  getCashierStatistics: async (
    cashierCode: string,
  ): Promise<CashierStatistics> => {
    const response = await apiClient.get(
      `${API}/cash-registers/statistics/cashiers/${cashierCode}`,
    );
    return response.data;
  },

  getCashRegisterStatistics: async (
    registerCode: string,
    params?: { fromDate?: string; toDate?: string },
  ): Promise<CashRegisterStatistics> => {
    const response = await apiClient.get(
      `${API}/cash-registers/statistics/registers/${registerCode}`,
      { params },
    );
    return response.data;
  },

  // ---------- Cash anomalies ----------
  analyzeCashSession: async (
    sessionNumber: string,
  ): Promise<CashAnomalyFlag[]> => {
    const response = await apiClient.post(
      `${API}/cash-registers/anomalies/sessions/${sessionNumber}/analyze`,
    );
    return normalizeArray<CashAnomalyFlag>(response.data);
  },

  getCashAnomalies: async (params?: {
    registerCode?: string;
    sessionNumber?: string;
    severity?: CashAnomalySeverity | string;
    status?: CashAnomalyStatus | string;
    anomalyType?: CashAnomalyType | string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResult<CashAnomalyFlag>> => {
    const response = await apiClient.get(`${API}/cash-registers/anomalies`, {
      params,
    });
    return normalizePaginated<CashAnomalyFlag>(response.data);
  },

  /** `status` est obligatoire ; l'examinateur vient du jeton. */
  reviewCashAnomaly: async (
    flagNumber: string,
    data: { status: CashAnomalyStatus | string; note?: string },
  ): Promise<CashAnomalyFlag> => {
    const response = await apiClient.patch(
      `${API}/cash-registers/anomalies/${flagNumber}/review`,
      stripActors(data),
    );
    return response.data;
  },

  // Politique d'annulation des réservations (module réservation).
  getBookingCancellationPolicy: async (): Promise<CancellationPolicyRule[]> => {
    const response = await apiClient.get(`${API}/bookings/cancellation-policy`);
    return normalizeArray<CancellationPolicyRule>(response.data);
  },
};
