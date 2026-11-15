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
};