import { apiClient } from "./api";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type BillingDocumentType =
  | "QUOTE"
  | "PROFORMA_INVOICE"
  | "INVOICE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  // SEFC — facture rectificative (corrige une facture VALIDATED sans la modifier)
  | "CORRECTIVE_INVOICE";

export type BillingDocumentStatus =
  | "DRAFT"
  | "ISSUED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "VOIDED"
  | "REFUNDED"
  | "WRITTEN_OFF"
  // Statuts du cycle devis
  | "VIEWED"
  | "NEGOTIATION"
  | "DEPOSIT_REQUESTED"
  | "DEPOSIT_PAID"
  // SEFC — document scellé fiscalement (locked = true)
  | "VALIDATED";

export type BillingLineType =
  | "SERVICE"
  | "PRODUCT"
  | "BOOKING"
  | "SUBSCRIPTION"
  | "PASS"
  | "ADDON"
  | "OVERAGE"
  | "DISCOUNT"
  | "FEE"
  | "OTHER";

// ─── Sous-interfaces ─────────────────────────────────────────────────────────

export type CompanyLinkSource = "AT_ISSUE" | "ATTACHED";

/** Relie d'anciennes factures : par numéros, ou par membre et période. */
export interface CompanyLinkRequest {
  companyCustomerCode: string;
  documentNumbers?: string[];
  memberId?: string;
  from?: string;
  to?: string;
}

export interface CompanyLinkPreviewLine {
  documentNumber: string;
  eligible: boolean;
  /** Pourquoi la facture ne serait pas reliée. */
  reason?: string | null;
  [key: string]: unknown;
}

export interface CompanyLinkResult {
  linked?: number;
  skipped?: number;
  lines?: CompanyLinkPreviewLine[];
  [key: string]: unknown;
}

/** Acompte attaché à un document */
export interface BillingAdvance {
  advanceType: "PERCENTAGE" | "FIXED_AMOUNT";
  advanceValue: number;
  /** null = toutes les lignes */
  includedLineOrders?: number[] | null;
  excludedLineOrders?: number[];
  paymentReference?: string;
  referenceLabel?: string;
  dueDate?: string;
  notes?: string;
  // Champs retournés en lecture
  computedAmount?: number;
  /** PARTIALLY_PAID : le payé ne couvre pas encore l'acompte. */
  status?: "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  paidAt?: string | null;
}

/** Escompte pour paiement anticipé */
export interface BillingEarlyPaymentDiscount {
  discountRate: number;
  ifPaidBefore: string;
  label?: string;
  // Champ retourné en lecture
  computedAmount?: number;
}

/** Signature électronique */
export interface BillingSignature {
  signerName?: string;
  signerEmail?: string;
  status: "PENDING" | "SIGNED" | "EXPIRED";
  signedAt?: string | null;
  expiresAt?: string;
}

export interface ConfirmPublicQuoteSignaturePayload {
  signerName: string;
  signerEmail?: string;
  signatureImageBase64: string;
}

// ─── Ligne de document ────────────────────────────────────────────────────────

export interface BillingLine {
  // Ordre de ligne (requis pour advance.excludedLineOrders)
  lineOrder?: number;
  lineType: BillingLineType;
  itemCode?: string;
  description: string;
  detailedDescription?: string;
  quantity: number;
  // Unité de mesure (jour, heure, m², forfait)
  unit?: string;
  unitPrice: number;
  discountRate?: number;
  externalReference?: string;
  notes?: string;
  // Ligne optionnelle : calculée mais exclue du total
  optional?: boolean;
  taxable: boolean;
  // SEFC — TTC (prix saisi taxe incluse) vs HT (par défaut)
  taxIncluded?: boolean;
  vatRate?: number;
  additionalCentRate?: number;
  sourceType?: string;
  sourceCode?: string;
  catalogSourceType?: string;
  catalogSourceCode?: string;
  // Champs calculés retournés en lecture
  discountAmount?: number;
  subtotalAmount?: number;
  taxableAmount?: number;
  vatAmount?: number;
  additionalCentAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
}

export interface BillingDiscount {
  discountCode?: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
}

export interface BillingClause {
  clauseCode?: string;
  title: string;
  body: string;
  displayOrder: number;
}

export interface BillingTax {
  taxType: string;
  taxRate: number;
  baseAmount: number;
  amount: number;
}

// ─── Document principal ───────────────────────────────────────────────────────

export interface BillingDocument {
  documentNumber: string;
  documentType: BillingDocumentType;
  status: BillingDocumentStatus;
  title: string;
  description?: string;

  // Client enregistré
  customerType?: string;
  customerCode?: string;
  // Snapshot client externe
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddressJson?: string;

  customerReference?: string;
  poNumber?: string;
  projectCode?: string;
  salespersonCode?: string;
  deliveryAddressJson?: string;
  language?: string;
  exchangeRate?: number | null;
  terms?: string;

  // Référence et coordonnées de paiement
  paymentReference?: string;
  paymentInstructions?: string;
  bankDetailsJson?: string;

  currency: string;

  // Montants calculés par le backend
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  vatAmount: number;
  additionalCentAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  // Total des lignes optionnelles
  optionsTotal?: number;

  // Dates
  issueDate: string;
  dueDate?: string;
  issuedAt?: string;
  sentAt?: string;
  paidAt?: string;

  lines: BillingLine[];
  discounts: BillingDiscount[];
  taxes: BillingTax[];
  clauses: BillingClause[];

  sourceType?: string;
  sourceCode?: string;
  // Source résolue
  resolvedSourceType?: string;
  resolvedSourceCode?: string;
  resolvedSourceLabel?: string;
  resolvedSourceRegistered?: boolean;

  metadataJson?: string;

  // Acompte
  advance?: BillingAdvance | null;
  // Escompte
  earlyPaymentDiscount?: BillingEarlyPaymentDiscount | null;
  // Signature
  signature?: BillingSignature | null;

  customerRegistered?: boolean;
  internalNotes?: string;
  recoverables?: BillingRecoverable[] | null;

  // ── Facture émise pour le compte d'une organisation ────────────────────────
  /** Code client de l'organisation (CUS-COM-...), vide si le membre est seul. */
  companyCustomerCode?: string | null;
  companyName?: string | null;
  /** AT_ISSUE : émise ainsi (imprimée) ; ATTACHED : ancienne facture reliée. */
  companyLinkSource?: CompanyLinkSource | null;

  // ── SEFC (validation fiscale) ──────────────────────────────────────────────
  /** true = document validé fiscalement, immuable (PUT refusé en 400) */
  locked?: boolean;
  /** Numéro fiscal définitif, assigné uniquement à la validation SEFC */
  fiscalNumber?: string | null;
  /** Date fiscale officielle (YYYY-MM-DD), figée à la validation */
  fiscalDate?: string | null;
  /** Horodatage ISO 8601 de la validation SEFC */
  validatedAt?: string | null;
  sellerName?: string | null;
  sellerNiu?: string | null;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  customerNiu?: string | null;
  /** Type String côté backend — valeurs usuelles ENTREPRISE/PARTICULIER mais non enum-contraint */
  customerCategory?: string | null;

  // ── SEFC Phase 2 — chaînage et signature ────────────────────────────────────
  previousHash?: string | null;
  currentHash?: string | null;
  fiscalSignature?: string | null;
  /** Horodatage de signature — distinct de signature.signedAt (signature électronique devis) */
  signedAt?: string | null;

  // ── Immutabilité / documents de correction ─────────────────────────────────
  /** Numéro du document corrigé, présent sur un avoir ou une rectificative */
  originalDocumentNumber?: string | null;
  /** Type du document corrigé — String côté backend, pas l'enum BillingDocumentType */
  originalDocumentType?: string | null;
  /** Motif de l'avoir / de la rectificative */
  creditNoteReason?: string | null;
}

export interface BillingRecoverable {
  recoverableNumber: string;
  documentNumber?: string;
  itemDescription: string;
  quantity?: number;
  unit?: string;
  /** INVENTORY_ITEM | ASSET | MANUAL */
  sourceType?: string;
  sourceCode?: string;
  notes?: string;
  status: "PENDING" | "RECOVERED" | "PARTIALLY_RECOVERED" | "WRITTEN_OFF";
  recoveredAt?: string | null;
  recoveredBy?: string | null;
  createdAt?: string;
}

export interface BillingCatalogLookupItem {
  sourceType: string;
  sourceCode: string;
  name: string;
  description?: string;
  category?: string | null;
  unit?: string;
  unitPrice: number;
  currency: string;
  taxRuleCode?: string | null;
  resourceMeta?: Record<string, unknown>;
}

export type BillingDiscountPolicy = "NONE" | "WARN" | "BLOCK";
export type BillingItemMode = "UNIT" | "HOURLY" | "DAILY" | "MONTHLY" | "FIXED";
/** D'où provient le plancher réellement appliqué (effectiveFloorPrice) */
export type BillingFloorPriceOrigin =
  | "EXPLICIT"
  | "DERIVED_FROM_MARGIN"
  | "COST_PRICE"
  | "NONE";

/** Champs du catalogue pouvant être vidés via clearFields (updateCatalogItem). */
export type ClearableCatalogField =
  | "costPrice"
  | "floorPrice"
  | "minMarginRate"
  | "maxDiscountRate"
  | "detailedDescription"
  | "includedItems"
  | "imageUrl"
  | "billingMode"
  | "defaultQuantity"
  | "minQuantity"
  | "maxQuantity"
  | "taxableByDefault"
  | "subcategory"
  | "tags"
  | "externalReference"
  | "validFrom"
  | "validUntil";

export interface ServiceCatalogItem {
  itemCode: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  unitPrice: number;
  currency: string;
  taxRuleCode?: string;
  displayOrder?: number;
  active?: boolean;
  createdAt?: string;

  // ── Économie ──────────────────────────────────────────────────────────────
  costPrice?: number;
  /** Plancher saisi explicitement (peut être vide, voir effectiveFloorPrice). */
  floorPrice?: number;
  minMarginRate?: number;
  maxDiscountRate?: number;
  discountPolicy?: BillingDiscountPolicy;

  // ── Contenu ───────────────────────────────────────────────────────────────
  detailedDescription?: string;
  includedItems?: string[];
  imageUrl?: string;

  // ── Saisie ────────────────────────────────────────────────────────────────
  billingMode?: BillingItemMode;
  defaultQuantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  taxableByDefault?: boolean;

  // ── Classement ────────────────────────────────────────────────────────────
  subcategory?: string;
  tags?: string[];
  externalReference?: string;
  validFrom?: string;
  validUntil?: string;

  // ── Lecture seule — calculés par le backend ─────────────────────────────────
  /** Plancher réellement appliqué : à afficher à la place de floorPrice. */
  effectiveFloorPrice?: number;
  /** Origine de effectiveFloorPrice. */
  floorPriceOrigin?: BillingFloorPriceOrigin;
  /** L'article est valide aujourd'hui. */
  currentlyValid?: boolean;
}

export interface BillingScheduleInstallment {
  installmentNumber: string;
  dueDate: string;
  amount: number;
  status: string;
}

export interface BillingSchedule {
  scheduleNumber: string;
  documentNumber?: string;
  installments: BillingScheduleInstallment[];
}

export interface BillingAgingReport {
  generatedAt: string;
  currency: string;
  summary: {
    current: { count: number; totalDue: number };
    days1To30: { count: number; totalDue: number };
    days31To60: { count: number; totalDue: number };
    days61To90: { count: number; totalDue: number };
    daysOver90: { count: number; totalDue: number };
    grandTotal: { count: number; totalDue: number };
  };
  documents: Array<{
    documentNumber: string;
    customerType: string;
    customerCode: string;
    customerName: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    balanceDue: number;
    daysOverdue: number;
    agingBucket: string;
    status: string;
  }>;
}

// ─── Simulation (aperçu sans écriture) ─────────────────────────────────────────

export type BillingViolationType =
  | "FLOOR_PRICE"
  | "MAX_DISCOUNT_RATE"
  | "LINE_MIN_NET_RATE"
  | "LINE_MIN_NET_AMOUNT"
  | "DOCUMENT_DISCOUNT_RATE"
  | "DOCUMENT_DISCOUNT_AMOUNT";

export type BillingViolationSeverity = "WARN" | "BLOCK";

export interface BillingDiscountViolation {
  type: BillingViolationType;
  severity: BillingViolationSeverity;
  itemCode?: string;
  lineDescription?: string;
  observed: string;
  limit: string;
  /** Rédigé par le backend pour être affiché tel quel. */
  message: string;
}

export interface SimulatedBillingLine {
  itemCode?: string;
  description: string;
  category?: string;
  unit?: string;
  quantity: string;
  unitPrice: string;
  subtotalAmount: string;
  discountRate: string | null;
  discountAmount: string;
  /** Taux de remise réel, recalculé depuis les montants. */
  effectiveRate: string;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
  taxable: boolean;
  optional: boolean;
}

export interface SimulateBillingDocumentResponse {
  subtotalAmount: string;
  lineDiscountAmount: string;
  documentDiscountAmount: string;
  discountAmount: string;
  taxableAmount: string;
  vatAmount: string;
  additionalCentAmount: string;
  taxAmount: string;
  totalAmount: string;
  /** true si une violation BLOCK existe : issue() refusera. */
  blocked: boolean;
  violations: BillingDiscountViolation[];
  lines: SimulatedBillingLine[];
}

// ─── Versionnage des documents ──────────────────────────────────────────────────

export type BillingDocumentEditType = "FULL_EDIT" | string;

export interface BillingDocumentVersion {
  versionNumber: number;
  editType: BillingDocumentEditType;
  changedBy: string;
  changedAt: string;
  /** Null tant que la version n'a pas été transmise au client. */
  sentToCustomerAt: string | null;
  /** Champs modifiés depuis la version précédente. */
  changeSummary: string;
  /** Présent uniquement sur le détail d'une version. */
  snapshot?: BillingDocument | null;
}

export interface BillingDocumentVersionFieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

export interface BillingDocumentVersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: BillingDocumentVersionFieldChange[];
}

export interface UpdateBillingLinePayload {
  action: "UPSERT" | "REMOVE";
  lineOrder: number;
  lineType?: BillingLineType;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  discountRate?: number;
  taxable?: boolean;
  optional?: boolean;
  externalReference?: string;
  notes?: string;
  // Le backend résout description, unité, prix et taxe depuis la source catalogue.
  catalogSourceType?: string;
  catalogSourceCode?: string;
}

export interface UpdateBillingDocumentPayload {
  title?: string;
  description?: string;
  terms?: string;
  issueDate?: string;
  dueDate?: string;
  customerReference?: string;
  poNumber?: string;
  projectCode?: string;
  salespersonCode?: string;
  paymentInstructions?: string;
  bankDetailsJson?: string;
  language?: string;
  internalNotes?: string;
  lines?: UpdateBillingLinePayload[];
  discounts?: BillingDiscount[];
  clauses?: BillingClause[];
}

export interface CreateInvoiceFromReservationPayload {
  mode: "BOOKING" | "EXTERNAL";
  bookingNumber?: string;
  documentType?: "INVOICE" | "PROFORMA_INVOICE";
  issueDate?: string;
  dueDate?: string;
  terms?: string;
  paymentInstructions?: string;
  internalNotes?: string;
  customerType?: string;
  customerCode?: string;
  externalBooking?: {
    resourceName: string;
    resourceDescription?: string;
    checkInAt: string;
    checkOutAt: string;
    bookingUnit: "HOUR" | "HALF_DAY" | "DAY" | "WEEK" | "MONTH";
    quantity: number;
    unitPrice: number;
    externalReference?: string;
    notes?: string;
  };
  extraLines?: Array<{
    lineOrder?: number;
    lineType: BillingLineType;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    taxable: boolean;
  }>;
}

// ─── Payload de création ──────────────────────────────────────────────────────

export interface CreateBillingDocumentPayload {
  documentType?: BillingDocumentType;
  /**
   * Organisation qui paie : absent = selon le mode du rattachement,
   * "NONE" = le membre seul, un code client = cette organisation.
   */
  companyCustomerCode?: string;
  // Client enregistré
  customerType?: string;
  customerCode?: string;
  // Snapshot client externe
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddressJson?: string;
  // Métadonnées
  title?: string;
  description?: string;
  terms?: string;
  currency: string;
  issueDate: string;
  dueDate?: string;
  customerReference?: string;
  poNumber?: string;
  projectCode?: string;
  salespersonCode?: string;
  deliveryAddressJson?: string;
  language?: string;
  exchangeRate?: number | null;
  // Paiement
  paymentReference?: string;
  paymentInstructions?: string;
  bankDetailsJson?: string;
  // Contenu
  lines: Omit<
    BillingLine,
    | "discountAmount"
    | "subtotalAmount"
    | "taxableAmount"
    | "vatAmount"
    | "additionalCentAmount"
    | "taxAmount"
    | "totalAmount"
  >[];
  discounts?: BillingDiscount[];
  clauses?: BillingClause[];
  // Acompte
  advance?: Omit<BillingAdvance, "computedAmount" | "status" | "paidAt">;
  // Escompte
  earlyPaymentDiscount?: Omit<BillingEarlyPaymentDiscount, "computedAmount">;
  metadataJson?: string;
}

// ─── Helper normalisation réponses paginées ───────────────────────────────────

function normalizePaginated<T>(
  data: any,
  fallbackSize = 20,
): {
  content: T[];
  totalElements: number;
  totalPages: number;
} {
  // Enveloppe Spring : { content, totalElements, size } ; totalPages peut manquer
  if (data?.content !== undefined) {
    const totalElements = data.totalElements ?? data.content.length;
    const size = data.size || fallbackSize;
    return {
      ...data,
      totalElements,
      totalPages: data.totalPages ?? Math.max(1, Math.ceil(totalElements / size)),
    };
  }
  // Enveloppe documentée : { data: [...], pageable: { totalElements, totalPages, size } }
  if (Array.isArray(data?.data)) {
    const pageable = data.pageable ?? {};
    const totalElements = pageable.totalElements ?? data.totalElements ?? data.data.length;
    const size = pageable.size || fallbackSize;
    return {
      content: data.data,
      totalElements,
      totalPages: pageable.totalPages ?? data.totalPages ?? Math.max(1, Math.ceil(totalElements / size)),
    };
  }
  if (Array.isArray(data))
    return { content: data, totalElements: data.length, totalPages: 1 };
  return { content: [], totalElements: 0, totalPages: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Lot 52 : types exacts des fiches contrôleur (routes billing)
// ═══════════════════════════════════════════════════════════════════════════════

const API = "/sni/api/v1";
const B = `${API}/billing`;
const enc = encodeURIComponent;
const getBlob = async (url: string, params?: Record<string, unknown>): Promise<Blob> =>
  (await apiClient.get(url, { params, responseType: "blob" })).data as Blob;
const toList = <T,>(d: unknown): T[] =>
  Array.isArray(d) ? (d as T[]) : Array.isArray((d as { content?: T[] })?.content) ? (d as { content: T[] }).content : Array.isArray((d as { data?: T[] })?.data) ? (d as { data: T[] }).data : [];
const clean = (p?: Record<string, unknown>) =>
  p ? Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== "")) : undefined;

export type BillingPaymentMethod =
  | "CASH" | "WALLET" | "MOBILE_MONEY" | "MOBILE_MONEY_OFFLINE" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "MANUAL_ADJUSTMENT" | "CREDIT_NOTE";

export interface PayInvoicePayload {
  paymentMethod: BillingPaymentMethod;
  amount?: number;
  walletNumber?: string;
  cashSessionNumber?: string;
  providerReference?: string;
  processedBy?: string;
  idempotencyKey?: string;
  metadataJson?: string;
  tenderedAmount?: number;
  bankName?: string;
  payerName?: string;
  payerPhone?: string;
  mobileMoneyOperator?: "MTN_MOMO" | "AIRTEL_MONEY";
}

export interface PaymentTransaction {
  transactionNumber?: string;
  intentNumber?: string;
  paymentMethod?: BillingPaymentMethod;
  provider?: string;
  providerReference?: string;
  receiptNumber?: string;
  amount?: number;
  currency?: string;
  status?: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED" | "REVERSED";
  paidAt?: string;
  receivedBy?: string;
  failureReason?: string;
  metadataJson?: string;
  channel?: "SELF_SERVICE" | "BACK_OFFICE" | "SYSTEM";
  paymentMethodLabel?: string;
  tenderedAmount?: number;
  changeAmount?: number;
  cashSessionNumber?: string;
  bankName?: string;
  payerName?: string;
  payerPhone?: string;
}

// ── Acomptes ────────────────────────────────────────────────────────────────────

export type DepositStatus = "PLANNED" | "INVOICED" | "PARTIALLY_PAID" | "PAID" | "DEDUCTED" | "CANCELLED" | "REFUNDED" | "CREDITED";

export interface BillingDeposit {
  id: number;
  documentNumber?: string;
  finalDocumentNumber?: string;
  rank?: number;
  label?: string;
  mode?: "AMOUNT" | "PERCENTAGE" | string;
  value?: number;
  baseLineOrders?: string;
  amount?: number;
  dueDate?: string;
  status?: DepositStatus | string;
  depositInvoiceNumber?: string;
  paidAmount?: number;
  deductedAmount?: number;
  deductedOn?: string;
  deductedAt?: string;
  settlementDocument?: string;
  cancelReason?: string;
  createdAt?: string;
}

export interface DepositPlanItem {
  label?: string;
  mode: "AMOUNT" | "PERCENTAGE";
  value: number;
  lineOrders?: number[];
  dueDate?: string;
  /** Vrai par défaut : la facture d'acompte est créée et émise aussitôt. */
  invoiceNow?: boolean;
}
export interface DepositPlanPayload { deposits: DepositPlanItem[] }
export interface DepositSettlementPayload { mode: "REFUND" | "CREDIT"; reason: string }

// ── Destinataires, envois, relevé ────────────────────────────────────────────────

export interface BillingRecipients {
  customerType?: string;
  customerCode?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  whatsappNumbers?: string[];
  channels?: string[];
  suggestedEmails?: string[];
  suggestedPhones?: string[];
}
export interface BillingRecipientsPayload {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  whatsappNumbers?: string[];
  channels?: string[];
}
export interface SendDocumentPayload extends BillingRecipientsPayload {
  message?: string;
}
export interface BillingSending {
  id: number;
  documentNumber?: string;
  channel?: "EMAIL" | "WHATSAPP" | string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  message?: string;
  duplicate?: boolean;
  status?: string;
  providerReference?: string;
  error?: string;
  sentBy?: string;
  sentByName?: string;
  sentAt?: string;
  deliveredAt?: string;
  seenAt?: string;
}
export interface SendStatementPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  until?: string;
  message?: string;
}
export interface UpdateRecipientPayload {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNiu?: string;
  customerCategory?: string;
  customerReference?: string;
  billingAddressJson?: string;
  deliveryAddressJson?: string;
  reason?: string;
}

// ── Saisie, simulation, stock ────────────────────────────────────────────────────

export type BillingLineInput = CreateBillingDocumentPayload["lines"][number];

export interface BillingAlert {
  lineIndex?: number | null;
  code: string;
  severity: "INFO" | "WARN" | "BLOCK" | string;
  message: string;
}
export interface SimulatedLineExact {
  itemCode?: string;
  description?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  subtotalAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  effectiveRate?: number;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxable?: boolean;
  optional?: boolean;
}
export interface SimulationRequest {
  documentType?: BillingDocumentType;
  currency?: string;
  title?: string;
  lines: BillingLineInput[];
  discounts?: Array<{ discountCode?: string; description: string; discountType: "PERCENTAGE" | "FIXED_AMOUNT"; value: number }>;
  customerType?: string;
  customerCode?: string;
  companyCustomerCode?: string;
}
export interface SimulationResult {
  documentType?: BillingDocumentType;
  currency?: string;
  title?: string;
  lines?: SimulatedLineExact[];
  subtotalAmount?: number;
  lineDiscountAmount?: number;
  documentDiscountAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  vatAmount?: number;
  additionalCentAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  violations?: Array<{ type?: string; severity?: string; itemCode?: string; lineDescription?: string; observed?: number; limit?: number; message?: string }>;
  blocked?: boolean;
  alerts?: BillingAlert[];
}
export interface SimulateLineRequest extends Omit<SimulationRequest, "lines" | "title"> {
  lineIndex?: number;
  line: BillingLineInput;
  lines?: BillingLineInput[];
}
export interface SimulateLineResult {
  lineIndex?: number;
  line?: SimulatedLineExact;
  alerts?: BillingAlert[];
  document?: SimulationResult;
}
export interface AllocateAmountRequest {
  lines: BillingLineInput[];
  targetAmount: number;
  /** Vrai par défaut (total TTC). */
  taxIncluded?: boolean;
  lineIndexes?: number[];
  documentType?: BillingDocumentType;
  currency?: string;
  customerType?: string;
  customerCode?: string;
  companyCustomerCode?: string;
}
export interface AllocateAmountResult {
  targetAmount?: number;
  taxIncluded?: boolean;
  referenceAmount?: number;
  implicitDiscount?: number;
  lines: BillingLineInput[];
  simulation?: SimulationResult;
}
export interface CheckAvailabilityRequest {
  documentType?: BillingDocumentType;
  lines?: BillingLineInput[];
  resources?: Array<{ lineIndex?: number; resourceCode: string; startAt: string; endAt: string; quantity?: number }>;
}
export interface CheckAvailabilityResult {
  blocked?: boolean;
  alerts?: BillingAlert[];
  stock?: Array<{ lineIndex?: number; itemCode?: string; itemName?: string; active?: boolean; requested?: number; available?: number; missing?: number; negativeStockAllowed?: boolean }>;
  resources?: Array<{ lineIndex?: number; resourceCode?: string; resourceName?: string; available?: boolean; remainingCapacity?: number; message?: string }>;
}

// ── Devis : révision, négociation ────────────────────────────────────────────────

export interface ReviseQuotePayload {
  reason: string;
  origin?: "CLIENT_PROPOSAL" | "COUNTER_PROPOSAL" | "INTERNAL";
  discountOverrideReason?: string;
  changes: UpdateBillingDocumentPayload;
}
export interface NegotiationLineChange {
  change?: "ADDED" | "REMOVED" | "CHANGED" | string;
  description?: string;
  quantityBefore?: string; quantityAfter?: string;
  unitPriceBefore?: string; unitPriceAfter?: string;
  discountBefore?: string; discountAfter?: string;
  totalBefore?: string; totalAfter?: string;
}
export interface NegotiationRound {
  version?: number;
  current?: boolean;
  authorName?: string;
  reason?: string;
  origin?: string;
  status?: string;
  changedAt?: string;
  sentToCustomerAt?: string;
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  totalDelta?: number | null;
  lineChanges?: NegotiationLineChange[];
}
export interface QuoteNegotiation { quoteNumber?: string; status?: string; currentRevision?: number; rounds?: NegotiationRound[] }

// ── Modification de facture, changement de client ────────────────────────────────

export type InvoiceChangeStatus = "PENDING" | "APPLIED" | "REJECTED" | "RETURNED" | "CANCELLED";
export interface InvoiceChange {
  id: number;
  invoiceNumber?: string;
  status?: InvoiceChangeStatus | string;
  reason?: string;
  requestedBy?: string;
  requestedByName?: string;
  requestedAt?: string;
  totalBefore?: number;
  totalAfter?: number;
  approvalNumber?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionComment?: string;
  result?: "NEW_VERSION" | "CORRECTIVE_INVOICE" | string;
  resultDocumentNumber?: string;
  versionNumber?: number;
}
export interface RequestInvoiceChangePayload { reason: string; discountOverrideReason?: string; changes: UpdateBillingDocumentPayload }
export interface ChangeCustomerPayload { customerType: string; customerCode: string; reason: string; payments?: "KEEP_AS_CREDIT" | "TRANSFER" }
export interface ChangeCustomerResult {
  mode?: "IN_PLACE" | "REISSUE" | string;
  originalInvoice?: string;
  newInvoice?: string;
  unpaidCreditNote?: string;
  paidCreditNote?: string;
  paymentsMode?: string;
  transferredAmount?: number;
}

// ── Tableau de bord commercial ───────────────────────────────────────────────────

export interface BillingDashboard {
  from?: string;
  to?: string;
  currency?: string;
  quotes?: { issued?: number; converted?: number; conversionRate?: number; issuedAmount?: number; convertedAmount?: number; averageDaysToInvoice?: number };
  invoicing?: { invoices?: number; invoiced?: number; collected?: number; outstanding?: number; overdue?: number; averageDaysToPay?: number };
  forecast?: Array<{ weekStart?: string; expected?: number; documents?: number }>;
  deals?: Array<{ stage?: string; deals?: number; expectedAmount?: number; weightedAmount?: number }>;
  topCustomers?: Array<{ customerType?: string; customerCode?: string; customerName?: string; invoiced?: number; outstanding?: number }>;
}

// ── Facturation groupée ──────────────────────────────────────────────────────────

export interface BatchRunSummary { runNumber: string; periodFrom?: string; periodTo?: string; title?: string; status?: "PREVIEW" | "ISSUED" | "CANCELLED" | string; customers?: number; invoices?: number; createdAt?: string }
export interface BatchRunItem {
  itemId: number; customerType?: string; customerCode?: string; customerName?: string; billingCompany?: string;
  itemCount?: number; totalAmount?: number; currency?: string; excluded?: boolean; invoiceNumber?: string; error?: string;
}
export interface BatchRun {
  runNumber: string; periodFrom?: string; periodTo?: string; title?: string; status?: string; createdBy?: string;
  issuedBy?: string; issuedAt?: string; totalToInvoice?: number; customers?: BatchRunItem[];
}
export interface BatchPreviewPayload { periodFrom: string; periodTo: string; sourceTypes?: string[]; title?: string }

// ── Éléments (abonnement, pass, réservation, domiciliation) et affectations ──────

export type BillingElementType = "SUBSCRIPTION" | "PASS" | "BOOKING" | "DOMICILIATION";
export type ActivationMode = "FULL_SETTLEMENT" | "FIRST_PAYMENT";
export interface BillingElement {
  type: BillingElementType | string; code: string; label?: string; status?: string;
  holderType?: string; holderCode?: string; startDate?: string; endDate?: string; totalAmount?: number;
}
export interface BillingParty {
  type: string; code: string; name?: string; email?: string; phone?: string; external?: boolean; elements?: BillingElement[];
}
export interface BillingElementInvoice {
  documentNumber: string; documentType?: string; status?: string; customerType?: string; customerCode?: string; currency?: string;
  totalAmount?: number; balanceDue?: number; dueDate?: string; origin?: "OWN" | "LINKED" | string; activationMode?: string;
}
export interface SettledElement { type: string; code: string; origin?: string; activationMode?: string }
export interface LinkElementPayload { type: string; code: string; activationMode?: ActivationMode; replaceOwnInvoice?: boolean }
export interface TransactionAllocations {
  transactionNumber?: string; amount?: number; pending?: number;
  current?: Array<{ id: number; documentNumber?: string; amount?: number; mode?: string; allocatedAt?: string; allocatedBy?: string }>;
  reversed?: Array<{ id: number; allocationId?: number; documentNumber?: string; amount?: number; invoiceOutcome?: string; reason?: string; reversedAt?: string; reversedBy?: string; elementsReverted?: string }>;
}
export interface CancelAllocationPayload { invoiceOutcome?: "REOPEN" | "NEUTRALIZE"; reason: string }
export interface CancelAllocationResult {
  allocationId?: number; transactionNumber?: string; documentNumber?: string; amount?: number; invoiceOutcome?: string;
  elementsReverted?: string[]; accountingRequired?: boolean;
}
export interface UnallocatedSuggestion {
  transactionNumber: string; customerType?: string; customerCode?: string; amount?: number; pending?: number; currency?: string;
  paidAt?: string; providerReference?: string; payerName?: string;
  candidates?: Array<{ documentNumber: string; title?: string; balanceDue?: number; dueDate?: string; score?: number; reasons?: string[]; proposedAmount?: number }>;
}
export interface AllocatePaymentPayload {
  allocations?: Array<{ documentNumber: string; amount: number }>;
  elements?: Array<{ type: string; code: string; amount: number; activationMode?: ActivationMode }>;
}
export interface AllocatePaymentResult { transactionNumber?: string; allocated?: number; stillPending?: number; documentNumbers?: string[] }

// ── Réclamations, recouvrement ───────────────────────────────────────────────────

export type ClaimStatus = "OPEN" | "ACCEPTED" | "PARTIALLY_ACCEPTED" | "REJECTED" | "WITHDRAWN";
export interface ClaimReason { code: string; label: string; displayOrder?: number; active?: boolean }
export interface Claim {
  claimNumber: string; documentNumber?: string; customerType?: string; customerCode?: string; reasonCode?: string; reasonLabel?: string;
  description?: string; lineOrders?: number[]; requestedAmount?: number; status?: ClaimStatus | string; channel?: "STAFF" | "PORTAL" | string;
  openedBy?: string; grantedAmount?: number; creditNoteNumber?: string; decisionComment?: string; decidedBy?: string; decidedAt?: string; createdAt?: string;
}
export interface OpenClaimPayload { reasonCode: string; description?: string; lineOrders?: number[]; requestedAmount?: number }
export interface PaymentPromise {
  promiseNumber: string; documentNumber?: string; customerType?: string; customerCode?: string; promisedDate?: string; amount?: number;
  balanceAtPromise?: number; channel?: string; note?: string; status?: "OPEN" | "KEPT" | "BROKEN" | "CANCELLED" | string; createdBy?: string; closedAt?: string; createdAt?: string;
}
export interface PaymentPromisePayload { promisedDate: string; amount?: number; channel?: "PHONE" | "EMAIL" | "WHATSAPP" | "VISIT" | "PORTAL"; note?: string }
export interface PaymentPlanPayload { installments: number; firstDueDate: string; intervalMonths?: number; notes?: string }

// ── Tarifs clients, affaires ─────────────────────────────────────────────────────

export interface CustomerPrice {
  id: number; customerType?: string; customerCode?: string; itemCode?: string; itemName?: string; unitPrice?: number | null; discountRate?: number | null;
  currency?: string; validFrom?: string; validUntil?: string | null; currentlyValid?: boolean; contractReference?: string; reason?: string; createdBy?: string; createdAt?: string;
}
export interface CustomerPricePayload {
  itemCode: string; unitPrice?: number; discountRate?: number; validFrom: string; validUntil?: string; contractReference?: string; reason?: string;
}
export type DealStage = "PROSPECTING" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
export interface Deal {
  code: string; customerType?: string; customerCode?: string; customerName?: string; title?: string; owner?: string; ownerName?: string;
  expectedAmount?: number; currency?: string; probability?: number; stage?: DealStage | string; lostReason?: string; expectedCloseDate?: string;
  closedAt?: string; source?: "CRM" | "AUTO" | "MANUAL" | string; crmOpportunityRef?: string; analyticSection?: string; notes?: string; createdBy?: string; createdAt?: string;
}
export interface DealPayload {
  customerType?: string; customerCode?: string; customerName?: string; title: string; owner?: string; expectedAmount?: number; currency?: string;
  probability?: number; expectedCloseDate?: string; analyticSection?: string; notes?: string;
}
export interface DealDashboard {
  deal: Deal; quoted?: number; accepted?: number; invoiced?: number; creditNotes?: number; invoicedNet?: number; depositsInvoiced?: number; depositsPaid?: number;
  collected?: number; remainingToInvoice?: number; remainingToCollect?: number; plannedMargin?: number; realizedMargin?: number; costedShare?: number;
  documents?: Array<{ documentNumber: string; documentType?: string; status?: string; deposit?: boolean; issueDate?: string; totalAmount?: number; paidAmount?: number; balanceDue?: number; currency?: string; createdAt?: string }>;
}
export interface DealFilter { stage?: DealStage | string; owner?: string; customerCode?: string; search?: string; from?: string; to?: string; page?: number; size?: number }

// ── Bons de livraison ────────────────────────────────────────────────────────────

export type DeliveryNoteStatus = "DRAFT" | "DELIVERED" | "CANCELLED" | "INVOICED";
export interface DeliveryNoteSummary {
  noteNumber: string; sourceDocumentNumber?: string; sourceDocumentType?: string; customerName?: string; status?: DeliveryNoteStatus | string;
  deliveredAt?: string; invoiceNumber?: string; createdAt?: string;
}
export interface DeliveryNote extends DeliveryNoteSummary {
  customerType?: string; customerCode?: string; deliveryAddress?: string; notes?: string; showPrices?: boolean; stockIssued?: boolean; deliveredBy?: string;
  receivedBy?: string; signedCopyReference?: string; cancelledAt?: string; cancelReason?: string; createdBy?: string;
  lines?: Array<{ lineOrder?: number; itemCode?: string; description?: string; unit?: string; quantity?: number; unitPrice?: number }>;
}
export interface DeliveryStatus {
  documentNumber?: string; documentType?: string; complete?: boolean;
  lines?: Array<{ lineOrder?: number; itemCode?: string; description?: string; unit?: string; ordered?: number; delivered?: number; inDraft?: number; remaining?: number }>;
  notes?: DeliveryNoteSummary[];
}
export interface CreateDeliveryNotePayload { lines?: Array<{ lineOrder: number; quantity: number }>; deliveryAddress?: string; notes?: string; showPrices?: boolean }

// ── Contrôle d'intégrité de la certification ─────────────────────────────────────

export interface FiscalIntegrityReport { valid?: boolean; checkedInvoices?: number; brokenChains?: number; missingSignatures?: number; numberingGaps?: number; checkedAt?: string }
export interface FiscalIntegrityLog extends FiscalIntegrityReport { id?: number; triggeredBy?: string; createdAt?: string }

// ── Modèles de devis, articles composés ──────────────────────────────────────────

export interface QuoteTemplateLine { itemCode: string; quantity: number; description?: string }
export interface QuoteTemplate {
  code: string; name: string; description?: string; validityDays?: number; terms?: string; lines: QuoteTemplateLine[]; active?: boolean; createdBy?: string; updatedAt?: string;
}
export interface QuoteTemplatePayload { code: string; name: string; description?: string; validityDays?: number; terms?: string; lines: QuoteTemplateLine[]; active?: boolean }
export interface FromTemplatePayload { customerType: string; customerCode: string; customerName: string; customerEmail?: string; customerPhone?: string; segment?: string; title?: string }
export interface CatalogComponent { componentCode: string; componentSource: "INVENTORY_ITEM" | string; quantity: number }

// ── Cautions ─────────────────────────────────────────────────────────────────────

export interface SecurityDeposit {
  depositNumber: string; documentNumber?: string; subscriptionNumber?: string; customerType?: string; customerCode?: string; customerName?: string;
  amount?: number; releasedAmount?: number; retainedAmount?: number; appliedAmount?: number; remaining?: number; currency?: string; status?: string; createdAt?: string;
  movements?: Array<{ movementNumber?: string; kind?: string; amount?: number; reason?: string; targetDocumentNumber?: string; movementDate?: string; createdBy?: string; createdAt?: string }>;
}
export interface SecurityDepositMovementPayload { kind: "RELEASE" | "RETAIN" | "APPLY"; amount?: number; reason?: string; targetDocumentNumber?: string }
export interface LegacySecurityDeposit { documentNumber?: string; customerCode?: string; customerName?: string; issueDate?: string; description?: string; totalAmount?: number; netAmount?: number; taxAmount?: number; posted?: boolean }

// ── Catalogue : prix, marges, listes de référence, taxes ─────────────────────────

export type CatalogSegment = "ALL" | "MEMBER" | "COMPANY" | "VISITOR";
export interface CatalogPrice { itemCode?: string; segment?: string; unitPrice?: number; validFrom?: string; validUntil?: string | null; reason?: string; createdBy?: string; createdAt?: string; source?: "SEGMENT" | "ALL" | "CATALOG" | "CONTRACT" | string }
export interface CatalogMargin {
  itemCode: string; name?: string; category?: string; subcategory?: string; unitPrice?: number; costPrice?: number; margin?: number; marginRate?: number;
  floorPrice?: number; maxDiscountRate?: number; inventoryItemCode?: string; revenueAccount?: string; active?: boolean;
}
export interface CatalogImportResult { created?: number; updated?: number; errors?: string[] }
export interface ReferenceCategory {
  id?: number; code: string; label: string; parentCode?: string; description?: string; revenueAccount?: string; displayOrder?: number; active?: boolean;
  createdFromItem?: boolean; itemCount?: number; subcategories?: ReferenceCategory[]; updatedAt?: string;
}
export interface ReferenceUnit {
  id?: number; code: string; label: string; pluralLabel?: string; symbol?: string; quantityScale?: number; inventoryUnitCode?: string; displayOrder?: number;
  active?: boolean; createdFromItem?: boolean; itemCount?: number; updatedAt?: string;
}
export interface TaxRule {
  id?: number; code: string; baseCode?: string; name: string; taxType?: string; rate?: number; appliesOn?: string;
  treatment?: "STANDARD" | "REDUCED" | "EXEMPT" | "OUT_OF_SCOPE" | string; labelOnDocument?: string; exemptionReason?: string; countryCode?: string;
  validFrom?: string; validUntil?: string | null; active?: boolean; displayOrder?: number; currentlyValid?: boolean; selectableOnItem?: boolean;
}
export interface CatalogReferences { categories: ReferenceCategory[]; units: ReferenceUnit[]; taxRules: TaxRule[]; strict?: boolean }
export interface CategoryPayload { code?: string; label: string; description?: string; revenueAccount?: string; displayOrder?: number }
export interface UnitPayload { code?: string; label: string; pluralLabel?: string; symbol?: string; quantityScale?: number; inventoryUnitCode?: string; displayOrder?: number }
export interface TaxRulePayload { code: string; name: string; taxType?: string; rate: number; treatment?: string; labelOnDocument?: string; exemptionReason?: string; countryCode?: string; validFrom?: string; displayOrder?: number }
export interface MergeReferencesPayload { list: "CATEGORY" | "SUBCATEGORY" | "UNIT"; parentCode?: string; sourceCode: string; targetCode: string }

// ── Retenues à la source ─────────────────────────────────────────────────────────

export interface WithholdingType { code: string; label: string; rate?: number | null; base?: "TTC" | "HT" | "TVA" | string; account?: string; displayOrder?: number; active?: boolean }
export interface Withholding {
  withholdingNumber: string; documentNumber?: string; typeCode?: string; typeLabel?: string; account?: string; baseAmount?: number; rate?: number; amount?: number;
  currency?: string; customerType?: string; customerCode?: string; certificateReference?: string; certificateDocument?: string; certificateAt?: string;
  certificateMissing?: boolean; status?: string; withheldOn?: string; recordedBy?: string; cancelledAt?: string; cancelReason?: string; createdAt?: string;
}
export interface RecordWithholdingPayload { typeCode: string; amount?: number; withheldOn?: string; certificateReference?: string; certificateDocument?: string }
export interface WithholdingTypePayload { code: string; label: string; rate?: number; base: "TTC" | "HT" | "TVA"; account: string; displayOrder?: number }

// ── Signature publique de devis ──────────────────────────────────────────────────

export interface PublicSignatureConfirmation {
  quoteNumber?: string; issueDate?: string; totalAmount?: number; currency?: string; signatureStatus?: string; signerName?: string; signedAt?: string; revision?: number;
}


// ─── Service ──────────────────────────────────────────────────────────────────

export const billingService = {
  // ── Liste et recherche ──────────────────────────────────────────────────────

  getDocuments: async (params?: {
    type?: string;
    status?: string;
    customerType?: string;
    customerCode?: string;
    sourceType?: string;
    sourceCode?: string;
    fromDate?: string;
    toDate?: string;
    searchText?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{
    content: BillingDocument[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/billing/documents", {
      params,
    });
    return normalizePaginated<BillingDocument>(response.data, params?.size);
  },

  getDocument: async (documentNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/documents/${documentNumber}`,
    );
    return response.data;
  },

  // ── Création ────────────────────────────────────────────────────────────────

  /** Création générique — permet de choisir explicitement documentType */
  createDocument: async (
    data: CreateBillingDocumentPayload,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/documents",
      data,
    );
    return response.data;
  },

  /** Aperçu de calcul sans écriture : aucun document créé, aucun numéro consommé. */
  simulateDocument: async (
    data: CreateBillingDocumentPayload,
  ): Promise<SimulateBillingDocumentResponse> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/documents/simulate",
      data,
    );
    return response.data;
  },

  createManualInvoice: async (
    data: Omit<CreateBillingDocumentPayload, "documentType">,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/invoices/manual",
      data,
    );
    return response.data;
  },

  createManualQuote: async (
    data: Omit<CreateBillingDocumentPayload, "documentType">,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/quotes/manual",
      data,
    );
    return response.data;
  },

  /** Alias de createManualQuote */
  createManualQuotation: async (
    data: Omit<CreateBillingDocumentPayload, "documentType">,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/quotations/manual",
      data,
    );
    return response.data;
  },

  createInvoiceFromBillableItems: async (data: {
    title?: string;
    description?: string;
    issueDate: string;
    dueDate?: string;
    billableNumbers: string[];
  }): Promise<BillingDocument> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/invoices/from-billable-items",
      data,
    );
    return response.data;
  },

  createInvoiceFromReservation: async (
    data: CreateInvoiceFromReservationPayload,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/invoices/from-reservation",
      data,
    );
    return response.data;
  },

  updateDocument: async (
    documentNumber: string,
    data: UpdateBillingDocumentPayload,
  ): Promise<BillingDocument> => {
    const response = await apiClient.put(
      `/sni/api/v1/billing/documents/${documentNumber}`,
      data,
    );
    return response.data;
  },

  duplicateDocument: async (
    documentNumber: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/documents/${documentNumber}/duplicate`,
    );
    return response.data;
  },

  // ── Workflow document général ────────────────────────────────────────────────

  /** Émet le document. Un dépassement de remise bloquant renvoie 400, sauf motif de dérogation. */
  issueDocument: async (
    documentNumber: string,
    discountOverrideReason?: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/documents/${documentNumber}/issue`,
      null,
      discountOverrideReason
        ? { params: { discountOverrideReason } }
        : undefined,
    );
    return response.data;
  },

  // ── Versionnage ──────────────────────────────────────────────────────────────
  // Un document validé (locked) n'est plus versionné.

  getDocumentVersions: async (
    documentNumber: string,
  ): Promise<BillingDocumentVersion[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/documents/${documentNumber}/versions`,
    );
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.content ?? []);
  },

  getDocumentVersion: async (
    documentNumber: string,
    versionNumber: number,
  ): Promise<BillingDocumentVersion> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/documents/${documentNumber}/versions/${versionNumber}`,
    );
    return response.data;
  },

  getDocumentVersionsDiff: async (
    documentNumber: string,
    fromVersion: number,
    toVersion: number,
  ): Promise<BillingDocumentVersionDiff> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/documents/${documentNumber}/versions/${fromVersion}/diff/${toVersion}`,
    );
    return response.data;
  },

  sendDocument: async (documentNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/documents/${documentNumber}/send`,
    );
    return response.data;
  },

  sendEmail: async (documentNumber: string): Promise<void> => {
    await apiClient.post(
      `/sni/api/v1/billing/documents/${documentNumber}/send-email`,
    );
  },

  /** PDF d'administration : l'original suivi de son duplicata « DUPLICATA ». */
  getPdf: async (documentNumber: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/documents/${documentNumber}/pdf`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },

  // ── Workflow devis ───────────────────────────────────────────────────────────

  acceptQuote: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/accept`,
    );
    return response.data;
  },

  rejectQuote: async (
    quoteNumber: string,
    reason?: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/reject`,
      { reason },
    );
    return response.data;
  },

  convertToInvoice: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/quotes/${quoteNumber}/convert-to-invoice`,
    );
    return response.data;
  },

  /** Alias de acceptQuote */
  acceptQuotation: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotations/${quoteNumber}/accept`,
    );
    return response.data;
  },

  /** Alias de rejectQuote */
  rejectQuotation: async (
    quoteNumber: string,
    reason?: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotations/${quoteNumber}/reject`,
      { reason },
    );
    return response.data;
  },

  /** Alias de convertToInvoice */
  convertQuotationToInvoice: async (
    quoteNumber: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/quotations/${quoteNumber}/convert-to-invoice`,
    );
    return response.data;
  },

  /** Sélectionner les lignes optionnelles avant acceptation */
  selectOptions: async (
    quoteNumber: string,
    selectedLineOrders: number[],
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/select-options`,
      {
        selectedLineOrders,
      },
    );
    return response.data;
  },

  /** Marquer le devis comme vu (SENT → VIEWED) */
  markViewed: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/mark-viewed`,
    );
    return response.data;
  },

  /** Passer en négociation */
  startNegotiation: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/start-negotiation`,
    );
    return response.data;
  },

  /** Demander un acompte (ACCEPTED → DEPOSIT_REQUESTED) */
  requestDeposit: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/request-deposit`,
    );
    return response.data;
  },

  /** Marquer l'acompte comme reçu (DEPOSIT_REQUESTED → DEPOSIT_PAID) */
  markDepositPaid: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/mark-deposit-paid`,
    );
    return response.data;
  },

  /** Demander une signature électronique */
  requestSignature: async (
    quoteNumber: string,
    data?: {
      signerName?: string;
      signerEmail?: string;
      customMessage?: string;
    },
  ): Promise<BillingSignature> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/quotes/${quoteNumber}/request-signature`,
      data ?? {},
    );
    return response.data;
  },

  // ── Avoirs ───────────────────────────────────────────────────────────────────

  createCreditNote: async (
    invoiceNumber: string,
    data: {
      /** null/absent = balanceDue de la facture */
      amount?: number | null;
      reason: string;
      createdBy?: string;
      /** Sceller l'avoir immédiatement (défaut false) */
      validateImmediately?: boolean;
      /** Appliquer l'avoir sur la facture source immédiatement (défaut false) */
      applyImmediately?: boolean;
      /** null = ligne auto générée par le backend */
      lines?: BillingLine[] | null;
    },
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/invoices/${invoiceNumber}/credit-note`,
      data,
    );
    return response.data;
  },

  applyCreditNote: async (creditNoteNumber: string): Promise<void> => {
    await apiClient.patch(
      `/sni/api/v1/billing/credit-notes/${creditNoteNumber}/apply`,
    );
  },

  /** Applique un avoir non consommé sur une autre facture du même client. */
  applyCreditNoteTo: async (
    creditNoteNumber: string,
    targetInvoiceNumber: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/credit-notes/${creditNoteNumber}/apply-to/${targetInvoiceNumber}`,
    );
    return response.data;
  },

  /** Reverse le solde d'un avoir au portefeuille du client quand il n'y a plus rien à imputer. */
  refundCreditNoteToWallet: async (
    creditNoteNumber: string,
    reason: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/credit-notes/${creditNoteNumber}/refund-to-wallet`,
      null,
      { params: { reason } },
    );
    return response.data;
  },

  /**
   * Valide fiscalement le document (SEFC) : assigne le fiscalNumber et verrouille
   * le document. IRRÉVERSIBLE. INVOICE, CREDIT_NOTE, DEBIT_NOTE, PROFORMA_INVOICE
   * en statut DRAFT ou ISSUED.
   */
  validateDocument: async (
    documentNumber: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/documents/${documentNumber}/validate`,
    );
    return response.data;
  },

  /** Crée une facture rectificative (DRAFT) corrigeant une facture validée ; à valider ensuite via validateDocument(). */
  createCorrectiveInvoice: async (
    originalInvoiceNumber: string,
    data: Omit<CreateBillingDocumentPayload, "documentType">,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/invoices/${originalInvoiceNumber}/corrective`,
      data,
    );
    return response.data;
  },

  /** Annule un document ; s'il est verrouillé, le backend génère et applique un avoir. */
  cancelDocument: async (
    documentNumber: string,
    reason: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.delete(
      `/sni/api/v1/billing/documents/${documentNumber}`,
      { params: { reason } },
    );
    return response.data;
  },

  // ── Relevé client ────────────────────────────────────────────────────────────

  getCustomerStatement: async (
    customerType: string,
    customerCode: string,
    params?: { page?: number; size?: number; sort?: string },
  ): Promise<{
    customerType: string;
    customerCode: string;
    totalInvoiced: number;
    totalPaid: number;
    totalBalanceDue: number;
    documents: BillingDocument[];
  }> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/customers/${customerType}/${customerCode}/statement`,
      { params },
    );
    return response.data;
  },

  // ── Factures reliées à une organisation (lien seulement) ────────────────────

  /** N'écrit rien : ce qui serait relié, et pourquoi le reste ne le serait pas. */
  previewCompanyLinks: async (
    data: CompanyLinkRequest,
  ): Promise<CompanyLinkResult> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/documents/company-links/preview",
      data,
    );
    return response.data;
  },

  linkInvoicesToCompany: async (
    data: CompanyLinkRequest,
  ): Promise<CompanyLinkResult> => {
    const response = await apiClient.post(
      "/sni/api/v1/billing/documents/company-links",
      data,
    );
    return response.data;
  },

  /** Seul un lien ATTACHED se retire : un lien AT_ISSUE est imprimé. */
  unlinkInvoiceFromCompany: async (documentNumber: string): Promise<void> => {
    await apiClient.delete(
      `/sni/api/v1/billing/documents/${encodeURIComponent(documentNumber)}/company-link`,
    );
  },

  // ── Paiement direct ──────────────────────────────────────────────────────────

  payInvoiceDirect: async (
    documentNumber: string,
    data: {
      paymentMethod: "CASH" | "WALLET";
      amount?: number;
      cashSessionNumber?: string;
      walletNumber?: string;
      processedBy: string;
      idempotencyKey?: string;
      metadataJson?: string;
    },
  ): Promise<{ invoice: BillingDocument; transaction: any }> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/invoices/${documentNumber}/pay`,
      data,
    );
    return response.data;
  },

  // ── Échéancier ───────────────────────────────────────────────────────────────

  createInvoiceSchedule: async (
    documentNumber: string,
    data: {
      installments: Array<{ dueDate: string; amount: number }>;
    },
  ): Promise<any> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/invoices/${documentNumber}/schedule`,
      data,
    );
    return response.data;
  },

  getInvoiceSchedule: async (
    documentNumber: string,
  ): Promise<BillingSchedule | null> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/invoices/${documentNumber}/schedule`,
    );
    return response.data;
  },

  getSchedule: async (scheduleNumber: string): Promise<BillingSchedule> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/schedules/${scheduleNumber}`,
    );
    return response.data;
  },

  payInstallment: async (
    installmentNumber: string,
    data: {
      paymentMethod: "CASH" | "WALLET";
      cashSessionNumber?: string;
      walletNumber?: string;
      processedBy: string;
      idempotencyKey?: string;
    },
  ): Promise<any> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/schedules/installments/${installmentNumber}/pay`,
      data,
    );
    return response.data;
  },

  deleteInvoiceSchedule: async (scheduleNumber: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/billing/schedules/${scheduleNumber}`);
  },

  // ── Catalogue billing ────────────────────────────────────────────────────────

  catalogLookup: async (params?: {
    q?: string;
    source?: string;
    category?: string;
    page?: number;
    size?: number;
  }): Promise<{
    content: BillingCatalogLookupItem[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/billing/catalog/lookup", {
      params,
    });
    const normalized = normalizePaginated<BillingCatalogLookupItem>(
      response.data,
    );
    // Le backend ne renvoie pas totalPages : on le recalcule.
    const size = params?.size ?? 20;
    return {
      ...normalized,
      totalPages:
        response.data?.totalPages ??
        Math.max(1, Math.ceil(normalized.totalElements / size)),
    };
  },

  getCatalogItems: async (params?: {
    category?: string;
    active?: boolean;
    q?: string;
    page?: number;
    size?: number;
  }): Promise<{
    content: ServiceCatalogItem[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await apiClient.get("/sni/api/v1/billing/catalog", {
      params,
    });
    const normalized = normalizePaginated<ServiceCatalogItem>(response.data);
    // Le backend ne renvoie pas totalPages : on le recalcule.
    const size = params?.size ?? 20;
    return {
      ...normalized,
      totalPages:
        response.data?.totalPages ??
        Math.max(1, Math.ceil(normalized.totalElements / size)),
    };
  },

  createCatalogItem: async (
    data: Omit<ServiceCatalogItem, "itemCode">,
  ): Promise<ServiceCatalogItem> => {
    const response = await apiClient.post("/sni/api/v1/billing/catalog", data);
    return response.data;
  },

  /** Seuls les champs présents sont modifiés ; pour en vider un, le lister dans clearFields. */
  updateCatalogItem: async (
    itemCode: string,
    data: Partial<ServiceCatalogItem>,
    clearFields?: ClearableCatalogField[],
  ): Promise<ServiceCatalogItem> => {
    const response = await apiClient.put(
      `/sni/api/v1/billing/catalog/${itemCode}`,
      clearFields && clearFields.length > 0
        ? { ...data, clearFields }
        : data,
    );
    return response.data;
  },

  activateCatalogItem: async (
    itemCode: string,
  ): Promise<ServiceCatalogItem> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/catalog/${itemCode}/activate`,
    );
    return response.data;
  },

  deactivateCatalogItem: async (
    itemCode: string,
  ): Promise<ServiceCatalogItem> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/catalog/${itemCode}/deactivate`,
    );
    return response.data;
  },

  deleteCatalogItem: async (itemCode: string): Promise<void> => {
    await apiClient.delete(`/sni/api/v1/billing/catalog/${itemCode}`);
  },

  // ── Recoverables ─────────────────────────────────────────────────────────────

  addRecoverables: async (
    documentNumber: string,
    data: {
      items: Array<{
        itemDescription: string;
        quantity?: number;
        unit?: string;
        sourceType?: string;
        sourceCode?: string;
        notes?: string;
      }>;
    },
  ): Promise<BillingRecoverable[]> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/documents/${documentNumber}/recoverables`,
      data,
    );
    return response.data;
  },

  getRecoverables: async (
    documentNumber: string,
    params?: { status?: string },
  ): Promise<BillingRecoverable[]> => {
    const response = await apiClient.get(
      `/sni/api/v1/billing/documents/${documentNumber}/recoverables`,
      { params },
    );
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.content ?? []);
  },

  confirmRecoverable: async (
    documentNumber: string,
    recoverableNumber: string,
    data?: {
      notes?: string;
      partialQuantity?: number | null;
    },
  ): Promise<BillingRecoverable> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/documents/${documentNumber}/recoverables/${recoverableNumber}/recover`,
      data ?? {},
    );
    return response.data;
  },

  writeOffRecoverable: async (
    documentNumber: string,
    recoverableNumber: string,
    data?: {
      notes?: string;
    },
  ): Promise<BillingRecoverable> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/documents/${documentNumber}/recoverables/${recoverableNumber}/write-off`,
      data ?? {},
    );
    return response.data;
  },

  // ── Rapport aging ────────────────────────────────────────────────────────────

  getAgingReport: async (params?: {
    customerType?: string;
    customerCode?: string;
    currency?: string;
  }): Promise<BillingAgingReport> => {
    const response = await apiClient.get("/sni/api/v1/billing/aging-report", {
      params,
    });
    return response.data;
  },

  // ── Signature publique ──────────────────────────────────────────────────────

  getPublicQuoteSignaturePage: async (token: string): Promise<string> => {
    const response = await apiClient.get(
      `/sni/api/v1/public/quotes/sign/${token}`,
      {
        responseType: "text",
      },
    );
    return response.data;
  },

  confirmPublicQuoteSignature: async (
    token: string,
    data: ConfirmPublicQuoteSignaturePayload,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/public/quotes/sign/${token}/confirm`,
      data,
    );
    return response.data;
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // Lot 52 — routes ajoutées (exactes, d'après les fiches contrôleur)
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Saisie, simulation, stock ───────────────────────────────────────────────
  simulateExact: async (data: SimulationRequest): Promise<SimulationResult> =>
    (await apiClient.post(`${B}/documents/simulate`, data)).data,
  simulateLine: async (data: SimulateLineRequest): Promise<SimulateLineResult> =>
    (await apiClient.post(`${B}/documents/simulate-line`, data)).data,
  allocateAmount: async (data: AllocateAmountRequest): Promise<AllocateAmountResult> =>
    (await apiClient.post(`${B}/documents/allocate-amount`, data)).data,
  checkAvailability: async (data: CheckAvailabilityRequest): Promise<CheckAvailabilityResult> =>
    (await apiClient.post(`${B}/documents/check-availability`, data)).data,
  /** `reason` = paramètre de requête. `discountOverrideReason` n'existe en requête que sur `issueDocument`. */
  deleteDocument: async (documentNumber: string, reason?: string): Promise<BillingDocument> =>
    (await apiClient.delete(`${B}/documents/${enc(documentNumber)}`, { params: clean({ reason }) })).data,

  // ── Destinataires, envois, relevé ───────────────────────────────────────────
  getBillingRecipients: async (customerType: string, customerCode: string): Promise<BillingRecipients> =>
    (await apiClient.get(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/billing-recipients`)).data,
  saveBillingRecipients: async (customerType: string, customerCode: string, data: BillingRecipientsPayload): Promise<BillingRecipients> =>
    (await apiClient.put(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/billing-recipients`, data)).data,
  updateDocumentRecipient: async (documentNumber: string, data: UpdateRecipientPayload): Promise<BillingDocument> =>
    (await apiClient.patch(`${B}/documents/${enc(documentNumber)}/recipient`, data)).data,
  /** POST /send : envoi multi-canal (e-mail / WhatsApp). Différent de `sendDocument` (PATCH, marque « envoyé »). */
  sendToRecipients: async (documentNumber: string, data: SendDocumentPayload): Promise<BillingSending[]> =>
    toList<BillingSending>((await apiClient.post(`${B}/documents/${enc(documentNumber)}/send`, data)).data),
  getSendings: async (documentNumber: string): Promise<BillingSending[]> =>
    toList<BillingSending>((await apiClient.get(`${B}/documents/${enc(documentNumber)}/sendings`)).data),
  getStatementCsv: async (customerType: string, customerCode: string): Promise<Blob> =>
    getBlob(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/statement.csv`),
  getStatementPdf: async (customerType: string, customerCode: string, params?: { from?: string; to?: string }): Promise<Blob> =>
    getBlob(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/statement.pdf`, clean(params)),
  sendStatement: async (customerType: string, customerCode: string, data: SendStatementPayload): Promise<boolean> =>
    (await apiClient.post(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/statement/send`, data)).data,

  // ── Acomptes ────────────────────────────────────────────────────────────────
  getDocumentDeposits: async (documentNumber: string): Promise<BillingDeposit[]> =>
    toList<BillingDeposit>((await apiClient.get(`${B}/documents/${enc(documentNumber)}/deposits`)).data),
  planQuoteDeposits: async (quoteNumber: string, data: DepositPlanPayload): Promise<BillingDeposit[]> =>
    toList<BillingDeposit>((await apiClient.post(`${B}/quotes/${enc(quoteNumber)}/deposits`, data)).data),
  planInvoiceDeposits: async (invoiceNumber: string, data: DepositPlanPayload): Promise<BillingDeposit[]> =>
    toList<BillingDeposit>((await apiClient.post(`${B}/invoices/${enc(invoiceNumber)}/deposits`, data)).data),
  invoiceDeposit: async (id: number): Promise<BillingDeposit> =>
    (await apiClient.patch(`${B}/deposits/${id}/invoice`)).data,
  /** `reason` = paramètre de requête. Refusé si l'acompte est déjà encaissé. */
  cancelDeposit: async (id: number, reason?: string): Promise<BillingDeposit> =>
    (await apiClient.patch(`${B}/deposits/${id}/cancel`, undefined, { params: clean({ reason }) })).data,
  settleDeposit: async (id: number, data: DepositSettlementPayload): Promise<BillingDeposit> =>
    (await apiClient.patch(`${B}/deposits/${id}/settle`, data)).data,

  // ── Devis : révision, négociation, proforma ─────────────────────────────────
  reviseQuote: async (quoteNumber: string, data: ReviseQuotePayload): Promise<BillingDocument> =>
    (await apiClient.put(`${B}/quotes/${enc(quoteNumber)}`, data)).data,
  getQuoteNegotiation: async (quoteNumber: string): Promise<QuoteNegotiation> =>
    (await apiClient.get(`${B}/quotes/${enc(quoteNumber)}/negotiation`)).data,
  revalidateQuote: async (quoteNumber: string, data: { validUntil: string; reason: string }): Promise<BillingDocument> =>
    (await apiClient.patch(`${B}/quotes/${enc(quoteNumber)}/revalidate`, data)).data,
  createProforma: async (data: CreateBillingDocumentPayload): Promise<BillingDocument> =>
    (await apiClient.post(`${B}/proformas`, data)).data,
  quoteToProforma: async (quoteNumber: string): Promise<BillingDocument> =>
    (await apiClient.post(`${B}/quotes/${enc(quoteNumber)}/proforma`)).data,
  proformaToQuote: async (proformaNumber: string): Promise<BillingDocument> =>
    (await apiClient.post(`${B}/proformas/${enc(proformaNumber)}/to-quote`)).data,

  // ── Modèles de devis, articles composés ─────────────────────────────────────
  listQuoteTemplates: async (includeInactive?: boolean): Promise<QuoteTemplate[]> =>
    toList<QuoteTemplate>((await apiClient.get(`${B}/quote-templates`, { params: clean({ includeInactive }) })).data),
  getQuoteTemplate: async (code: string): Promise<QuoteTemplate> =>
    (await apiClient.get(`${B}/quote-templates/${enc(code)}`)).data,
  saveQuoteTemplate: async (data: QuoteTemplatePayload): Promise<QuoteTemplate> =>
    (await apiClient.put(`${B}/quote-templates`, data)).data,
  createQuoteFromTemplate: async (code: string, data: FromTemplatePayload): Promise<BillingDocument> =>
    (await apiClient.post(`${B}/quotes/from-template/${enc(code)}`, data)).data,
  getCatalogComponents: async (itemCode: string): Promise<CatalogComponent[]> =>
    toList<CatalogComponent>((await apiClient.get(`${B}/catalog/${enc(itemCode)}/components`)).data),
  saveCatalogComponents: async (itemCode: string, components: CatalogComponent[]): Promise<CatalogComponent[]> =>
    toList<CatalogComponent>((await apiClient.put(`${B}/catalog/${enc(itemCode)}/components`, { components })).data),

  // ── Modification de facture, changement de client ───────────────────────────
  listInvoiceChanges: async (invoiceNumber: string): Promise<InvoiceChange[]> =>
    toList<InvoiceChange>((await apiClient.get(`${B}/invoices/${enc(invoiceNumber)}/change-requests`)).data),
  requestInvoiceChange: async (invoiceNumber: string, data: RequestInvoiceChangePayload): Promise<InvoiceChange> =>
    (await apiClient.post(`${B}/invoices/${enc(invoiceNumber)}/change-requests`, data)).data,
  cancelInvoiceChange: async (id: number): Promise<InvoiceChange> =>
    (await apiClient.patch(`${B}/invoices/change-requests/${id}/cancel`)).data,
  changeInvoiceCustomer: async (invoiceNumber: string, data: ChangeCustomerPayload): Promise<ChangeCustomerResult> =>
    (await apiClient.post(`${B}/invoices/${enc(invoiceNumber)}/change-customer`, data)).data,

  // ── Tableau de bord commercial ──────────────────────────────────────────────
  getBillingDashboard: async (params?: { from?: string; to?: string; currency?: string; weeks?: number }): Promise<BillingDashboard> =>
    (await apiClient.get(`${B}/dashboard`, { params: clean(params) })).data,

  // ── Facturation groupée ─────────────────────────────────────────────────────
  listBatchRuns: async (): Promise<BatchRunSummary[]> =>
    toList<BatchRunSummary>((await apiClient.get(`${B}/batch-runs`)).data),
  previewBatchRun: async (data: BatchPreviewPayload): Promise<BatchRun> =>
    (await apiClient.post(`${B}/batch-runs`, data)).data,
  getBatchRun: async (runNumber: string): Promise<BatchRun> =>
    (await apiClient.get(`${B}/batch-runs/${enc(runNumber)}`)).data,
  excludeBatchItem: async (runNumber: string, itemId: number, excluded: boolean): Promise<BatchRun> =>
    (await apiClient.patch(`${B}/batch-runs/${enc(runNumber)}/exclude`, { itemId, excluded })).data,
  issueBatchRun: async (runNumber: string): Promise<BatchRun> =>
    (await apiClient.post(`${B}/batch-runs/${enc(runNumber)}/issue`)).data,
  cancelBatchRun: async (runNumber: string): Promise<BatchRun> =>
    (await apiClient.post(`${B}/batch-runs/${enc(runNumber)}/cancel`)).data,

  // ── Éléments, rattachement de paiements, affectations ───────────────────────
  searchBillingParties: async (query: string, limit?: number): Promise<BillingParty[]> =>
    toList<BillingParty>((await apiClient.get(`${B}/elements/search`, { params: clean({ query, limit }) })).data),
  listBillingElements: async (partyType: string, partyCode: string): Promise<BillingElement[]> =>
    toList<BillingElement>((await apiClient.get(`${B}/elements`, { params: { partyType, partyCode } })).data),
  getBillingElement: async (type: string, code: string): Promise<BillingElement> =>
    (await apiClient.get(`${B}/elements/${enc(type)}/${enc(code)}`)).data,
  getElementInvoices: async (type: string, code: string, openOnly?: boolean): Promise<BillingElementInvoice[]> =>
    toList<BillingElementInvoice>((await apiClient.get(`${B}/elements/${enc(type)}/${enc(code)}/invoices`, { params: clean({ openOnly }) })).data),
  getDocumentElements: async (documentNumber: string): Promise<SettledElement[]> =>
    toList<SettledElement>((await apiClient.get(`${B}/documents/${enc(documentNumber)}/elements`)).data),
  linkDocumentElement: async (documentNumber: string, data: LinkElementPayload): Promise<SettledElement[]> =>
    toList<SettledElement>((await apiClient.post(`${B}/documents/${enc(documentNumber)}/elements`, data)).data),
  unlinkDocumentElement: async (documentNumber: string, type: string, code: string): Promise<void> => {
    await apiClient.delete(`${B}/documents/${enc(documentNumber)}/elements/${enc(type)}/${enc(code)}`);
  },
  getTransactionAllocations: async (transactionNumber: string): Promise<TransactionAllocations> =>
    (await apiClient.get(`${B}/transactions/${enc(transactionNumber)}/allocations`)).data,
  cancelAllocation: async (allocationId: number, data: CancelAllocationPayload): Promise<CancelAllocationResult> =>
    (await apiClient.post(`${B}/allocations/${allocationId}/cancel`, data)).data,
  getUnallocatedSuggestions: async (params?: { customerType?: string; customerCode?: string; limit?: number }): Promise<UnallocatedSuggestion[]> =>
    toList<UnallocatedSuggestion>((await apiClient.get(`${B}/unallocated-payments/suggestions`, { params: clean(params) })).data),
  allocateUnallocatedPayment: async (transactionNumber: string, data: AllocatePaymentPayload): Promise<AllocatePaymentResult> =>
    (await apiClient.post(`${B}/unallocated-payments/${enc(transactionNumber)}/allocate`, data)).data,

  // ── Réclamations ────────────────────────────────────────────────────────────
  listClaimReasons: async (includeInactive?: boolean): Promise<ClaimReason[]> =>
    toList<ClaimReason>((await apiClient.get(`${B}/claim-reasons`, { params: clean({ includeInactive }) })).data),
  /** `active` = paramètre de requête (activer / désactiver le motif). */
  saveClaimReason: async (data: { code: string; label: string; displayOrder?: number }, active?: boolean): Promise<ClaimReason> =>
    (await apiClient.put(`${B}/claim-reasons`, data, { params: clean({ active }) })).data,
  listClaims: async (params?: { documentNumber?: string; customerType?: string; customerCode?: string; openOnly?: boolean }): Promise<Claim[]> =>
    toList<Claim>((await apiClient.get(`${B}/claims`, { params: clean(params) })).data),
  getClaim: async (claimNumber: string): Promise<Claim> =>
    (await apiClient.get(`${B}/claims/${enc(claimNumber)}`)).data,
  openClaim: async (documentNumber: string, data: OpenClaimPayload): Promise<Claim> =>
    (await apiClient.post(`${B}/documents/${enc(documentNumber)}/claims`, data)).data,
  acceptClaim: async (claimNumber: string, data: { grantedAmount?: number; comment?: string }): Promise<Claim> =>
    (await apiClient.patch(`${B}/claims/${enc(claimNumber)}/accept`, data)).data,
  rejectClaim: async (claimNumber: string, comment: string): Promise<Claim> =>
    (await apiClient.patch(`${B}/claims/${enc(claimNumber)}/reject`, { comment })).data,
  withdrawClaim: async (claimNumber: string): Promise<Claim> =>
    (await apiClient.patch(`${B}/claims/${enc(claimNumber)}/withdraw`)).data,

  // ── Recouvrement : promesses, plan de paiement ──────────────────────────────
  listPaymentPromises: async (params?: { documentNumber?: string; openOnly?: boolean }): Promise<PaymentPromise[]> =>
    toList<PaymentPromise>((await apiClient.get(`${B}/payment-promises`, { params: clean(params) })).data),
  createPaymentPromise: async (documentNumber: string, data: PaymentPromisePayload): Promise<PaymentPromise> =>
    (await apiClient.post(`${B}/documents/${enc(documentNumber)}/payment-promises`, data)).data,
  cancelPaymentPromise: async (promiseNumber: string): Promise<PaymentPromise> =>
    (await apiClient.patch(`${B}/payment-promises/${enc(promiseNumber)}/cancel`)).data,
  createPaymentPlan: async (documentNumber: string, data: PaymentPlanPayload): Promise<BillingSchedule> =>
    (await apiClient.post(`${B}/documents/${enc(documentNumber)}/payment-plan`, data)).data,

  // ── Tarifs négociés par client ──────────────────────────────────────────────
  listCustomerPrices: async (customerType: string, customerCode: string, current?: boolean): Promise<CustomerPrice[]> =>
    toList<CustomerPrice>((await apiClient.get(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/prices`, { params: clean({ current }) })).data),
  createCustomerPrice: async (customerType: string, customerCode: string, data: CustomerPricePayload): Promise<CustomerPrice> =>
    (await apiClient.post(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/prices`, data)).data,
  endCustomerPrice: async (customerType: string, customerCode: string, id: number, validUntil: string): Promise<CustomerPrice> =>
    (await apiClient.patch(`${B}/customers/${enc(customerType)}/${enc(customerCode)}/prices/${id}/end`, { validUntil })).data,

  // ── Affaires ────────────────────────────────────────────────────────────────
  listDeals: async (params?: DealFilter) => {
    const r = await apiClient.get(`${B}/deals`, { params: clean(params as Record<string, unknown>) });
    return normalizePaginated<Deal>(r.data, params?.size);
  },
  exportDeals: async (params?: DealFilter): Promise<Blob> => getBlob(`${B}/deals/export`, clean(params as Record<string, unknown>)),
  getDeal: async (code: string): Promise<DealDashboard> => (await apiClient.get(`${B}/deals/${enc(code)}`)).data,
  createDeal: async (data: DealPayload): Promise<Deal> => (await apiClient.post(`${B}/deals`, data)).data,
  updateDeal: async (code: string, data: DealPayload): Promise<Deal> => (await apiClient.put(`${B}/deals/${enc(code)}`, data)).data,
  createDealFromOpportunity: async (opportunityNumber: string): Promise<Deal> =>
    (await apiClient.post(`${B}/deals/from-opportunity/${enc(opportunityNumber)}`)).data,
  setDealStage: async (code: string, stage: DealStage, lostReason?: string): Promise<Deal> =>
    (await apiClient.patch(`${B}/deals/${enc(code)}/stage`, { stage, lostReason })).data,
  attachDealDocument: async (code: string, documentNumber: string): Promise<Deal> =>
    (await apiClient.patch(`${B}/deals/${enc(code)}/documents/${enc(documentNumber)}`)).data,
  detachDealDocument: async (code: string, documentNumber: string): Promise<void> => {
    await apiClient.delete(`${B}/deals/${enc(code)}/documents/${enc(documentNumber)}`);
  },

  // ── Bons de livraison ───────────────────────────────────────────────────────
  listDeliveryNotes: async (params?: { customerType?: string; customerCode?: string; status?: string }): Promise<DeliveryNoteSummary[]> =>
    toList<DeliveryNoteSummary>((await apiClient.get(`${B}/delivery-notes`, { params: clean(params) })).data),
  getDeliveryNote: async (noteNumber: string): Promise<DeliveryNote> =>
    (await apiClient.get(`${B}/delivery-notes/${enc(noteNumber)}`)).data,
  getDeliveryStatus: async (documentNumber: string): Promise<DeliveryStatus> =>
    (await apiClient.get(`${B}/documents/${enc(documentNumber)}/delivery-status`)).data,
  createDeliveryNote: async (documentNumber: string, data: CreateDeliveryNotePayload): Promise<DeliveryNote> =>
    (await apiClient.post(`${B}/documents/${enc(documentNumber)}/delivery-notes`, data)).data,
  deliverDeliveryNote: async (noteNumber: string, receivedBy?: string): Promise<DeliveryNote> =>
    (await apiClient.patch(`${B}/delivery-notes/${enc(noteNumber)}/deliver`, { receivedBy })).data,
  cancelDeliveryNote: async (noteNumber: string, reason?: string): Promise<DeliveryNote> =>
    (await apiClient.patch(`${B}/delivery-notes/${enc(noteNumber)}/cancel`, { reason })).data,
  attachSignedCopy: async (noteNumber: string, reference?: string): Promise<DeliveryNote> =>
    (await apiClient.patch(`${B}/delivery-notes/${enc(noteNumber)}/signed-copy`, { reference })).data,
  getDeliveryNotePdf: async (noteNumber: string): Promise<Blob> => getBlob(`${B}/delivery-notes/${enc(noteNumber)}/pdf`),
  invoiceDeliveryNotes: async (noteNumbers: string[]): Promise<BillingDocument> =>
    (await apiClient.post(`${B}/delivery-notes/invoice`, { noteNumbers })).data,

  // ── Cautions ────────────────────────────────────────────────────────────────
  setCatalogSecurityDeposit: async (itemCode: string, securityDeposit: boolean): Promise<Record<string, unknown>> =>
    (await apiClient.put(`${B}/catalog/${enc(itemCode)}/security-deposit`, { securityDeposit })).data,
  listSecurityDeposits: async (params?: { customerType?: string; customerCode?: string; open?: boolean }): Promise<SecurityDeposit[]> =>
    toList<SecurityDeposit>((await apiClient.get(`${B}/security-deposits`, { params: clean(params) })).data),
  listLegacySecurityDeposits: async (): Promise<LegacySecurityDeposit[]> =>
    toList<LegacySecurityDeposit>((await apiClient.get(`${B}/security-deposits/legacy`)).data),
  getSecurityDeposit: async (depositNumber: string): Promise<SecurityDeposit> =>
    (await apiClient.get(`${B}/security-deposits/${enc(depositNumber)}`)).data,
  addSecurityDepositMovement: async (depositNumber: string, data: SecurityDepositMovementPayload): Promise<SecurityDeposit> =>
    (await apiClient.post(`${B}/security-deposits/${enc(depositNumber)}/movements`, data)).data,

  // ── Catalogue : prix, marges, import/export, liens ──────────────────────────
  getCatalogPrice: async (itemCode: string, params?: { segment?: string; date?: string; customerType?: string; customerCode?: string }): Promise<CatalogPrice> =>
    (await apiClient.get(`${B}/catalog/${enc(itemCode)}/price`, { params: clean(params) })).data,
  listCatalogPrices: async (itemCode: string): Promise<CatalogPrice[]> =>
    toList<CatalogPrice>((await apiClient.get(`${B}/catalog/${enc(itemCode)}/prices`)).data),
  addCatalogPrice: async (itemCode: string, data: { segment?: CatalogSegment; unitPrice: number; validFrom?: string; reason?: string }): Promise<CatalogPrice> =>
    (await apiClient.post(`${B}/catalog/${enc(itemCode)}/prices`, data)).data,
  getCatalogMargins: async (params?: { search?: string; category?: string }): Promise<CatalogMargin[]> =>
    toList<CatalogMargin>((await apiClient.get(`${B}/catalog/margins`, { params: clean(params) })).data),
  setCatalogLinks: async (itemCode: string, data: { inventoryItemCode?: string; revenueAccount?: string }): Promise<CatalogMargin> =>
    (await apiClient.put(`${B}/catalog/${enc(itemCode)}/links`, data)).data,
  exportCatalog: async (): Promise<Blob> => getBlob(`${B}/catalog/export`),
  /** Corps = CSV brut (texte), pas du JSON. */
  importCatalog: async (csv: string): Promise<CatalogImportResult> =>
    (await apiClient.post(`${B}/catalog/import`, csv, { headers: { "Content-Type": "text/csv" } })).data,

  // ── Listes de référence : catégories, sous-catégories, unités ───────────────
  getCatalogReferences: async (includeInactive?: boolean): Promise<CatalogReferences> =>
    (await apiClient.get(`${B}/catalog/references`, { params: clean({ includeInactive }) })).data,
  mergeReferences: async (data: MergeReferencesPayload): Promise<Record<string, number>> =>
    (await apiClient.post(`${B}/catalog/references/merge`, data)).data,
  listCategories: async (includeInactive?: boolean): Promise<ReferenceCategory[]> =>
    toList<ReferenceCategory>((await apiClient.get(`${B}/catalog/categories`, { params: clean({ includeInactive }) })).data),
  createCategory: async (data: CategoryPayload): Promise<ReferenceCategory> =>
    (await apiClient.post(`${B}/catalog/categories`, data)).data,
  updateCategory: async (code: string, data: Omit<CategoryPayload, "code">): Promise<ReferenceCategory> =>
    (await apiClient.put(`${B}/catalog/categories/${enc(code)}`, data)).data,
  deleteCategory: async (code: string): Promise<void> => { await apiClient.delete(`${B}/catalog/categories/${enc(code)}`); },
  setCategoryActive: async (code: string, active: boolean): Promise<ReferenceCategory> =>
    (await apiClient.patch(`${B}/catalog/categories/${enc(code)}/${active ? "activate" : "deactivate"}`)).data,
  listSubcategories: async (code: string, includeInactive?: boolean): Promise<ReferenceCategory[]> =>
    toList<ReferenceCategory>((await apiClient.get(`${B}/catalog/categories/${enc(code)}/subcategories`, { params: clean({ includeInactive }) })).data),
  createSubcategory: async (code: string, data: CategoryPayload): Promise<ReferenceCategory> =>
    (await apiClient.post(`${B}/catalog/categories/${enc(code)}/subcategories`, data)).data,
  updateSubcategory: async (code: string, subCode: string, data: Omit<CategoryPayload, "code">): Promise<ReferenceCategory> =>
    (await apiClient.put(`${B}/catalog/categories/${enc(code)}/subcategories/${enc(subCode)}`, data)).data,
  deleteSubcategory: async (code: string, subCode: string): Promise<void> => {
    await apiClient.delete(`${B}/catalog/categories/${enc(code)}/subcategories/${enc(subCode)}`);
  },
  setSubcategoryActive: async (code: string, subCode: string, active: boolean): Promise<ReferenceCategory> =>
    (await apiClient.patch(`${B}/catalog/categories/${enc(code)}/subcategories/${enc(subCode)}/${active ? "activate" : "deactivate"}`)).data,
  listUnits: async (includeInactive?: boolean): Promise<ReferenceUnit[]> =>
    toList<ReferenceUnit>((await apiClient.get(`${B}/catalog/units`, { params: clean({ includeInactive }) })).data),
  createUnit: async (data: UnitPayload): Promise<ReferenceUnit> => (await apiClient.post(`${B}/catalog/units`, data)).data,
  updateUnit: async (code: string, data: Omit<UnitPayload, "code">): Promise<ReferenceUnit> =>
    (await apiClient.put(`${B}/catalog/units/${enc(code)}`, data)).data,
  deleteUnit: async (code: string): Promise<void> => { await apiClient.delete(`${B}/catalog/units/${enc(code)}`); },
  setUnitActive: async (code: string, active: boolean): Promise<ReferenceUnit> =>
    (await apiClient.patch(`${B}/catalog/units/${enc(code)}/${active ? "activate" : "deactivate"}`)).data,

  // ── Règles de taxe (autorité BILLING:TAX_RULES en plus du droit de la route) ─
  listTaxRules: async (includeInactive?: boolean): Promise<TaxRule[]> =>
    toList<TaxRule>((await apiClient.get(`${B}/tax-rules`, { params: clean({ includeInactive }) })).data),
  createTaxRule: async (data: TaxRulePayload): Promise<TaxRule> => (await apiClient.post(`${B}/tax-rules`, data)).data,
  updateTaxRule: async (code: string, data: { name?: string; labelOnDocument?: string; exemptionReason?: string; displayOrder?: number }): Promise<TaxRule> =>
    (await apiClient.put(`${B}/tax-rules/${enc(code)}`, data)).data,
  setTaxRuleActive: async (code: string, active: boolean): Promise<TaxRule> =>
    (await apiClient.patch(`${B}/tax-rules/${enc(code)}/${active ? "activate" : "deactivate"}`)).data,
  getTaxRuleVersions: async (baseCode: string): Promise<TaxRule[]> =>
    toList<TaxRule>((await apiClient.get(`${B}/tax-rules/${enc(baseCode)}/versions`)).data),
  createTaxRuleSuccessor: async (baseCode: string, data: { rate: number; validFrom: string; name?: string; labelOnDocument?: string }): Promise<TaxRule> =>
    (await apiClient.post(`${B}/tax-rules/${enc(baseCode)}/successor`, data)).data,

  // ── Retenues à la source ────────────────────────────────────────────────────
  listWithholdingTypes: async (includeInactive?: boolean): Promise<WithholdingType[]> =>
    toList<WithholdingType>((await apiClient.get(`${B}/withholding-types`, { params: clean({ includeInactive }) })).data),
  createWithholdingType: async (data: WithholdingTypePayload): Promise<WithholdingType> =>
    (await apiClient.post(`${B}/withholding-types`, data)).data,
  updateWithholdingType: async (code: string, data: Partial<Omit<WithholdingTypePayload, "code">>): Promise<WithholdingType> =>
    (await apiClient.put(`${B}/withholding-types/${enc(code)}`, data)).data,
  setWithholdingTypeActive: async (code: string, active: boolean): Promise<WithholdingType> =>
    (await apiClient.patch(`${B}/withholding-types/${enc(code)}/${active ? "activate" : "deactivate"}`)).data,
  listWithholdings: async (params?: { customerType?: string; customerCode?: string; certificate?: string }): Promise<Withholding[]> =>
    toList<Withholding>((await apiClient.get(`${B}/withholdings`, { params: clean(params) })).data),
  getDocumentWithholdings: async (documentNumber: string): Promise<Withholding[]> =>
    toList<Withholding>((await apiClient.get(`${B}/documents/${enc(documentNumber)}/withholdings`)).data),
  recordWithholding: async (documentNumber: string, data: RecordWithholdingPayload): Promise<Withholding> =>
    (await apiClient.post(`${B}/documents/${enc(documentNumber)}/withholdings`, data)).data,
  cancelWithholding: async (number: string, reason: string): Promise<Withholding> =>
    (await apiClient.patch(`${B}/withholdings/${enc(number)}/cancel`, { reason })).data,
  attachWithholdingCertificate: async (number: string, data: { certificateDocument: string; certificateReference?: string }): Promise<Withholding> =>
    (await apiClient.patch(`${B}/withholdings/${enc(number)}/certificate`, data)).data,

  // ── Contrôle d'intégrité de la certification (SYSTEM:SETTINGS) ──────────────
  runFiscalIntegrityCheck: async (): Promise<FiscalIntegrityReport> =>
    (await apiClient.get(`${API}/admin/fiscal-integrity/check`)).data,
  getFiscalIntegrityLastReport: async (): Promise<FiscalIntegrityLog> =>
    (await apiClient.get(`${API}/admin/fiscal-integrity/last-report`)).data,

  // ── Signature publique (chemin réel : /public/quotes/sign, SANS préfixe /sni/api/v1) ──
  getPublicSignaturePage: async (token: string): Promise<string> =>
    (await apiClient.get(`/public/quotes/sign/${enc(token)}`, { responseType: "text" })).data,
  confirmPublicSignature: async (
    token: string,
    data: { signerName: string; signatureImageBase64: string; signerEmail?: string; ipAddress?: string; userAgent?: string },
  ): Promise<PublicSignatureConfirmation> =>
    (await apiClient.post(`/public/quotes/sign/${enc(token)}/confirm`, data)).data,
};
