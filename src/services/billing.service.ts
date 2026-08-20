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
  // Sprint 3 — nouveaux statuts devis
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

// ─── Sous-interfaces sprint 1-2-3 ─────────────────────────────────────────────

/** Sprint 1 — Acompte attaché à la création d'un document */
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
  status?: "PENDING" | "PAID" | "CANCELLED";
  paidAt?: string | null;
}

/** Sprint 2 — Escompte pour paiement anticipé */
export interface BillingEarlyPaymentDiscount {
  discountRate: number;
  ifPaidBefore: string;
  label?: string;
  // Champ retourné en lecture
  computedAmount?: number;
}

/** Sprint 3 — Signature électronique */
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
  // Sprint 1 — ordre de ligne (requis pour advance.excludedLineOrders)
  lineOrder?: number;
  lineType: BillingLineType;
  itemCode?: string;
  description: string;
  detailedDescription?: string;
  quantity: number;
  // Sprint 1 — unité de mesure (ex: jour, heure, m², forfait)
  unit?: string;
  unitPrice: number;
  discountRate?: number;
  // Sprint 1 — champs enrichis
  externalReference?: string;
  notes?: string;
  // Sprint 2 — ligne optionnelle : calculée mais exclue du total
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

  // Sprint 2 — champs formulaire enrichis
  customerReference?: string;
  poNumber?: string;
  projectCode?: string;
  salespersonCode?: string;
  deliveryAddressJson?: string;
  language?: string;
  exchangeRate?: number | null;
  terms?: string;

  // Sprint 1 — référence et coordonnées de paiement
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
  // Sprint 2 — total des lignes optionnelles
  optionsTotal?: number;

  // Dates
  issueDate: string;
  dueDate?: string;
  issuedAt?: string;
  sentAt?: string;
  paidAt?: string;
  // NOTE: BillingDocumentResponse (backend) n'expose ni cancelledAt, ni
  // createdAt, ni updatedAt — ne pas s'y fier, ils ne sont jamais renvoyés.

  lines: BillingLine[];
  discounts: BillingDiscount[];
  taxes: BillingTax[];
  clauses: BillingClause[];

  sourceType?: string;
  sourceCode?: string;
  // Champs enrichis source résolue
  resolvedSourceType?: string;
  resolvedSourceCode?: string;
  resolvedSourceLabel?: string;
  resolvedSourceRegistered?: boolean;

  metadataJson?: string;

  // Sprint 1 — acompte
  advance?: BillingAdvance | null;
  // Sprint 2 — escompte
  earlyPaymentDiscount?: BillingEarlyPaymentDiscount | null;
  // Sprint 3 — signature
  signature?: BillingSignature | null;

  customerRegistered?: boolean;
  internalNotes?: string;
  recoverables?: BillingRecoverable[] | null;

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
  // Trace catalogue — le backend resout description/unit/unitPrice/taxable/
  // vatRate a partir de ces 2 champs, aussi bien en creation qu'en edition
  // (billing-enhancements.md §3.2 : "creation ou edition")
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
  // Sprint 2 — champs enrichis
  customerReference?: string;
  poNumber?: string;
  projectCode?: string;
  salespersonCode?: string;
  deliveryAddressJson?: string;
  language?: string;
  exchangeRate?: number | null;
  // Sprint 1 — paiement
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
  // Sprint 1 — acompte
  advance?: Omit<BillingAdvance, "computedAmount" | "status" | "paidAt">;
  // Sprint 2 — escompte
  earlyPaymentDiscount?: Omit<BillingEarlyPaymentDiscount, "computedAmount">;
  metadataJson?: string;
}

// ─── Helper normalisation réponses paginées ───────────────────────────────────

function normalizePaginated<T>(data: any): {
  content: T[];
  totalElements: number;
  totalPages: number;
} {
  if (data?.content !== undefined) return data;
  if (Array.isArray(data?.data))
    return {
      content: data.data,
      totalElements: data.totalElements ?? data.data.length,
      totalPages: data.totalPages ?? 1,
    };
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
    return normalizePaginated<BillingDocument>(response.data);
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

  /** Alias documenté côté backend */
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

  issueDocument: async (documentNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/documents/${documentNumber}/issue`,
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

  /** Alias documenté côté backend */
  acceptQuotation: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotations/${quoteNumber}/accept`,
    );
    return response.data;
  },

  /** Alias documenté côté backend */
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

  /** Alias documenté côté backend */
  convertQuotationToInvoice: async (
    quoteNumber: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.post(
      `/sni/api/v1/billing/quotations/${quoteNumber}/convert-to-invoice`,
    );
    return response.data;
  },

  /** Sprint 2 — Sélectionner les lignes optionnelles avant acceptation */
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

  /** Sprint 3 — Marquer le devis comme vu (SENT → VIEWED) */
  markViewed: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/mark-viewed`,
    );
    return response.data;
  },

  /** Sprint 3 — Passer en négociation */
  startNegotiation: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/start-negotiation`,
    );
    return response.data;
  },

  /** Sprint 3 — Demander un acompte (ACCEPTED → DEPOSIT_REQUESTED) */
  requestDeposit: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/request-deposit`,
    );
    return response.data;
  },

  /** Sprint 3 — Marquer l'acompte comme reçu (DEPOSIT_REQUESTED → DEPOSIT_PAID) */
  markDepositPaid: async (quoteNumber: string): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/quotes/${quoteNumber}/mark-deposit-paid`,
    );
    return response.data;
  },

  /** Sprint 3 — Demander une signature électronique */
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

  /**
   * Ré-applique un avoir non entièrement consommé sur une AUTRE facture du
   * même client. Prérequis backend : avoir VALIDATED (locked=true), pas
   * encore ISSUED (= déjà appliqué), même client que la facture cible.
   */
  applyCreditNoteTo: async (
    creditNoteNumber: string,
    targetInvoiceNumber: string,
  ): Promise<BillingDocument> => {
    const response = await apiClient.patch(
      `/sni/api/v1/billing/credit-notes/${creditNoteNumber}/apply-to/${targetInvoiceNumber}`,
    );
    return response.data;
  },

  /**
   * Valide fiscalement le document (SEFC) — assigne le fiscalNumber
   * définitif, verrouille le document (locked=true). IRRÉVERSIBLE.
   * Uniquement pour INVOICE, CREDIT_NOTE, DEBIT_NOTE, PROFORMA_INVOICE
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

  /**
   * Crée une facture rectificative (documentType: CORRECTIVE_INVOICE,
   * statut DRAFT) qui corrige une facture déjà validée SANS la modifier.
   * Doit ensuite être validée manuellement via validateDocument().
   */
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

  /**
   * Annule un document. Comportement géré côté backend selon `locked` :
   * non verrouillé → annulation directe (status → CANCELLED) ;
   * verrouillé → génère un avoir pour le balanceDue, le valide et
   * l'applique automatiquement (la facture reste VALIDATED, passe à PAID).
   * Inutile de vérifier `locked` côté frontend avant d'appeler.
   */
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
    // Le backend renvoie {content, totalElements, page, size} SANS
    // totalPages (confirmé billing-enhancements.md §3.1) — normalizePaginated
    // renvoie alors la donnée brute telle quelle, laissant totalPages
    // undefined et cassant silencieusement la pagination du panneau de
    // recherche catalogue. On le recalcule nous-mêmes ici.
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
    // Meme precaution que catalogLookup : la doc ne montre pas le JSON de
    // reponse exact pour cet endpoint. Si totalPages est absent, on le
    // recalcule plutot que de laisser la pagination se bloquer a "1/1".
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

  updateCatalogItem: async (
    itemCode: string,
    data: Partial<ServiceCatalogItem>,
  ): Promise<ServiceCatalogItem> => {
    const response = await apiClient.put(
      `/sni/api/v1/billing/catalog/${itemCode}`,
      data,
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